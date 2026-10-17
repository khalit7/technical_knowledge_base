"""This page's model runs, one model per process (bfloat16 on MPS, greedy decoding):

    run_vlm2.py smol [phases]   SmolVLM-500M-Instruct (the root's VLM lab model)
    run_vlm2.py qwen [phases]   Qwen3.5-0.8B (this page's second VLM)

Run ONLY under the shared bench lock (see ../README.md). Each phase writes out/<model>_<phase>.json when it ends.
Phases (both models unless marked):
  pope     P(yes) from the next-token distribution for the root's 72 yes/no object questions, in four conditions:
           the real image, a mid-grey image, no image at all, and a leading phrasing on the real image
  ocr      21 synthetic pages (a 6-character code at 7 font sizes) at three image-token budgets
  ground   24 "where is the <shape>" questions on 12 synthetic scenes; raw answers kept, boxes parsed later
  kv       bytes held by the cache after prefill at three budgets (every tensor in the cache object)
  reduce   (smol) the 30-question set with image tokens removed before the language model: random,
           attention-ranked (FastV's criterion at layer 2), 2x2 average pooling, tiles only
  qa       (qwen) the root's 30-question set at three budgets
  timing   (qwen) vision encoder, prefill, decode per token at three budgets (p01_cat)
  video    (qwen) 8 synthetic clips: which way does the dot move?
  saw      (qwen) what the processor and the model's position code make of 4 images: resized size, grid,
           3-D (t, h, w) position ids of every image token, vision-tower norms per patch
"""
import re, statistics, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vm_env import *  # noqa
import numpy as np
import torch
from PIL import Image

cap_threads(4)
WHO = sys.argv[1]; assert WHO in ("smol", "qwen")
ALL = {"smol": ["kv", "pope", "ocr", "ground", "reduce"], "qwen": ["errors", "saw", "kv", "timing", "pope", "qa", "ocr", "ground", "video"]}
PH = sys.argv[2:] or ALL[WHO]
dev = device(os.environ.get("VM_DEV", "mps"))
SYN = json.load(open(os.path.join(INP, "synthetic.json")))
QS = json.load(open(os.path.join(ROOT_SRC, "vlm", "qa_set.json")))
TEST = {k: im for k, im, _ in pretrained.test_images()}
from transformers import AutoModelForImageTextToText

if WHO == "smol":
    REPO = pretrained.VLM; proc = smol_processor()
    BUD = {"64": {"do_image_splitting": False}, "320": {"size": {"longest_edge": 1024}}, "1088": {}}
    DEFAULT = "1088"
else:
    REPO = QWEN; proc = qwen_processor()
    px = lambda n: {"size": {"shortest_edge": n * 1024, "longest_edge": n * 1024}}   # n tokens of 32 x 32 pixels
    BUD = {"64": px(64), "256": px(256), "1024": px(1024)}
    DEFAULT = "native"   # the processor's own limits (65,536 to 16,777,216 pixels)
    BUD["native"] = {}
META = {"model": REPO[0], "revision": REPO[1], "dtype": "bfloat16", "device": str(dev), "machine": MACHINE,
        "date": time.strftime("%Y-%m-%d"), "decoding": "greedy (do_sample=False)", "transformers": __import__("transformers").__version__}
t0 = time.time()
model = AutoModelForImageTextToText.from_pretrained(REPO[0], revision=REPO[1], dtype=torch.bfloat16).to(dev).eval()
sync(dev); META["load_seconds"] = round(time.time() - t0, 1); log("loaded", META["load_seconds"])
TOK = proc.tokenizer
IMG_ID = model.config.image_token_id


def build(question, images=(), kw=None, video=None, vkw=None):
    if video is not None:
        text = chat(proc, question, 1, video=True)
        return proc(text=[text], videos=[video], return_tensors="pt", **(vkw or {})).to(dev)
    text = chat(proc, question, len(images))
    if images:
        return proc(text=[text], images=list(images), return_tensors="pt", **(kw or {})).to(dev)
    return proc(text=[text], return_tensors="pt").to(dev)


def gen(inp, max_new=24):
    sync(dev); t = time.time()
    with torch.no_grad():
        out = model.generate(**inp, do_sample=False, max_new_tokens=max_new)
    sync(dev); dt = time.time() - t
    new = out[0, inp["input_ids"].shape[1]:]
    return {"answer": TOK.decode(new, skip_special_tokens=True).strip(), "seconds": round(dt, 3), "new_tokens": int(len(new)),
            "prompt_tokens": int(inp["input_ids"].shape[1]), "image_tokens": int((inp["input_ids"] == IMG_ID).sum())}


