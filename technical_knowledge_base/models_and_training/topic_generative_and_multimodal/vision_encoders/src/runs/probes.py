"""Frozen-feature evaluation of four encoders on Fashion-MNIST (numpy only, from the saved embeddings).

Encoders and vectors (all unit length):
  clip, siglip      : the Vision lab's image embeddings (pooled and projected), GM_SCRATCH/vision/fmnist_*.npz
  dino_cls, dino_mean, dino_cat : DINOv2 B/14 final [CLS], mean of patch tokens, and the two concatenated
                      (DINOv2's own linear evaluation concatenates [CLS] and the average patch token)
  mae_cls, mae_mean : MAE ViT-B/16 final [CLS] and mean of patch tokens
Measures, train = the 5,000 val images (500 per class), test = the 10,000 test images:
  linear probe     : the Vision lab's exact function and draws (zeroshot.py), k = 1, 4, 16, 64, 500 per class;
                     the clip and siglip rows are checked against the lab's out/zeroshot.json
  kNN              : weighted k-nearest-neighbour vote as in DINO (k = 20, weights exp(cos / 0.07)) on all 5,000
  image -> image   : every test image as a query against the other 9,999; precision@1, @10, @100 (share of the
                     retrieved images with the query's class) and mean average precision (class-level relevance)
  text -> image    : (clip, siglip only) the 10 class sentences of the lab's best prompt set as queries over 10,000
Also writes the page's retrieval demo neighbours: the first 100 test images of each class (1,000, the gallery) and
for each gallery image its 8 nearest gallery neighbours under each encoder.
Writes ../out/probes.json and ../out/neighbours.json.
"""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ve_env import *
import numpy as np
from probes_core import probe   # the Vision lab's probe, verbatim

R = {"date": time.strftime("%Y-%m-%d"), "machine": MACHINE, "device": "cpu", "classes": CLASSES}
xt, yt = load_split("test")


def unit(a):
    a = a.astype(np.float32); return a / np.linalg.norm(a, axis=1, keepdims=True)


feats = {}
for w in ("clip", "siglip"):
    E = np.load(lab(f"fmnist_{w}.npz"))   # used exactly as the lab did (float16 unit vectors cast to float32)
    feats[w] = (E["e_val"].astype(np.float32), E["y_val"], E["e_test"].astype(np.float32))
for w in ("dino", "mae"):
    E = np.load(big(f"fmnist_{w}.npz")); yv = E["y_val"]; assert (E["y_test"] == yt).all()
    c_v, c_t, m_v, m_t = (unit(E[k]) for k in ("cls_val", "cls_test", "mean_val", "mean_test"))
    feats[f"{w}_cls"] = (c_v, yv, c_t); feats[f"{w}_mean"] = (m_v, yv, m_t)
    if w == "dino":
        feats["dino_cat"] = (unit(np.hstack([c_v, m_v])), yv, unit(np.hstack([c_t, m_t])))

lab_zs = json.load(open(os.path.join(ROOT_SRC, "vision", "out", "zeroshot.json")))
T = {w: np.load(lab(f"text_{w}.npz")) for w in ("clip", "siglip")}
best_set = {"clip": lab_zs["clip"]["best"], "siglip": lab_zs["siglip"]["best"]}


def precision_at(S, labels_q, labels_g, ks, exclude_self=False):
    out = {k: 0.0 for k in ks}; ap_sum = 0.0; n = len(S)
    for i in range(n):
        s = S[i].copy()
        if exclude_self:
            s[i] = -np.inf
        order = np.argsort(-s)
        if exclude_self:
            order = order[:-1]
        rel = (labels_g[order] == labels_q[i]).astype(np.float64)
        for k in ks:
            out[k] += rel[:k].mean()
        hits = np.cumsum(rel); ap_sum += (hits / np.arange(1, len(rel) + 1) * rel).sum() / max(rel.sum(), 1)
    return {f"p@{k}": round(out[k] / n, 4) for k in ks} | {"map": round(ap_sum / n, 4)}


res = {}
for name, (Xv, yv, Xt) in feats.items():
    t0 = time.time(); m = {}
    rng = np.random.default_rng(0); lp = {}
    for kk in (1, 4, 16, 64, 500):
        accs = []
        for d in range(5 if kk < 500 else 1):
            idx = np.concatenate([rng.permutation(np.where(yv == c)[0])[:kk] for c in range(10)])
            accs.append(probe(Xv[idx], yv[idx], Xt, yt))
        lp[str(kk)] = {"mean": round(float(np.mean(accs)), 4), "min": round(min(accs), 4), "max": round(max(accs), 4), "draws": len(accs)}
    m["linear_probe"] = lp
    # weighted kNN (DINO protocol: k = 20, T = 0.07)
    correct = 0
    for i in range(0, len(Xt), 1000):
        S = Xt[i:i + 1000] @ Xv.T
        top = np.argpartition(-S, 20, axis=1)[:, :20]
        sv = np.take_along_axis(S, top, 1); wv = np.exp(sv / 0.07)
        votes = np.zeros((len(S), 10))
        for c in range(10):
            votes[:, c] = (wv * (yv[top] == c)).sum(1)
        correct += (votes.argmax(1) == yt[i:i + 1000]).sum()
    m["knn20"] = round(correct / len(Xt), 4)
    m["img2img"] = precision_at(Xt @ Xt.T, yt, yt, (1, 10, 100), exclude_self=True)
    if name in T:
        Q = T[name][best_set[name]]
        m["txt2img"] = precision_at(Q @ Xt.T, np.arange(10), yt, (1, 10, 100)) | {"prompt_set": best_set[name]}
        assert abs(lp["500"]["mean"] - lab_zs[name]["linear_probe"]["500"]["mean"]) < 1e-9, "probe differs from the Vision lab"
        assert abs(lp["16"]["mean"] - lab_zs[name]["linear_probe"]["16"]["mean"]) < 1e-9, "probe differs from the Vision lab"
    m["dim"] = int(Xt.shape[1]); m["seconds"] = round(time.time() - t0, 1)
    res[name] = m
    print(name, m["linear_probe"]["16"]["mean"], m["linear_probe"]["500"]["mean"], m["knn20"], m["img2img"], m.get("txt2img"), flush=True)
R["encoders"] = res
R["settings"] = {"probe": lab_zs["clip"]["probe_settings"] + " (the root zero-shot study's function and random draws)",
                 "knn": "weighted vote, k = 20, weights exp(cos/0.07), train = 5,000 val images",
                 "retrieval": "class-level relevance; img2img queries exclude themselves (9,999 candidates)"}
dump("probes.json", R)

# retrieval demo: the first 100 test images of each class, 8 nearest gallery neighbours per encoder
gal = np.concatenate([np.where(yt == c)[0][:100] for c in range(10)])
nb = {"gallery_test_idx": gal.tolist(), "labels": yt[gal].tolist(), "k": 8, "nn": {}}
for name in ("clip", "siglip", "dino_cls", "mae_mean"):
    G = feats[name][2][gal]; S = G @ G.T; np.fill_diagonal(S, -np.inf)
    top = np.argsort(-S, axis=1)[:, :8]
    nb["nn"][name] = {"idx": top.tolist(), "cos": np.round(np.take_along_axis(S, top, 1), 3).tolist()}
    nb.setdefault("gallery_p8", {})[name] = round(float((yt[gal][top] == yt[gal][:, None]).mean()), 4)
dump("neighbours.json", nb)
