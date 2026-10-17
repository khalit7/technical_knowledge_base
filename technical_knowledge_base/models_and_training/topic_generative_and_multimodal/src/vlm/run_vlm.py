"""Every model run of the VLM lab, in one process (SmolVLM-500M-Instruct, bfloat16, MPS, greedy decoding).

Run ONLY under the shared bench lock:
    sh lock.sh acquire bench vl 3600 && { GM_LOCK=<lock.sh> GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I run_vlm.py; sh lock.sh release bench vl; }
Phases (each writes its own out/*.json as soon as it ends, so a failure keeps what finished):
  trace     one image through encoder, pixel shuffle, projector and merge: shapes, parameters, PCA colours of
            the real vectors, nearest vocabulary tokens of the projected image tokens      -> out/trace.json
  timing    vision encoder + connector, prefill and per-token decode at 1, 5 and 17 tiles -> out/timing.json
  qa        the 30 questions of qa_set.json at three image-token budgets                -> out/qa_raw.json
  pope      72 yes/no object questions (present / absent) at two budgets                -> out/pope_raw.json
  captions  "Describe this image in detail." for the 16 images                          -> out/captions_raw.json
"""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vl_env import *
import numpy as np
import torch

cap_threads(4)
PHASES = sys.argv[1:] or ["trace", "timing", "qa", "pope", "captions"]
dev = device(os.environ.get("VL_DEV", "mps"))
if str(dev) == "cpu":  # dry run of the code path only (CPU); results go to dry_*.json and are not used
    _dump = dump; dump = lambda n, o: _dump("dry_" + n, o)
    BUDGETS_DRY = True
imgs = {k: im for k, im, _ in pretrained.test_images()}
QS = json.load(open(os.path.join(HERE, "qa_set.json")))
BUDGETS = {"1 tile (64)": {"do_image_splitting": False}, "2x2+1 (320)": {"size": {"longest_edge": 1024}},
           "4x4+1 (1088, default)": {}}
