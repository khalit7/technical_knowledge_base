"""Build the Inside-a-real-model page data from the recorded runs.

Reads $LA_SCRATCH/in/{smol,qwen}/ (extract_pretrained.py), $LA_SCRATCH/in/pythia/phase.json (pythia_phase.py),
$LA_SCRATCH/runs/in_snap/ (train_snapshots.py) and tiny_lens.json (tiny_analysis.py).
Writes src/inside/out/*.json (small, committed: the page rebuilds from them) and parts/34_js_in_0data.js (window.IND).
Run: LA_SCRATCH=... $LA_SCRATCH/venv/bin/python src/inside/make_page_data.py   (CPU, seconds)
"""
import base64, json, os
import numpy as np
from tokenizers import Tokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
SCR = os.environ.get("LA_SCRATCH")
PART = os.path.join(HERE, "..", "parts", "34_js_in_0data.js")
MAP_LAYERS = {"smol": [0, 2, 11, 12, 16, 18, 29]}
MAP_TH = 0.06          # attention weights below this are not stored (the page says how much mass that drops)
HF = os.path.expanduser("~/.cache/huggingface/hub")


def r(v, n=3):
    return [round(float(x), n) for x in v]


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()


def tok_for(key):
    from transformers import AutoTokenizer
    repo, rev = {"smol": ("HuggingFaceTB/SmolLM2-135M", "93efa2f097d58c2a74874c7e644dbc9b0cee75a2"),
                 "qwen": ("Qwen/Qwen3-0.6B", "c1899de289a04d12100db370d81485cdf75e47ca")}[key]
    return AutoTokenizer.from_pretrained(repo, revision=rev)


def piece(tok, i):
    return tok.decode([int(i)])


def head_scores(att):
    """att (L, H, T, T) on the running text -> per-head scores."""
    L, H, T, _ = att.shape
    sink = att[:, :, 8:, 0].mean(-1)
    prev = att[:, :, np.arange(1, T), np.arange(0, T - 1)].mean(-1)
    self_ = att[:, :, np.arange(1, T), np.arange(1, T)].mean(-1)
    p = np.clip(att[:, :, 8:], 1e-12, 1)
    ent = -(att[:, :, 8:] * np.log(p)).sum(-1)                         # nats, per query
    ent = (ent / np.log(np.arange(9, T + 1))[None, None]).mean(-1)     # normalised by log(#keys visible)
    return {"sink": sink, "prev": prev, "self": self_, "ent": ent}


def encode_maps(att, layers, th):
    """Sparse per-query lists: for each stored (layer, head, query): count byte, then (key, weight*255) bytes."""
    L, H, T, _ = att.shape
    buf, kept, total = bytearray(), 0.0, 0.0
    for l in layers:
        for h in range(H):
            for q in range(T):
                row = att[l, h, q, :q + 1]
                ks = np.nonzero(row >= th)[0]
                if len(ks) > 40:
                    ks = ks[np.argsort(-row[ks])[:40]]; ks.sort()
                buf.append(len(ks))
                for k in ks:
                    buf.append(int(k)); buf.append(min(255, int(round(row[k] * 255))))
                kept += row[ks].sum(); total += row.sum()
    return base64.b64encode(bytes(buf)).decode(), kept / total


