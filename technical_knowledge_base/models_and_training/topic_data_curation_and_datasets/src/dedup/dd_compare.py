"""Joins every method's result per document on run0's 2,692 filtered documents and builds the page's small data:
labelled boundary pairs with their measured numbers, method overlaps, and the showcase set for the before/after
animation. Reads the outputs of dd_pairs, dd_scurve, dd_exact (recomputed here per document), dd_sentdedup,
dd_suffix (recomputed here for L=100 on 'filtered'), dd_semantic. Writes out/dd_compare.json.
Shows hostnames only (never full URLs) and excerpts only from documents in the showcase list, PII-scrubbed.
"""
import glob
import gzip
import hashlib
import json
import os
import sys
import urllib.parse

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

docs = [C.clean_doc(d) for d in C.L.run0("filtered")]
n = len(docs)
host = [urllib.parse.urlsplit(d["url"]).hostname or "" for d in docs]
Z = np.load(C.work("pairs.npz"))
pi, pj, jac, masks = Z["i"], Z["j"], Z["jac"], Z["mask"]
eqs = np.unpackbits(masks, axis=1)[:, :112].astype(bool)
cand = eqs.reshape(len(eqs), 14, 8).all(2).any(1)
pidx = {(int(a), int(b)): k for k, (a, b) in enumerate(zip(pi, pj))}
E = np.load(C.work("emb.npy"))
cl = json.load(open(C.work("clusters.json")))
cluster_of = {x: ci for ci, g in enumerate(cl["clusters"]) for x in g}
mh_removed = set(cl["run0_removed"])  # the documents run0 (datatrove) removed: one kept per cluster

# exact document dedup (keep first)
seen, exact_removed = {}, set()
for i, d in enumerate(docs):
    k = hashlib.blake2b(d["text"].encode(), digest_size=8).digest()
    if k in seen:
        exact_removed.add(i)
    else:
        seen[k] = i
# C4 three-sentence spans (datatrove SentenceDedupFilter output of dd_sentdedup.py)
W = C.work("sent_filtered")
kept_text = {}
for fn in sorted(glob.glob(f"{W}/out/*.jsonl.gz")):
    for l in gzip.open(fn, "rt"):
        x = json.loads(l); kept_text[x["id"]] = x["text"]
sent_dropped = {i for i, d in enumerate(docs) if d["id"] not in kept_text}
sent_short = {i for i, d in enumerate(docs) if d["id"] in kept_text and kept_text[d["id"]] != d["text"]}
# semantic (eps 0.1, exact all-pairs ranking, same rule as dd_semantic.semdedup with k=1)
S = E @ E.T
cen = E.mean(0); cen /= np.linalg.norm(cen)
order = np.argsort(E @ cen)
sem_removed = set()
for r in range(1, n):
    if S[order[r], order[:r]].max() >= 0.9:
        sem_removed.add(int(order[r]))
# suffix array (L=100 bytes) on 'filtered': fraction of each document inside repeated spans
sa_frac = np.zeros(n)
SA = C.work("sa_filtered")
if os.path.exists(os.path.join(SA, "data.bin")):
    import subprocess, bisect, shutil
    BIN = os.path.join(C.L.scratch(), "src", "deduplicate_text_datasets", "target", "release", "dedup_dataset")
    fn = os.path.join(SA, "data.bin")
    data = open(fn, "rb").read()
    if not os.path.exists(fn + ".table.bin"):
        subprocess.run([BIN, "make", "--data-file", fn], check=True, capture_output=True)
    cache = os.path.join(SA, "cache_cmp"); shutil.rmtree(cache, ignore_errors=True)
    subprocess.run([BIN, "self-similar", "--data-file", fn, "--length-threshold", "100", "--cache-dir", cache,
                    "--num-threads", "4"], check=True, capture_output=True)
    out = subprocess.run([BIN, "collect", "--data-file", fn, "--cache-dir", cache, "--length-threshold", "100"],
                         check=True, capture_output=True, text=True).stdout.split("\n")
    shutil.rmtree(cache, ignore_errors=True); os.remove(fn + ".table.bin")
    starts, pos = [], 0
    for d in docs:
        pos += 6; starts.append(pos); pos += len(d["text"].encode())
    for l in out[out.index("out") + 1:]:
        if l.strip():
            a, b = map(int, l.split())
            di = bisect.bisect_right(starts, b - 1) - 1  # clip to the document holding the range's last byte
            a = max(a, starts[di])
            sa_frac[di] += (b - a) / max(1, len(docs[di]["text"].encode()))
sa_heavy = {i for i in range(n) if sa_frac[i] >= 0.5}

methods = {"exact": exact_removed, "minhash": mh_removed, "c4_spans": sent_dropped, "semantic_eps01": sem_removed,
           "suffix_half": sa_heavy}
overlap = {a: {b: len(methods[a] & methods[b]) for b in methods} for a in methods}
print({k: len(v) for k, v in methods.items()})

lab = json.load(open(os.path.join(C.HERE, "labels_boundary.json")))
rows = []
for a, b, l, rm, note in lab["pairs"]:
    k = pidx[(a, b)]
    rows.append({"a": a, "b": b, "ha": C.host_label(host[a]), "hb": C.host_label(host[b]), "j": round(float(jac[k]), 3),
                 "est": round(float(eqs[k].mean()), 3), "cand": int(cand[k]),
                 "same_cluster": int(cluster_of.get(a, -1) == cluster_of.get(b, -2)),
                 "cos": round(float(S[a, b]), 3), "label": l, "remove": rm, "note": note,
                 "dropped": [x for x in (a, b) if x in mh_removed]})
lab_sum = {}
for r in rows:
    s = lab_sum.setdefault(r["label"], {"n": 0, "cand": 0})
    s["n"] += 1; s["cand"] += r["cand"]
print(lab_sum)
wrong = [r for r in rows if r["label"] == "D" and r["cand"]]
print("D pairs that MinHash 14x8 makes candidates:", [(r["a"], r["b"], r["j"]) for r in wrong])
res = {"n": n, "methods": {k: sorted(v) for k, v in methods.items()}, "counts": {k: len(v) for k, v in methods.items()},
       "sent_shortened": len(sent_short), "overlap": overlap, "labelled": rows, "label_summary": lab_sum,
       "cluster_sizes": [len(g) for g in cl["clusters"]]}
json.dump({**res, "sa_frac": [round(min(1.0, float(x)), 3) for x in sa_frac]}, open(C.work("compare_full.json"), "w"))
res.pop("methods")
C.save("dd_compare.json", res)
