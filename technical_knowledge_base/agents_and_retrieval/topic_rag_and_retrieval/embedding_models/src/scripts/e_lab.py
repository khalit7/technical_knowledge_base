"""Data for the Training lab tab, from the fine-tune's snapshots (e_train.py). CPU, deterministic.
For each arm shown (seed 0 of "inbatch" and "dense_f") and the starting model: for each of the 12 claims, the exact
cosine to its 27 related texts (its labelled abstract, its 3 hard negatives, the other 11 claims' abstracts, 12
random abstracts) at every snapshot, plus the step and the training loss at that step.
usage: python -I -B e_lab.py          -> ../data/lab.json
       python -I -B e_lab.py --smoke  -> $RAG_SCRATCH/emb/lab_dev.json from the CPU smoke runs (page development only;
                                         used by build_data.py only when EMB_DEV=<that file>; the page then says so)"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from emblib import scratch, load_data, save  # noqa: E402

smoke = "--smoke" in sys.argv
odir = scratch("train")
if smoke:
    items = json.load(open(os.path.join(odir, "smoke_items.json")))
    runs = {a: np.load(os.path.join(odir, "smoke_%s.npz" % a)) for a in ("inbatch", "dense_f")}
    losses = {a: [] for a in runs}
    meta = {a: {} for a in runs}
else:
    tr = load_data("train_runs.json")
    items = tr["snap_items"]
    ep = [r for r in tr["runs"] if r["variant"] == "dense_f" and r["seed"] == 0][0]["epochs"]
    runs = {a: np.load(os.path.join(odir, "%s_s0_e%d.npz" % (a, ep))) for a in ("inbatch", "dense_f")}
    rr = {a: [r for r in tr["runs"] if r["variant"] == a and r["seed"] == 0][0] for a in runs}
    losses = {a: rr[a]["losses"] for a in runs}
    meta = {a: dict(scifact=rr[a]["scifact"], nfcorpus=rr[a]["nfcorpus"]) for a in runs}

claims = [i for i, x in enumerate(items) if x["kind"] == "claim"]
groups = []
for ci in claims:
    g = items[ci]["group"]
    own_pos = [i for i, x in enumerate(items) if x["kind"] == "pos" and x["group"] == g]
    own_neg = [i for i, x in enumerate(items) if x["kind"] == "neg" and x["group"] == g]
    other_pos = [i for i, x in enumerate(items) if x["kind"] == "pos" and x["group"] != g]
    rand = [i for i, x in enumerate(items) if x["kind"] == "rand"]
    groups.append(dict(claim=ci, rel=own_pos + own_neg + other_pos + rand,
                       kinds=["pos"] * len(own_pos) + ["neg"] * len(own_neg) + ["other"] * len(other_pos) + ["rand"] * len(rand)))
out = dict(dev=smoke, items=[dict(kind=x["kind"], id=x["id"], text=x["text"][:150]) for x in items],
           groups=[dict(claim=g["claim"], rel=g["rel"], kinds=g["kinds"]) for g in groups], arms={})
for a, z in runs.items():
    S = z["snap"].astype(np.float32)  # [frames, 72, d]
    steps = [int(s) for s in z["snap_steps"]]
    frames = []
    for f in range(S.shape[0]):
        fr = []
        for g in groups:
            c = S[f, g["claim"]]
            fr.append([round(float(S[f, j] @ c), 3) for j in g["rel"]])
        frames.append(fr)
    ls = losses[a]
    out["arms"][a] = dict(steps=steps, frames=frames, loss=[(ls[s - 1] if 0 < s <= len(ls) else None) for s in steps], **meta[a])
if smoke:
    json.dump(out, open(scratch("lab_dev.json"), "w"))
    print("wrote", "$RAG_SCRATCH/emb/lab_dev.json")
else:
    save("lab.json", out)