def pretrained(key):
    d = os.path.join(SCR, "in", key)
    S = json.load(open(os.path.join(d, "summary.json")))
    tok = tok_for(key)
    run = np.load(os.path.join(d, "running.npz"))
    ids, att = run["ids"], run["att"].astype(np.float32)
    L, H, T, _ = att.shape
    hs = head_scores(att)
    rand = np.load(os.path.join(d, "rand.npz"))
    ind = rand["ind"]
    res = {"repo": S["repo"], "revision": S["revision"], "dtype": S["dtype"], "L": L, "H": H, "kv": S["n_kv_heads"],
           "d": S["d_model"], "T": int(T), "loss": S["running"]["loss"],
           "scores": {k: [r(v, 3) for v in hs[k]] for k in hs}, "ind": [r(v, 3) for v in ind],
           "prev_rand": [r(v, 3) for v in rand["prev"]],
           "sink_layer": r(hs["sink"].mean(1), 4),
           "rand": {"c1": S["rand"]["loss_first_copy"], "c2": S["rand"]["loss_second_copy"], "L": S["rand"]["L"],
                    "n": S["rand"]["n_seeds"], "by_pos": r(rand["loss"].mean(0), 2)},
           "abl": S["sink_ablation"], "win": S["window"], "sdpa": S.get("sdpa_output_attentions"),
           "lens_last": S.get("lens_last_matches_logits_maxabs"),
           "seconds": S["seconds"], "mps_mb": S["mps_driver_mb"], "rss_mb": S["peak_rss_mb"]}
    # window curves: mean loss over blocks of 32 tokens
    w = np.load(os.path.join(d, "window.npz"))
    res["win_curves"] = {k: r([w[k][i:i + 32].mean() for i in range(0, len(w[k]), 32)], 3)
                         for k in ("full", "window", "window_sink", "window_sink1")}
    # residual stream
    x = np.load(os.path.join(d, "resid.npz"))["x"].astype(np.float32)
    nrm = np.linalg.norm(x, axis=-1)
    a = np.abs(x)
    mx = [np.unravel_index(a[l].argmax(), a[l].shape) for l in range(x.shape[0])]
    res["resid"] = {"tok0_norm": r(nrm[:, 0], 1), "median_norm": r(np.median(nrm[:, 1:], 1), 1),
                    "max_abs": r([a[l].max() for l in range(x.shape[0])], 1),
                    "max_tok": [int(m[0]) for m in mx], "max_dim": [int(m[1]) for m in mx],
                    "median_abs": r(np.median(a.reshape(x.shape[0], -1), 1), 3)}
    # top 3 dims by max |x| at the deepest layer where the max is largest
    lbig = int(np.argmax(res["resid"]["max_abs"][:-1]))
    dims = np.argsort(-a[lbig].max(0))[:4]
    res["resid"]["big_layer"] = lbig
    res["resid"]["big_dims"] = [{"dim": int(k), "max": round(float(a[lbig, :, k].max()), 1),
                                 "tok": int(a[lbig, :, k].argmax())} for k in dims]
    # logit lens
    lz = np.load(os.path.join(d, "lens.npz"))
    top, p, tgt, kl = lz["top"], lz["p"], lz["tgt"], lz["kl"]
    final_top1 = top[-1, :, 0]
    res["lens"] = {"ce": r(tgt.mean(1), 2), "ce_median": r(np.median(tgt, 1), 2), "kl": r(kl.mean(1), 2),
                   "agree": r((top[:, :, 0] == final_top1[None]).mean(1), 3)}
    res["tokens"] = [piece(tok, i) for i in ids]
    res["lens"]["layer0_is_input"] = round(float((top[0, :, 0] == ids).mean()), 3)
    if key == "smol":
        uniq, inv = np.unique(top[:, :, 0], return_inverse=True)
        ptgt = np.exp(-tgt)                                              # prob of the real next token, (L+1, T-1)
        res["lens"]["vocab"] = [piece(tok, i) for i in uniq]
        res["lens"]["top1"] = b64(inv.reshape(top.shape[0], top.shape[1]).astype(np.uint16))
        res["lens"]["ptgt"] = b64(np.clip(np.round(ptgt * 100), 0, 100).astype(np.uint8))
        enc, frac = encode_maps(att, MAP_LAYERS[key], MAP_TH)
        res["maps"] = {"layers": MAP_LAYERS[key], "th": MAP_TH, "data": enc, "mass_kept": round(float(frac), 3)}
        # one repeated random sequence: the best induction head's row for one query in copy 2
        a0 = rand["att0"].astype(np.float32)                              # (L, H, T, T) seed 0
        lb, hb = np.unravel_index(ind.argmax(), ind.shape)
        res["ind_best"] = [int(lb), int(hb)]
        seq = rand["seq"][0]
        res["rand_tokens"] = [piece(tok, i) for i in seq]
        q = 150
        res["ind_row"] = {"q": q, "w": r(a0[lb, hb, q, :q + 1], 3)}
        pl, ph = np.unravel_index(hs["prev"].argmax(), hs["prev"].shape)
        res["prev_best"] = [int(pl), int(ph)]
    return res