def single_ids(words):
    s = set()
    for w in words:
        ids = TOK.encode(w, add_special_tokens=False)
        if len(ids) == 1: s.add(ids[0])
    return sorted(s)


YES = single_ids(["Yes", "yes", " Yes", " yes", "YES"]); NO = single_ids(["No", "no", " No", " no", "NO"])
META["yes_ids"], META["no_ids"] = YES, NO


def p_yes(inp):
    with torch.no_grad():
        lg = model(**inp, logits_to_keep=1).logits[0, -1].float()
    p = torch.softmax(lg, -1); py = float(p[YES].sum()); pn = float(p[NO].sum())
    return {"p_yes": round(py, 5), "p_no": round(pn, 5), "yes_share": round(py / (py + pn + 1e-12), 5),
            "top": TOK.decode([int(lg.argmax())])}


def cache_bytes(pkv):
    """Bytes of every distinct tensor reachable from the cache object, grouped by attribute name."""
    seen, groups = set(), {}

    def walk(o, name, depth=0):
        if depth > 6: return
        if isinstance(o, torch.Tensor):
            if id(o) in seen: return
            seen.add(id(o)); groups.setdefault(name, [0, 0, None]); g = groups[name]
            g[0] += o.numel() * o.element_size(); g[1] += 1; g[2] = [list(o.shape), str(o.dtype)]
        elif isinstance(o, (list, tuple)):
            for x in o: walk(x, name, depth + 1)
        elif isinstance(o, dict):
            for k, x in o.items(): walk(x, str(k), depth + 1)
        elif hasattr(o, "__dict__") and not isinstance(o, (str, int, float)):
            for k, x in vars(o).items(): walk(x, k, depth + 1)
    walk(pkv, "cache")
    return {k: {"bytes": v[0], "tensors": v[1], "example": v[2]} for k, v in groups.items()}


def norm_code(s):
    return re.sub(r"[^A-Z0-9]", "", s.upper())


def lev(a, b):
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (ca != cb))
    return d[len(b)]


def syn(sub, key):
    return Image.open(big("inputs", sub, key + ".png")).convert("RGB")


def done(name, R):
    dump(f"{WHO}_{name}.json", R); empty_cache(); touch_bench("vm")


QUICK = os.environ.get("VM_QUICK") == "1"     # smoke test: first item of every loop only (results not used)
cut = (lambda xs: list(xs)[:1]) if QUICK else (lambda xs: list(xs))
if QUICK:
    _dump = dump; dump = lambda n, o, indent=None: _dump("quick_" + n, o, indent)  # noqa: F811

# ------------------------------------------------------------------ kv: what the cache holds after prefill
if "kv" in PH:
    R = dict(META); R["runs"] = []
    for b in cut(BUD):
        inp = build("Describe this image in one sentence.", [TEST["p01_cat"]], BUD[b])
        with torch.no_grad():
            out = model(**inp, use_cache=True, logits_to_keep=1)
        g = cache_bytes(out.past_key_values)
        R["runs"].append({"budget": b, "prompt_tokens": int(inp["input_ids"].shape[1]),
                          "image_tokens": int((inp["input_ids"] == IMG_ID).sum()), "groups": g,
                          "total_bytes": sum(v["bytes"] for v in g.values()), "cache_class": type(out.past_key_values).__name__})
        log("kv", b, R["runs"][-1]["prompt_tokens"], R["runs"][-1]["total_bytes"]); del out
    done("kv", R)

# ------------------------------------------------------------------ pope: P(yes) in four conditions
if "pope" in PH:
    grey = Image.open(big("inputs", "blank_grey.png")).convert("RGB")
    TPL = {"neutral": QS["pope_template"], "leading": "There is {obj} in the image, isn't there? Answer yes or no."}
    R = dict(META); R["budget"] = DEFAULT; R["templates"] = TPL; R["rows"] = []
    for p in cut(QS["pope"]):
        for kind in ("present", "absent_random", "absent_adversarial"):
            for obj in p[kind]:
                row = {"image": p["image"], "obj": obj, "kind": kind}
                for cond, imgs, tpl in (("img", [TEST[p["image"]]], "neutral"), ("grey", [grey], "neutral"),
                                        ("none", [], "neutral"), ("leading", [TEST[p["image"]]], "leading")):
                    row[cond] = p_yes(build(TPL[tpl].format(obj=obj), imgs, BUD[DEFAULT]))
                R["rows"].append(row)
        log("pope", p["image"])
    done("pope", R)

