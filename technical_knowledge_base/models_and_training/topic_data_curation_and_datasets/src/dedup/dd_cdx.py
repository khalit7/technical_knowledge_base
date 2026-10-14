"""Cross-crawl duplicates: do the pages of our WARC reappear, nearly unchanged, in other Common Crawl crawls?

FineWeb deduplicated each crawl on its own, so a page captured in two crawls stays in FineWeb twice. For every one of
run0's 2,692 filtered documents (the MinHash stage's input) this script:
  index    looks its URL up in another crawl's URL index, read directly from data.commoncrawl.org: cluster.idx (the
           first key of every block of the sorted CDX index) points to one gzip block of cdx-NNNNN.gz, fetched with an
           HTTP range request (the same lookup the index server does; the server itself managed about 4 URLs a minute)
           URLs are put in SURT form with the `surt` package (Common Crawl's own key format)
  fetch    range-requests the newest HTML capture's WARC record (a few kB each)
  compare  extracts it with run0's Trafilatura settings and computes the 5-gram Jaccard similarity (datatrove's
           shingles) against our version; also records whether the payload digest is identical
usage: dd_cdx.py index|fetch|compare   (PYTHONPATH must include the folder where `surt` is installed)
Caches in $DC_SCRATCH/dedup/cdx/; result in out/dd_cdx.json. Downloads are taken under the shared download lock.
"""
import bisect
import concurrent.futures as cf
import gzip
import json
import os
import subprocess
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

CRAWLS = ["CC-MAIN-2024-26", "CC-MAIN-2024-10", "CC-MAIN-2023-23", "CC-MAIN-2021-31"]
BASE = "https://data.commoncrawl.org/"
D = C.work("cdx")
os.makedirs(D, exist_ok=True)
LOCK = os.path.join(C.L.scratch(), "..", "inf", "lock.sh")


def lock(cmd):
    print(subprocess.run(["sh", LOCK, cmd, "download", "dd"], capture_output=True, text=True).stdout.strip(), flush=True)


def get(url, rng=None, tries=6):
    for k in range(tries):
        try:
            h = {"User-Agent": "dc-dedup-lab (research sample)"}
            if rng:
                h["Range"] = f"bytes={rng[0]}-{rng[0] + rng[1] - 1}"
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(2 * (k + 1))
    raise RuntimeError(f"{url}: {err}")


def docs():
    return [C.clean_doc(d) for d in C.L.run0("filtered")]


def index():
    import surt
    ds = docs()
    keys = [surt.surt(d["url"]) for d in ds]
    lock("acquire")
    try:
        for crawl in CRAWLS:
            out = os.path.join(D, f"idx_{crawl}.jsonl")
            if os.path.exists(out):
                continue
            ci = os.path.join(D, f"cluster_{crawl}.idx")
            if not os.path.exists(ci):
                open(ci, "wb").write(get(f"{BASE}cc-index/collections/{crawl}/indexes/cluster.idx"))
            first, loc = [], []
            for line in open(ci, encoding="utf-8", errors="replace"):
                a = line.rstrip("\n").split("\t")
                first.append(a[0]); loc.append((a[1], int(a[2]), int(a[3])))
            need = {}
            for i, k in enumerate(keys):
                b = max(0, bisect.bisect_right(first, k + " \uffff") - 1)  # last block starting at or before k
                need.setdefault(b, []).append(i)
                if b > 0 and first[b].startswith(k + " "):  # k's captures may begin in the previous block
                    need.setdefault(b - 1, []).append(i)

            def block(b):
                f, off, ln = loc[b]
                raw = get(f"{BASE}cc-index/collections/{crawl}/indexes/{f}", (off, ln))
                return gzip.decompress(raw).decode("utf-8", "replace").splitlines()

            res = {}
            with cf.ThreadPoolExecutor(6) as ex:
                fut = {ex.submit(block, b): b for b in need}
                for n, f in enumerate(cf.as_completed(fut)):
                    b = fut[f]
                    lines = f.result()
                    for i in need[b]:
                        caps = [json.loads(l.split(" ", 2)[2]) for l in lines if l.split(" ", 1)[0] == keys[i]]
                        res.setdefault(i, []).extend(caps)
                    if n % 500 == 0:
                        print(crawl, n, "of", len(need), "blocks", flush=True)
            with open(out, "w") as fo:
                for i in range(len(ds)):
                    fo.write(json.dumps({"i": i, "caps": res.get(i, [])}) + "\n")
            print(crawl, "found", sum(1 for v in res.values() if v), "of", len(ds), flush=True)
            os.remove(ci)
    finally:
        lock("release")