def facts(D):
    """Named numbers the tab's prose quotes (filled into <span class="in-v">), derived from the data above."""
    F = {}
    if "smol" in D:
        s = D["smol"]
        sl = s["sink_layer"]
        F["smol_sink_below12_max"] = max(sl[:12]); F["smol_sink_from12_min"] = min(sl[12:]); F["smol_sink_from12_max"] = max(sl[12:])
        pv = np.array(s["scores"]["prev"]); l, h = np.unravel_index(pv.argmax(), pv.shape)
        F["smol_prev_best_lbl"] = "layer %d, head %d" % (l, h); F["smol_prev_best_val"] = float(pv.max())
        ind = np.array(s["ind"]); l, h = np.unravel_index(ind.argmax(), ind.shape)
        F["smol_ind_best_lbl"] = "layer %d, head %d" % (l, h); F["smol_ind_best_val"] = float(ind.max())
        F["smol_ind_n03"] = int((ind > 0.3).sum())
        F["smol_ind_layers"] = "%d to %d" % (np.where(ind > 0.3)[0].min(), np.where(ind > 0.3)[0].max())
        F["smol_eot_once_max"] = max(s["abl"]["eot_first"]["sink_mass_on_first_text_token"])
        R = s["resid"]
        F["smol_big_dim"] = R["max_dim"][12]; F["smol_big_max"] = max(R["max_abs"][12:30])
        F["smol_big_min"] = min(R["max_abs"][12:30])
        F["smol_med12"] = R["median_abs"][12]; F["smol_ratio"] = F["smol_big_max"] / F["smol_med12"]
        F["smol_big_early"] = max(R["max_abs"][3:10])
        F["smol_lens_last"] = s.get("lens_last", 0.0)
        ag = s["lens"]["agree"]; F["smol_lens_half"] = next(i for i, a in enumerate(ag) if a >= 0.5)
        F["smol_lens_agree_mid"] = max(ag[1:20]); F["smol_lens_ce_mid"] = max(s["lens"]["ce"][1:20])
    if "qwen" in D:
        q = D["qwen"]; R = q["resid"]
        F["qwen_big_max"] = max(R["max_abs"][:-1]); F["qwen_big_layer"] = int(np.argmax(R["max_abs"][:-1]))
        F["qwen_big_dim"] = R["max_dim"][F["qwen_big_layer"]]; F["qwen_big_tok"] = R["max_tok"][F["qwen_big_layer"]]
        F["qwen_med"] = R["median_abs"][F["qwen_big_layer"]]
        F["qwen_ratio"] = F["qwen_big_max"] / F["qwen_med"]
        ag = q["lens"]["agree"]; F["qwen_lens_half"] = next(i for i, a in enumerate(ag) if a >= 0.5)
        ind = np.array(q["ind"]); l, h = np.unravel_index(ind.argmax(), ind.shape)
        F["qwen_ind_best_lbl"] = "layer %d, head %d" % (l, h); F["qwen_ind_best_val"] = float(ind.max())
        F["qwen_ind_n03"] = int((ind > 0.3).sum())
    if "tiny" in D:
        t = D["tiny"]
        F["tiny_ind_max"] = max(max(v) for v in t["after"]["rand"]["ind"])
        F["tiny_rep_ind_max"] = max(max(v) for v in t["after"]["rep"]["ind"])
        F["tiny_max_after"] = max(t["after"]["max_abs"]); F["tiny_max_before"] = max(t["before"]["max_abs"])
        F["tiny_prev_best"] = max(max(v) for v in t["after"]["prev"])
        F["tiny_sink_max"] = max(max(v) for v in t["after"]["sink"])
    if "pythia" in D:
        ck = D["pythia"]["checkpoints"]
        ip = [max(max(v) for v in c["ind"]) for c in ck]
        first = next(i for i, v in enumerate(ip) if v > 0.3)
        F["pythia_before_step"] = ck[first - 1]["step"]; F["pythia_after_step"] = ck[first]["step"]
        F["pythia_before_tok"] = ck[first - 1]["tokens"] / 1e9; F["pythia_after_tok"] = ck[first]["tokens"] / 1e9
        F["pythia_before_c2"] = ck[first - 1]["loss_copy2"]; F["pythia_after_c2"] = ck[first]["loss_copy2"]
        F["pythia_before_ind"] = ip[first - 1]; F["pythia_after_ind"] = ip[first]
        F["pythia_ratio_tiny"] = ck[first]["tokens"] / 12288000
        bi = min(range(len(ck)), key=lambda i: ck[i]["loss_copy2"])
        F["pythia_best_step"] = ck[bi]["step"]; F["pythia_best_tok"] = ck[bi]["tokens"] / 1e9; F["pythia_best_c2"] = ck[bi]["loss_copy2"]
        F["pythia_best_run"] = ck[bi]["running_loss"]
        F["pythia_final_c2"] = ck[-1]["loss_copy2"]; F["pythia_final_c1"] = ck[-1]["loss_copy1"]; F["pythia_final_ind"] = ip[-1]
        F["pythia_final_run"] = ck[-1]["running_loss"]
    return {k: (round(v, 6) if isinstance(v, float) else v) for k, v in F.items()}


