"""What crawl-wide dedup did to our WARC, read from FineWeb itself.

1. Attribution: of run0's 2,692 filtered documents (all heuristic filters passed, before MinHash), which are in FineWeb,
   which our one-file MinHash removed, and which neither (kept by us, absent from FineWeb): the last group is where
   FineWeb's crawl-wide MinHash (all 90,000 WARC files of CC-MAIN-2024-30) is the main suspect.
2. A direct look: MinHash signatures (datatrove, FineWeb's 14 x 8 settings) for the 50,000 random FineWeb rows of the
   same crawl on disk; LSH candidates between our documents and that sample, and inside the sample (FineWeb is already
   deduplicated per crawl, so pairs inside it are what its own dedup let through or never compared).
Writes out/dd_fineweb.json.
"""
import json
import os
import sys
import time
import urllib.parse

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

docs = [C.clean_doc(d) for d in C.L.run0("filtered")]
final_ids = set(C.L.ids("run0_final"))
fw_ids = set(C.L.ids("fineweb_kept"))
cl = json.load(open(C.work("clusters.json")))
in_cluster = {x for g in cl["clusters"] for x in g}
groups = {"in_fineweb": 0, "removed_by_our_minhash": 0, "kept_by_us_not_in_fineweb": 0}
ours_only = []
for i, d in enumerate(docs):
    if d["id"] in fw_ids:
        groups["in_fineweb"] += 1
    elif d["id"] not in final_ids:
        groups["removed_by_our_minhash"] += 1
    else:
        groups["kept_by_us_not_in_fineweb"] += 1
        ours_only.append(i)
# of our MinHash-removed documents, how many has FineWeb kept? (FineWeb keeps one per cluster too, possibly another file's)
rm_in_fw = sum(1 for i, d in enumerate(docs) if d["id"] not in final_ids and d["id"] in fw_ids)
print(groups, "| our MinHash removed but FineWeb kept:", rm_in_fw)

sg = C.signer()
SIG = C.work("fw50k_sigs.npy")
fw = C.L.curated("fineweb_rand50k", columns=["id", "url", "text", "file_path"])
fw = fw[fw["file_path"].map(lambda p: not p.endswith(C.L.FILE + ".warc.gz"))].reset_index(drop=True)  # other files only
if not os.path.exists(SIG):
    t0 = time.time()
    sigs = np.zeros((len(fw), 112), dtype=np.uint64)
    for k, t in enumerate(fw["text"]):
        s = np.unique(sg.get_shingles(t).ravel())
        if s.size:
            sigs[k] = np.concatenate(sg.get_signature(s.reshape(-1, 1)))
        if k % 10000 == 0:
            print(k, round(time.time() - t0), "s", flush=True)
    np.save(SIG, sigs)
    print("rough seconds for 50k signatures (shared machine, low priority):", round(time.time() - t0))
fsig = np.load(SIG)
Z = np.load(C.work("pairs.npz"))
osig = Z["sigs"]


def shingles(t):
    return set(np.unique(sg.get_shingles(t).ravel()).tolist())


def jacc(a, b):
    return len(a & b) / len(a | b) if (a | b) else 0.0


# LSH: 14 bands of 8; key = (band, 8 values)
buckets = {}
for k in range(len(fsig)):
    if not fsig[k].any():
        continue
    for b in range(14):
        buckets.setdefault((b, fsig[k, b * 8:(b + 1) * 8].tobytes()), []).append(k)
inside = set()
for v in buckets.values():
    for x in range(len(v)):
        for y in range(x + 1, len(v)):
            inside.add((v[x], v[y]))
cross = set()
for i in range(len(docs)):
    if not osig[i].any():
        continue
    for b in range(14):
        for k in buckets.get((b, osig[i, b * 8:(b + 1) * 8].tobytes()), []):
            cross.add((i, k))
fsh = {}
cross_rows = []
for i, k in sorted(cross):
    fsh.setdefault(k, shingles(fw["text"][k]))
    j = jacc(shingles(docs[i]["text"]), fsh[k])
    grp = "in_fineweb" if docs[i]["id"] in fw_ids else ("removed_by_our_minhash" if docs[i]["id"] not in final_ids
                                                        else "kept_by_us_not_in_fineweb")
    cross_rows.append({"ours": i, "fw": k, "jaccard": round(j, 3), "group": grp,
                       "same_host": urllib.parse.urlsplit(docs[i]["url"]).hostname ==
                       urllib.parse.urlsplit(fw["url"][k]).hostname})
inside_rows = []
for a, b in sorted(inside):
    fsh.setdefault(a, shingles(fw["text"][a])); fsh.setdefault(b, shingles(fw["text"][b]))
    inside_rows.append({"a": a, "b": b, "jaccard": round(jacc(fsh[a], fsh[b]), 3)})
ours_hit = {r["ours"] for r in cross_rows}
res = {"filtered": len(docs), "groups": groups, "minhash_removed_but_fineweb_kept": rm_in_fw,
       "fw_sample": len(fw), "fw_sample_note": "50,000 random FineWeb rows of CC-MAIN-2024-30 minus those from our WARC",
       "cross_candidates": len(cross_rows),
       "ours_with_candidate_by_group": {g: len({r["ours"] for r in cross_rows if r["group"] == g}) for g in groups},
       "cross_jaccard_ge_08": sum(1 for r in cross_rows if r["jaccard"] >= 0.8),
       "inside_candidates": len(inside_rows), "inside_jaccard_ge_08": sum(1 for r in inside_rows if r["jaccard"] >= 0.8),
       "inside_pairs": inside_rows[:50],
       "cross_examples": [dict(r, url_ours=docs[r["ours"]]["url"], url_fw=fw["url"][r["fw"]]) for r in cross_rows][:80]}
print({k: v for k, v in res.items() if k not in ("inside_pairs", "cross_examples")})
json.dump(res, open(C.work("dd_fineweb_full.json"), "w"), indent=1)
res.pop("cross_examples")  # URLs are reviewed by hand before anything reaches the page
C.save("dd_fineweb.json", res)
