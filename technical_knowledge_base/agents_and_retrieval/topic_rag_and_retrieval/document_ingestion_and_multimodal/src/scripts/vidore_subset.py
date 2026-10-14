"""A smaller copy of a ViDoRe set, used because page-image encoding on this shared 16 GB Mac was too slow for the full
sets (see src/README.md). Queries: a seeded sample (seed 0) of N; corpus: their relevant pages plus a seeded random
sample of the other pages, up to P pages. Text retrieval and page-image retrieval are both run on the same subset.
usage: python -I vidore_subset.py <ING_DIR> <set> <N queries> <P pages>   -> <ING_DIR>/vidore/<set>_sub/"""
import json, os, random, sys

ING, NAME, N, P = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
src = os.path.join(ING, "vidore", NAME); dst = src + "_sub"
meta = json.load(open(os.path.join(src, "meta.json")))
rng = random.Random(0)
qs = rng.sample(meta["queries"], min(N, len(meta["queries"])))
gold = sorted(set(q["gold"] for q in qs))
rest = [i for i in range(len(meta["pages"])) if i not in set(gold)]
pages = gold + rng.sample(rest, max(0, min(len(rest), P - len(gold))))
new = {old: k for k, old in enumerate(pages)}
os.makedirs(os.path.join(dst, "img"), exist_ok=True); os.makedirs(os.path.join(dst, "ocr"), exist_ok=True)
for old, k in new.items():
    for sub, ext in (("img", "png"), ("ocr", "txt")):
        lk = os.path.join(dst, sub, "%d.%s" % (k, ext))
        if not os.path.exists(lk):
            os.symlink(os.path.join(src, sub, "%d.%s" % (old, ext)), lk)
json.dump({"pages": [meta["pages"][o] for o in pages], "orig_index": pages,
           "queries": [{"qid": q["qid"], "query": q["query"], "gold": new[q["gold"]]} for q in qs]},
          open(os.path.join(dst, "meta.json"), "w"))
ot = json.load(open(os.path.join(src, "ocr_times.json")))
json.dump({str(new[int(k)]): v for k, v in ot.items() if not k.startswith("_") and int(k) in new}, open(os.path.join(dst, "ocr_times.json"), "w"))
print(NAME, "subset:", len(qs), "queries,", len(pages), "pages")