def main():
    os.makedirs(OUT, exist_ok=True)
    D = {"made": "2026-10-18"}
    for key in ("smol", "qwen"):
        if os.path.exists(os.path.join(SCR, "in", key, "summary.json")):
            D[key] = pretrained(key)
            json.dump(D[key], open(os.path.join(OUT, key + ".json"), "w"))
    for name, path in [("pythia", os.path.join(SCR, "in", "pythia", "phase.json")),
                       ("tiny", os.path.join(SCR, "in", "tiny", "tiny.json"))]:
        if path and os.path.exists(path):
            D[name] = json.load(open(path))
            if name == "tiny" and "traj" in D[name]:   # the page plots step, best induction and copy-2 loss only
                D[name]["traj"]["probes"] = [{k: q[k] for k in ("step", "ind_max", "prev_max", "loss_copy1", "loss_copy2")} for q in D[name]["traj"]["probes"]]
                D[name]["traj"].pop("train", None)
            if name == "pythia":                       # page precision: enough for the charts, a third of the bytes
                for c in D[name]["checkpoints"]:
                    c["loss_by_pos"] = r(c["loss_by_pos"], 1); c["best_row_q150"] = r(c["best_row_q150"], 2)
                    c["ind"] = [r(v, 3) for v in c["ind"]]; c["prev"] = [r(v, 3) for v in c["prev"]]
            json.dump(D[name], open(os.path.join(OUT, name + ".json"), "w"))
        elif os.path.exists(os.path.join(OUT, name + ".json")):
            D[name] = json.load(open(os.path.join(OUT, name + ".json")))
    for key in ("smol", "qwen"):
        if key not in D and os.path.exists(os.path.join(OUT, key + ".json")):
            D[key] = json.load(open(os.path.join(OUT, key + ".json")))
    D["facts"] = facts(D)
    json.dump(D["facts"], open(os.path.join(OUT, "facts.json"), "w"), indent=1)
    js = "// written by src/inside/make_page_data.py from the recorded runs; do not edit by hand\nwindow.IND=" + \
         json.dumps(D, separators=(",", ":"), ensure_ascii=False) + ";\n"
    open(PART, "w").write(js)
    print("bytes", len(js.encode()), {k: len(json.dumps(v)) for k, v in D.items()})


if __name__ == "__main__":
    main()