# ------------------------------------------------------------------ ocr: legibility against font size and budget
if "ocr" in PH:
    Q = "What is the 6-character code written in the image? Answer with the code only."
    R = dict(META); R["question"] = Q; R["rows"] = []
    buds = ["64", "320", "1088"] if WHO == "smol" else ["64", "256", "1024"]
    for it in cut(SYN["ocr"]):
        img = syn("ocr", it["key"])
        for b in buds:
            r = gen(build(Q, [img], BUD[b]), 12)
            got = norm_code(r["answer"]); r.update(key=it["key"], font_px=it["font_px"], code=it["code"], budget=b,
                                                  read=got, exact=got == it["code"], cer=round(lev(got, it["code"]) / 6, 3))
            R["rows"].append(r)
        log("ocr", it["key"], [x["read"] for x in R["rows"][-len(buds):]])
    done("ocr", R)

# ------------------------------------------------------------------ ground: where is the shape?
if "ground" in PH:
    Q = 'Locate the {obj} in the image. Report its bounding box as JSON: {{"bbox_2d": [x1, y1, x2, y2]}}.'
    R = dict(META); R["question"] = Q; R["budget"] = DEFAULT; R["rows"] = []
    for sc in cut(SYN["ground"]):
        img = syn("ground", sc["key"])
        for o in sc["objects"]:
            inp = build(Q.format(obj=o["obj"]), [img], BUD[DEFAULT]); r = gen(inp, 48)
            if WHO == "qwen":
                thw = inp["image_grid_thw"][0].tolist(); r["resized"] = [thw[2] * 16, thw[1] * 16]   # [w, h] fed to the encoder
            r.update(key=sc["key"], obj=o["obj"], truth=o["box"], w=sc["w"], h=sc["h"]); R["rows"].append(r)
        log("ground", sc["key"], [x["answer"][:60] for x in R["rows"][-2:]])
    done("ground", R)


def right(it, a):   # the root's src/vlm/score.py rule, copied (importing it would run it)
    a = a.strip()
    return any(re.search(p, a, re.I) for p in it["accept"]) and not any(re.search(p, a, re.I) for p in it.get("reject", []))