def fetch():
    lock("acquire")
    try:
        for crawl in CRAWLS:
            out = os.path.join(D, f"warc_{crawl}")
            os.makedirs(out, exist_ok=True)
            rows = [json.loads(l) for l in open(os.path.join(D, f"idx_{crawl}.jsonl"))]

            def one(row):
                caps = [c for c in row["caps"] if c.get("status") == "200" and "html" in c.get("mime-detected", "")]
                fn = os.path.join(out, f"{row['i']}.warc.gz")
                if not caps or os.path.exists(fn):
                    return
                c = caps[-1]
                open(fn, "wb").write(get(BASE + c["filename"], (int(c["offset"]), int(c["length"]))))

            with cf.ThreadPoolExecutor(6) as ex:
                list(ex.map(one, rows))
            print(crawl, len(os.listdir(out)), "records", flush=True)
    finally:
        lock("release")


def compare():
    import multiprocessing
    multiprocessing.set_start_method("fork", force=True)
    import base64
    import hashlib
    import numpy as np
    from warcio.archiveiterator import ArchiveIterator
    from datatrove.pipeline.extractors import Trafilatura
    ds = docs()
    sg = C.signer()
    ex = Trafilatura(favour_precision=True, timeout=5.0)  # run0 used 1 s under heavy load; 5 s avoids timeouts here
    sh = lambda t: set(np.unique(sg.get_shingles(t).ravel()).tolist())  # noqa: E731
    final_ids = set(C.L.ids("run0_final"))
    res = {"n": len(ds), "crawls": {}}
    # our own payload digests (WARC-Payload-Digest of our WARC), to tell byte-identical recaptures apart
    ours_digest = {}
    for r in C.L.warc_records():
        ours_digest[r["id"]] = "sha1:" + base64.b32encode(hashlib.sha1(r["body"]).digest()).decode()
    for crawl in CRAWLS:
        rows = [json.loads(l) for l in open(os.path.join(D, f"idx_{crawl}.jsonl"))]
        out = []
        for r in rows:
            fn = os.path.join(D, f"warc_{crawl}", f"{r['i']}.warc.gz")
            if not os.path.exists(fn):
                continue
            for rec in ArchiveIterator(open(fn, "rb")):
                if rec.rec_type != "response":
                    continue
                body = rec.content_stream().read()
                dig = "sha1:" + base64.b32encode(hashlib.sha1(body).digest()).decode()
                try:
                    text = ex.extract(body.decode("utf-8", "replace")) or ""
                except Exception:  # noqa: BLE001
                    text = ""
                a, b = sh(ds[r["i"]]["text"]), sh(text)
                j = len(a & b) / len(a | b) if (a | b) else 0.0
                out.append([r["i"], round(j, 3), int(dig == ours_digest.get(ds[r["i"]]["id"])),
                            int(ds[r["i"]]["id"] in final_ids), len(text)])
        js = np.array([x[1] for x in out]) if out else np.zeros(0)
        res["crawls"][crawl] = {"with_capture": sum(1 for r in rows if r["caps"]),
                                "with_html_200": sum(1 for r in rows if any(c.get("status") == "200" and "html" in c.get("mime-detected", "") for c in r["caps"])),
                                "compared": len(out), "empty_extraction": sum(1 for x in out if x[4] == 0),
                                "identical_payload": sum(x[2] for x in out),
                                "hist": np.histogram(js, bins=np.linspace(0, 1, 21))[0].tolist(),
                                "pairs": out}
        res["crawls"][crawl]["ge"] = {t: int((js >= float(t)).sum()) for t in ("0.5", "0.7", "0.8", "0.9", "0.95", "0.99")}
        print(crawl, {k: v for k, v in res["crawls"][crawl].items() if k != "pairs"}, flush=True)
    C.save("dd_cdx.json", res)


if __name__ == "__main__":
    {"index": index, "fetch": fetch, "compare": compare}[sys.argv[1]]()
