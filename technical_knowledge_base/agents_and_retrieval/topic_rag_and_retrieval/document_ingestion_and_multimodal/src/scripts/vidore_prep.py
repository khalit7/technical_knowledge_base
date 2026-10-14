"""Unpack a ViDoRe v1 test set into page images, queries and labels, then OCR every page with Tesseract.
usage: python -I vidore_prep.py <ING_DIR> <set name> [workers]
Corpus = every distinct image_filename; queries = rows with a query, gold = that row's image_filename (ViDoRe v1
has one relevant page per query). Images go to <ING_DIR>/vidore/<set>/img/<n>.png, OCR text (Tesseract 5.4.1,
LSTM, eng, --psm 3, on the image as given) to ocr/<n>.txt, with seconds per page in ocr_times.json."""
import io, json, os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
import pandas as pd

ING, NAME = sys.argv[1], sys.argv[2]
WK = int(sys.argv[3]) if len(sys.argv) > 3 else 3
d = os.path.join(ING, "vidore", NAME)
df = pd.concat([pd.read_parquet(os.path.join(d, f)) for f in sorted(os.listdir(d)) if f.endswith(".parquet")])
os.makedirs(os.path.join(d, "img"), exist_ok=True); os.makedirs(os.path.join(d, "ocr"), exist_ok=True)
names, seen = [], {}
for _, r in df.iterrows():
    fn = r["image_filename"]
    if fn not in seen:
        seen[fn] = len(names); names.append(fn)
        p = os.path.join(d, "img", "%d.png" % seen[fn])
        if not os.path.exists(p):
            open(p, "wb").write(r["image"]["bytes"])
queries = [{"qid": "q%d" % i, "query": r["query"], "gold": seen[r["image_filename"]]}
           for i, (_, r) in enumerate(df.iterrows()) if isinstance(r["query"], str) and r["query"].strip()]
json.dump({"pages": names, "queries": queries}, open(os.path.join(d, "meta.json"), "w"))
print(NAME, len(names), "pages", len(queries), "queries", flush=True)


def ocr(i):
    out = os.path.join(d, "ocr", "%d.txt" % i)
    if os.path.exists(out):
        return i, None
    t0 = time.time()
    r = subprocess.run(["tesseract", os.path.join(d, "img", "%d.png" % i), "-", "--psm", "3", "-l", "eng"],
                       capture_output=True, env=dict(os.environ, OMP_THREAD_LIMIT="1"))
    open(out, "w").write(r.stdout.decode("utf-8", "replace"))
    return i, round(time.time() - t0, 2)


tj = os.path.join(d, "ocr_times.json")
times = json.load(open(tj)) if os.path.exists(tj) else {}
with ThreadPoolExecutor(WK) as ex:
    for k, (i, t) in enumerate(ex.map(ocr, range(len(names)))):
        if t is not None:
            times[str(i)] = t
        if k % 100 == 0:
            json.dump(times, open(tj, "w")); print(k, flush=True)
times["_workers"] = WK; times["_loadavg_end"] = os.getloadavg()
json.dump(times, open(tj, "w"))
print("ocr done", flush=True)