META = {"model": pretrained.VLM[0], "revision": pretrained.VLM[1], "dtype": "bfloat16", "device": "mps",
        "machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "decoding": "greedy (do_sample=False)"}
T0 = time.time()


def log(*a):
    print(f"[{time.time() - T0:6.0f}s]", *a, flush=True)


t = time.time(); model, proc = pretrained.load_vlm(dev, torch.bfloat16); sync(dev)
META["load_seconds"] = round(time.time() - t, 1)
IMG_ID = model.config.image_token_id
log("loaded", META["load_seconds"], "s")


def inputs(key, q, **kw):
    return proc(text=chat(proc, q), images=[imgs[key]], return_tensors="pt", **kw).to(dev)


def answer(key, q, max_new=24, **kw):
    inp = inputs(key, q, **kw)
    sync(dev); t = time.time()
    with torch.no_grad():
        out = model.generate(**inp, do_sample=False, max_new_tokens=max_new)
    sync(dev); dt = time.time() - t
    new = out[0, inp["input_ids"].shape[1]:]
    return {"answer": proc.decode(new, skip_special_tokens=True).strip(), "seconds": round(dt, 3),
            "new_tokens": int(len(new)), "prompt_tokens": int(inp["input_ids"].shape[1]),
            "image_tokens": int((inp["input_ids"] == IMG_ID).sum())}


def pca_rgb(x, k=3):
    """First three principal components of rows of x, each scaled to 0..255 (uint8), plus explained variance."""
    x = x.astype(np.float64); x = x - x.mean(0)
    u, s, vt = np.linalg.svd(x, full_matrices=False)
    p = x @ vt[:k].T
    lo, hi = np.percentile(p, 2, axis=0), np.percentile(p, 98, axis=0)
    q = np.clip((p - lo) / (hi - lo + 1e-9), 0, 1)
    return (q * 255).round().astype(int).tolist(), (s[:k] ** 2 / (s ** 2).sum()).round(4).tolist()


# ------------------------------------------------------------------ trace
if "trace" in PHASES:
    with PeakMem() as pm:
        R = dict(META)
        comp = {"vision encoder (SigLIP)": model.model.vision_model, "connector (pixel shuffle + linear)": model.model.connector,
                "language model (SmolLM2)": model.model.text_model, "lm_head": model.lm_head}
        R["params"] = {k: sum(p.numel() for p in m.parameters()) for k, m in comp.items()}
        R["params_total"] = sum(p.numel() for p in model.parameters())
        R["proj_weight_shape"] = list(model.model.connector.modality_projection.proj.weight.shape)
        inp = inputs("p01_cat", "Describe this image in one sentence.")
        pv = inp["pixel_values"]
        R["pixel_values_shape"] = list(pv.shape)
        with torch.no_grad():
            flat = pv.view(-1, *pv.shape[2:]).to(model.dtype)
            vis = model.model.vision_model(pixel_values=flat).last_hidden_state          # [17, 1024, 768]
            shuf = model.model.connector.pixel_shuffle(vis, model.config.scale_factor)  # [17, 64, 12288]
            proj = model.model.connector.modality_projection(shuf)                     # [17, 64, 960]
            emb = model.model.get_input_embeddings()(inp["input_ids"])                 # [1, 1142, 960]
            merged = model.model.inputs_merger(inp["input_ids"], emb, proj.reshape(-1, proj.shape[-1]))
        R["shapes"] = {"pixel_values": list(pv.shape), "vision_out": list(vis.shape), "pixel_shuffle_out": list(shuf.shape),
                       "projected": list(proj.shape), "text_embeds": list(emb.shape), "merged": list(merged.shape)}
        # check: merged rows at image positions equal the projected vectors in order
        m = (inp["input_ids"][0] == IMG_ID)
        R["merge_exact"] = bool(torch.equal(merged[0][m], proj.reshape(-1, proj.shape[-1]).to(merged.dtype)))
        # check: the connector's pixel shuffle is a space-to-depth on the 32x32 grid (4x4 neighbours -> one vector)
        g = vis[16].float().view(32, 32, 768)
        blk = g[0:4, 4:8].reshape(-1)  # rows 0..3, cols 4..7: should land in output token 1 (row 0, col 1) in some order
        R["shuffle_token1_same_set"] = bool(torch.allclose(blk.sort().values, shuf[16, 1].float().sort().values))
        # norms: image tokens against text-token embeddings
        tn = emb[0][~m].float().norm(dim=-1); im_n = proj.float().norm(dim=-1)
        allw = model.model.get_input_embeddings().weight.float()
        R["norms"] = {"projected_image_tokens_median": round(float(im_n.median()), 3),
                      "projected_image_tokens_p10_p90": [round(float(x), 3) for x in im_n.flatten().quantile(torch.tensor([.1, .9], device=im_n.device))],
                      "text_tokens_in_prompt_median": round(float(tn.median()), 3),
                      "vocab_embedding_median": round(float(allw.norm(dim=-1).median()), 3),
                      "vision_out_median": round(float(vis.float().norm(dim=-1).median()), 3)}
        # nearest vocabulary embedding (cosine) of each of the 64 projected tokens of the global view
        wn = torch.nn.functional.normalize(allw, dim=-1)
        pg = torch.nn.functional.normalize(proj[16].float(), dim=-1)
        cs = pg @ wn.T
        top = cs.topk(3, dim=-1)
        R["nearest_vocab_global"] = [{"tokens": proc.tokenizer.convert_ids_to_tokens(top.indices[i].tolist()),
                                      "cos": [round(float(c), 3) for c in top.values[i]]} for i in range(64)]
        R["nearest_cos_median"] = round(float(top.values[:, 0].median()), 3)
        # PCA colours (real vectors) for the animation: vision tokens of the global view (32x32) and of all tiles,
        # projected tokens of the global view (8x8)
        R["pca_vision_global"], R["pca_vision_global_var"] = pca_rgb(vis[16].float().cpu().numpy())
        R["pca_vision_tile"], _ = pca_rgb(vis[5].float().cpu().numpy())   # tile row 2, col 2
        R["pca_proj_global"], R["pca_proj_global_var"] = pca_rgb(proj[16].float().cpu().numpy())
        allp = proj[:16].float().reshape(-1, proj.shape[-1]).cpu().numpy()  # 16 tiles x 64
        R["pca_proj_tiles"], _ = pca_rgb(allp)
        del vis, shuf, proj, emb, merged
    R["peak_mps_mb"], R["max_rss_mb"] = pm.peak_mb, pm.rss_mb
    dump("trace.json", R); torch.mps.empty_cache(); touch_bench("vl")

# ------------------------------------------------------------------ timing
if "timing" in PHASES:
    R = dict(META); R["runs"] = []
    q = "Describe this image in one sentence."
    for name, kw in BUDGETS.items():
        with PeakMem() as pm:
            inp = inputs("p01_cat", q, **kw)
            pv = inp["pixel_values"]
            ve, pf, dec = [], [], []
            for rep in range(4):
                with torch.no_grad():
                    sync(dev); t = time.time()
                    model.model.get_image_features(pixel_values=pv, pixel_attention_mask=inp.get("pixel_attention_mask"))
                    sync(dev); ve.append(time.time() - t)
                    t = time.time()
                    model(**inp, use_cache=True, logits_to_keep=1)
                    sync(dev); pf.append(time.time() - t)
                    t = time.time()
                    out = model.generate(**inp, do_sample=False, max_new_tokens=33, min_new_tokens=33)
                    sync(dev); g = time.time() - t
                dec.append((g - pf[-1]) / 32)
            r = {"budget": name, "tiles": int(pv.shape[1]), "image_tokens": int((inp["input_ids"] == IMG_ID).sum()),
                 "prompt_tokens": int(inp["input_ids"].shape[1]),
                 "vision_seconds": round(statistics.median(ve[1:]), 4), "prefill_seconds": round(statistics.median(pf[1:]), 4),
                 "decode_seconds_per_token": round(statistics.median(dec[1:]), 4), "first_rep": [round(ve[0], 3), round(pf[0], 3)]}
        r["peak_mps_mb"] = pm.peak_mb
        R["runs"].append(r); log("timing", r)
        torch.mps.empty_cache()
    dump("timing.json", R); touch_bench("vl")

# ------------------------------------------------------------------ qa
if "qa" in PHASES:
    R = dict(META); R["max_new_tokens"] = 24; R["answers"] = []
    for bi, (name, kw) in enumerate(BUDGETS.items()):
        for it in QS["qa"]:
            r = answer(it["image"], it["q"], 24, **kw); r.update(id=it["id"], budget=name)
            R["answers"].append(r)
        log("qa", name, "done"); touch_bench("vl")
    dump("qa_raw.json", R); torch.mps.empty_cache()

# ------------------------------------------------------------------ pope
if "pope" in PHASES:
    R = dict(META); R["max_new_tokens"] = 4; R["template"] = QS["pope_template"]; R["answers"] = []
    for name in ("1 tile (64)", "4x4+1 (1088, default)"):
        kw = BUDGETS[name]
        for p in QS["pope"]:
            for kind in ("present", "absent_random", "absent_adversarial"):
                for obj in p[kind]:
                    r = answer(p["image"], QS["pope_template"].format(obj=obj), 4, **kw)
                    r.update(image=p["image"], obj=obj, kind=kind, budget=name); R["answers"].append(r)
        log("pope", name, "done"); touch_bench("vl")
    dump("pope_raw.json", R); torch.mps.empty_cache()

# ------------------------------------------------------------------ captions
if "captions" in PHASES:
    R = dict(META); R["max_new_tokens"] = 120; R["prompt"] = "Describe this image in detail."; R["answers"] = []
    for k in (list(imgs)[:1] if str(dev) == "cpu" else imgs):
        r = answer(k, R["prompt"], 120); r["image"] = k; R["answers"].append(r)
        log("caption", k, r["seconds"], r["answer"][:80])
    dump("captions_raw.json", R); torch.mps.empty_cache()
log("all done")