# ------------------------------------------------------------------ reduce (smol): fewer image tokens, no retraining
if "reduce" in PH and WHO == "smol":
    inner = model.model; L2 = {}
    hook = inner.text_model.layers[1].self_attn.register_forward_hook(lambda m, a, o: L2.__setitem__("w", o[1]))

    def parts(inp):
        ids = inp["input_ids"]; pv = inp["pixel_values"]
        with torch.no_grad():
            emb = inner.get_input_embeddings()(ids)
            vis = inner.vision_model(pixel_values=pv.view(-1, *pv.shape[2:]).to(model.dtype)).last_hidden_state
            proj = inner.connector(vis)                                       # [17, 64, 960]
            merged = inner.inputs_merger(ids, emb, proj.reshape(-1, proj.shape[-1]))
        return ids[0], merged[0], proj

    def attn_rank(merged, img_pos):
        """FastV's criterion: attention each token receives at layer 2 (index 1), averaged over heads and all queries."""
        def setimpl(x):
            try:
                model.set_attn_implementation(x)
            except Exception:
                inner.text_model.config._attn_implementation = x
        setimpl("eager")
        try:
            with torch.no_grad():
                inner.text_model(inputs_embeds=merged[None], use_cache=False)
            w = L2.pop("w", None)
            if w is None: raise RuntimeError("no attention weights captured at layer 2 (eager attention not active)")
            w = w[0].float().mean(0).mean(0)                                  # [L]: mean over heads, then over all queries
        finally:
            setimpl("sdpa")
        return w[img_pos]

    def run_embeds(E):
        sync(dev); t = time.time()
        with torch.no_grad():
            out = model.generate(inputs_embeds=E[None], attention_mask=torch.ones(1, E.shape[0], dtype=torch.long, device=dev),
                                 do_sample=False, max_new_tokens=24)
        sync(dev); dt = time.time() - t
        return TOK.decode(out[0], skip_special_tokens=True).strip(), round(dt, 3)

    def prefill_s(E, reps=3):
        ts = []
        for _ in range(reps):
            sync(dev); t = time.time()
            with torch.no_grad():
                model(inputs_embeds=E[None], logits_to_keep=1)
            sync(dev); ts.append(time.time() - t)
        return round(statistics.median(ts[1:]), 4)

    SETS = ["full", "tiles only", "random 50%", "random 25%", "random 12.5%", "attention 50%", "attention 25%",
            "attention 12.5%", "pool 2x2"]
    R = dict(META); R["settings"] = SETS; R["rows"] = []; R["prefill"] = {}
    items = {i["id"]: i for i in QS["qa"]}
    for it in cut(QS["qa"]):
        inp = build(it["q"], [TEST[it["image"]]], BUD["1088"])
        ids, merged, proj = parts(inp)
        img_pos = torch.nonzero(ids == IMG_ID).flatten(); n_img = len(img_pos)
        att = attn_rank(merged, img_pos)
        g = torch.Generator().manual_seed(0); perm = torch.randperm(n_img, generator=g).to(dev)
        for s in SETS:
            keep = torch.ones(len(ids), dtype=torch.bool, device=dev); E = merged
            if s == "tiles only":
                keep[img_pos[-64:]] = False
            elif s.startswith("random") or s.startswith("attention"):
                frac = float(s.split()[1].rstrip("%")) / 100; k = round(n_img * frac)
                chosen = perm[:k] if s.startswith("random") else att.topk(k).indices
                keep[img_pos] = False; keep[img_pos[chosen.sort().values]] = True
            elif s == "pool 2x2":
                E = merged.clone(); keep[img_pos] = False
                pooled = proj.view(-1, 8, 8, proj.shape[-1]).unflatten(1, (4, 2)).unflatten(3, (4, 2)).float().mean((2, 4))  # [17,4,4,960]
                pooled = pooled.reshape(-1, proj.shape[-1]).to(E.dtype)
                for v in range(proj.shape[0]):
                    pos = img_pos[v * 64: v * 64 + 16]; keep[pos] = True; E[pos] = pooled[v * 16:(v + 1) * 16]
            E2 = E[keep]
            ans, dt = run_embeds(E2)
            R["rows"].append({"id": it["id"], "setting": s, "answer": ans, "seconds": dt, "tokens": int(keep.sum()),
                              "image_tokens": int(keep[img_pos].sum()), "right": right(items[it["id"]], ans)})
            if it["image"] == "p01_cat" and s not in R["prefill"]:
                R["prefill"][s] = {"tokens": int(keep.sum()), "seconds": prefill_s(E2)}
        if it["image"] == "p01_cat":
            # where the attention-ranked 25% sit, per view (for the page's picture)
            k = round(n_img * 0.25); top = att.topk(k).indices.sort().values.tolist()
            R["attn_keep_cat"] = {"question": it["q"], "kept": top, "att": [round(float(x) * 1e4, 3) for x in att]}
        log("reduce", it["id"], [r["right"] for r in R["rows"][-len(SETS):]]); touch_bench("vm")
    hook.remove()
    acc = {s: sum(r["right"] for r in R["rows"] if r["setting"] == s) for s in SETS}
    R["right"] = acc; log("reduce right", acc)
    done("reduce", R)


