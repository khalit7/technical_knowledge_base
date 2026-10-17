"""Text-to-image search over Fashion-MNIST with CLIP B/32 and SigLIP 2 B/16 (CPU float32, text towers only).

Image side: the Vision lab's saved test-set embeddings (no image is re-embedded). Queries: the sentences in QUERIES,
embedded with each model's own text tower (SigLIP 2 lowercased, as the Vision lab does; a few queries are also
run with capitals kept to show the case trap). For every query and model: the 8 best images of the page's
1,000-image gallery (the first 100 test images of each class), and, where the query names one class, precision@10
and @100 over all 10,000 test images.
Writes ../out/textq.json.
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ve_env import *
import numpy as np

cap_threads(4)
# (query, class index it names or None)
QUERIES = [
    ("a photo of a sneaker.", 7), ("a photo of a sandal.", 5), ("a photo of an ankle boot.", 9), ("a photo of a bag.", 8),
    ("a photo of a dress.", 3), ("a photo of a coat.", 4), ("a photo of a shirt.", 6), ("a photo of a pullover.", 2),
    ("a photo of a t-shirt.", 0), ("a photo of trousers.", 1),
    ("a high-heeled shoe", None), ("a handbag with a long strap", None), ("a backpack", None),
    ("a sleeveless dress", None), ("a long-sleeved top", None), ("a striped t-shirt", None),
    ("a t-shirt with a printed logo", None), ("a jacket with a zip", None), ("a pair of jeans", None),
    ("something to wear on your feet", None), ("a winter coat", None), ("a red dress", None), ("a cat", None),
    ("a black and white photo of a sneaker.", 7),
]
CASED = [("A photo of a Sneaker.", 7), ("A photo of a Bag.", 8), ("A photo of a Dress.", 3)]   # SigLIP 2 only, capitals kept
xt, yt = load_split("test")
gal = np.concatenate([np.where(yt == c)[0][:100] for c in range(10)])
R = {"date": time.strftime("%Y-%m-%d"), "machine": MACHINE, "device": "cpu", "gallery_test_idx": gal.tolist(),
     "queries": [q for q, _ in QUERIES], "query_class": [c for _, c in QUERIES], "cased": [q for q, _ in CASED]}


def score(te, E, classes, qs):
    out = []
    for i, (q, c) in enumerate(qs):
        s_all = E @ te[i]; s = s_all[gal]; top = np.argsort(-s)[:8]
        row = {"top": top.tolist(), "cos": np.round(s[top], 4).tolist(), "top_labels": yt[gal][top].tolist()}
        if c is not None:
            o = np.argsort(-s_all)
            row["p10"] = round(float((yt[o[:10]] == c).mean()), 3); row["p100"] = round(float((yt[o[:100]] == c).mean()), 3)
        out.append(row)
    return out


for which in ("clip", "siglip"):
    model, proc = vs_env.load(which, "cpu")
    E = np.load(lab(f"fmnist_{which}.npz"))["e_test"].astype(np.float32)
    te = vs_env.embed_text(model, proc, which, [q for q, _ in QUERIES])
    R[which] = score(te, E, None, QUERIES)
    if which == "siglip":
        tc = vs_env.embed_text(model, proc, which, [q for q, _ in CASED], lower=False)
        R["siglip_cased"] = score(tc, E, None, CASED)
    for (q, c), r in zip(QUERIES, R[which]):
        print(which, q, r.get("p10"), r.get("p100"), [CLASSES[l] for l in r["top_labels"][:5]], flush=True)
    del model
dump("textq.json", R)