def win_rc(i, gw):
    """Qwen's image processor orders patches by 2 x 2 merge window: patch i -> (row, col) on the patch grid."""
    w, k = divmod(i, 4); wy, wx = divmod(w, gw // 2)
    return wy * 2 + k // 2, wx * 2 + k % 2


# ------------------------------------------------------------------ saw (qwen): positions, the resized image, norms
if "saw" in PH and WHO == "qwen":
    import base64, io
    vt = model.model.visual; CAP = {}
    hk = vt.blocks[-1].register_forward_hook(lambda m, a, o: CAP.__setitem__("h", (o[0] if isinstance(o, tuple) else o)))
    MEAN = torch.tensor([0.5] * 3).view(3, 1, 1); STD = MEAN

    def picture(pv, thw):
        """Rebuild the image the encoder sees from the flattened patches (checks the window order)."""
        t, gh, gw = thw; p = pv.float().cpu().view(gh * gw, 3, 2, 16, 16)[:, :, 0]
        img = torch.zeros(3, gh * 16, gw * 16)
        for i in range(gh * gw):
            r, c = win_rc(i, gw); img[:, r * 16:(r + 1) * 16, c * 16:(c + 1) * 16] = p[i]
        a = ((img * STD + MEAN).clamp(0, 1).permute(1, 2, 0).numpy() * 255).astype(np.uint8)
        im = Image.fromarray(a); im.thumbnail((200, 200), Image.LANCZOS); b = io.BytesIO(); im.save(b, "WEBP", quality=72)
        return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()

    def norms(inp, thw):
        with torch.no_grad():
            model.model.get_image_features(pixel_values=inp["pixel_values"], image_grid_thw=inp["image_grid_thw"])
        n = CAP.pop("h").float().norm(dim=-1).cpu().numpy(); t, gh, gw = thw
        ratio = n / np.median(n); grid = np.zeros((gh, gw))
        for i in range(gh * gw):
            r, c = win_rc(i, gw); grid[r, c] = ratio[i]
        return grid

    SEE = [("p01_cat", None), ("chelsea_native", "see"), ("rocket_native", "see"), ("receipt_tall", "see")]
    R = dict(META); R["images"] = []; R["test16"] = []
    for key, sub in cut(SEE):
        img = TEST[key] if sub is None else syn(sub, key); rec = {"key": key, "w": img.width, "h": img.height, "settings": []}
        for b in ("64", "256", "1024", "native"):
            inp = build("Describe this image in one sentence.", [img], BUD[b]); thw = inp["image_grid_thw"][0].tolist()
            ids = inp["input_ids"]
            pos, _ = model.model.get_rope_index(ids, inp["mm_token_type_ids"], image_grid_thw=inp["image_grid_thw"],
                                                attention_mask=inp["attention_mask"])
            pos = pos[:, 0].cpu().numpy(); m = (ids[0] == IMG_ID).cpu().numpy()
            g = norms(inp, thw); tok_max = g.reshape(thw[1] // 2, 2, thw[2] // 2, 2).max(axis=(1, 3))
            s = {"budget": b, "grid_thw": thw, "resized": [thw[2] * 16, thw[1] * 16], "image_tokens": int(m.sum()),
                 "prompt_tokens": int(ids.shape[1]), "last_position": int(pos[:, -1].max()),
                 "first_image_index": int(np.argmax(m)), "image_pos_thw": pos[:, m].T.tolist(),
                 "pos_text_after": pos[:, int(np.where(m)[0][-1]) + 1].tolist(), "positions_all_text": [pos[:, i].tolist() for i in range(ids.shape[1]) if not m[i]],
                 "prompt_compressed": re.sub(r"(<\|image_pad\|>)+", lambda mm: "<|image_pad|>x%d" % (len(mm.group(0)) // 13), TOK.decode(ids[0])),
                 "picture": picture(inp["pixel_values"], thw), "token_patch_ratio": [round(float(x), 1) for x in tok_max.reshape(-1)],
                 "max_patch_ratio": round(float(g.max()), 2)}
            rec["settings"].append(s); log("saw", key, b, thw, s["image_tokens"], s["last_position"], s["max_patch_ratio"])
        R["images"].append(rec)
    pos5 = {}
    for key, img in cut(TEST.items()):
        inp = build("Describe this image in one sentence.", [img], BUD["native"]); thw = inp["image_grid_thw"][0].tolist()
        g = norms(inp, thw); hi = np.argwhere(g > 5)
        for r, c in hi: pos5[f"{r},{c}"] = pos5.get(f"{r},{c}", 0) + 1
        R["test16"].append({"key": key, "grid": thw, "max_ratio": round(float(g.max()), 2), "n_hi": int(len(hi))})
    R["positions_over_5x"] = dict(sorted(pos5.items(), key=lambda kv: -kv[1])); hk.remove()
    log("qwen norms test16", [r["max_ratio"] for r in R["test16"]], list(R["positions_over_5x"].items())[:6])
    done("saw", R)

# ------------------------------------------------------------------ timing (qwen)
if "timing" in PH and WHO == "qwen":
    R = dict(META); R["runs"] = []; q = "Describe this image in one sentence."
    for b in cut(["64", "256", "1024"]):
        with PeakMem() as pm:
            inp = build(q, [TEST["p01_cat"]], BUD[b]); ve, pf, dec = [], [], []
            for rep in range(4):
                with torch.no_grad():
                    sync(dev); t = time.time()
                    model.model.get_image_features(pixel_values=inp["pixel_values"], image_grid_thw=inp["image_grid_thw"])
                    sync(dev); ve.append(time.time() - t); t = time.time()
                    model(**inp, use_cache=True, logits_to_keep=1); sync(dev); pf.append(time.time() - t); t = time.time()
                    model.generate(**inp, do_sample=False, max_new_tokens=33, min_new_tokens=33); sync(dev); g = time.time() - t
                dec.append((g - pf[-1]) / 32)
            r = {"budget": b, "image_tokens": int((inp["input_ids"] == IMG_ID).sum()), "prompt_tokens": int(inp["input_ids"].shape[1]),
                 "vision_seconds": round(statistics.median(ve[1:]), 4), "prefill_seconds": round(statistics.median(pf[1:]), 4),
                 "decode_seconds_per_token": round(statistics.median(dec[1:]), 4), "first_rep": [round(ve[0], 3), round(pf[0], 3)]}
        r["peak_mps_mb"] = pm.peak_mb; R["runs"].append(r); log("timing", r); empty_cache()
    done("timing", R)

# ------------------------------------------------------------------ qa (qwen): the root's 30 questions
if "qa" in PH and WHO == "qwen":
    R = dict(META); R["max_new_tokens"] = 24; R["answers"] = []; items = {i["id"]: i for i in QS["qa"]}
    for b in ("64", "256", "1024"):
        for it in cut(QS["qa"]):
            r = gen(build(it["q"], [TEST[it["image"]]], BUD[b]), 24); r.update(id=it["id"], budget=b, right=right(it, r["answer"]))
            R["answers"].append(r)
        log("qa", b, sum(r["right"] for r in R["answers"] if r["budget"] == b)); touch_bench("vm")
    done("qa", R)

# ------------------------------------------------------------------ video (qwen): which way does the dot move?
if "video" in PH and WHO == "qwen":
    from transformers.video_utils import VideoMetadata
    R = dict(META); R["rows"] = []; R["fps_sampled"] = 2
    Q = "Which way does the {c} dot move in this video: left to right, right to left, top to bottom, or bottom to top? Answer with the direction only."
    QI = "Which way is the {c} dot moving in this image: left to right, right to left, top to bottom, or bottom to top? Answer with the direction only."
    for v in cut(SYN["video"]):
        fr = np.load(big("inputs", "video", v["key"] + ".npy"))
        inp = build(Q.format(c=v["colour"]), video=fr, vkw=dict(video_metadata=[VideoMetadata(total_num_frames=16, fps=4.0, duration=4.0)],
                                                               fps=2, cap_pixels_per_frame=True))
        r = gen(inp, 12); r.update(key=v["key"], truth=v["direction"], mode="video", grid_thw=inp["video_grid_thw"][0].tolist(),
                                   video_tokens=int((inp["input_ids"] == model.config.video_token_id).sum()))
        if not R.get("prompt_example"):
            s = TOK.decode(inp["input_ids"][0]); R["prompt_example"] = re.sub(r"(<\|video_pad\|>)+", lambda m: "<|video_pad|>x%d" % (len(m.group(0)) // 13), s)
        R["rows"].append(r)
        r2 = gen(build(QI.format(c=v["colour"]), [Image.fromarray(fr[0])], BUD[DEFAULT]), 12); r2.update(key=v["key"], truth=v["direction"], mode="first frame only")
        R["rows"].append(r2); log("video", v["key"], r["answer"], "|", r2["answer"])
    done("video", R)
# ------------------------------------------------------------------ errors (qwen): a hand-written prompt without the image placeholder
if "errors" in PH and WHO == "qwen":
    R = dict(META); R["cases"] = []
    t = "<|im_start|>user\nWhat is in this image?<|im_end|>\n<|im_start|>assistant\n"
    inp = proc(text=[t], images=[TEST["p01_cat"]], return_tensors="pt").to(dev)
    case = {"prompt": t, "image_tokens_in_prompt": int((inp["input_ids"] == IMG_ID).sum()), "pixel_rows": int(inp["pixel_values"].shape[0])}
    try:
        r = gen(inp, 24); case["outcome"] = "generated"; case["answer"] = r["answer"]
    except Exception as e:
        case["outcome"] = type(e).__name__; case["message"] = str(e)[:400]
    R["cases"].append(case); log("errors", case)
    done("errors", R)
log("all done")
