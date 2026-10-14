"""Exact-substring dedup with suffix arrays: Google's deduplicate-text-datasets (Lee et al. 2021) on the running example.

Each document is UTF-8 bytes preceded by a unique separator (0xFF 0xFF + its 4-byte index, as in the tool's own
load_dataset scripts) so no repeated span can cross a document boundary. Then, per length threshold L (bytes):
  dedup_dataset make          suffix array of the whole file (the .table.bin, "ratio" bytes per text byte)
  dedup_dataset self-similar  every suffix whose first L bytes equal its neighbour's in sorted order (all occurrences)
  dedup_dataset collect       merges those positions into byte ranges to remove
Measured: bytes inside repeated spans, documents touched and emptied, and the bytes that would go if one copy of each
repeated span were kept (Dolma 3's "keep at least one copy"; approximated by keeping the first range of each distinct
content). Stages: run0 'final' (PII-scrubbed: the page shows spans from it), 'filtered' and 'extracted' (counts only).
usage: dd_suffix.py   (needs DEDUP_BIN, default $DC_SCRATCH/src/deduplicate_text_datasets/target/release/dedup_dataset)
Writes out/dd_suffix.json; working files in $DC_SCRATCH/dedup/sa_<stage>/.
"""
import collections
import json
import os
import shutil
import struct
import subprocess
import sys
import time
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

BIN = os.environ.get("DEDUP_BIN") or os.path.join(C.L.scratch(), "src", "deduplicate_text_datasets", "target",
                                                   "release", "dedup_dataset")
THRESHOLDS = [50, 100, 200, 500, 1000]
STAGES = sys.argv[1:] or ["final", "filtered", "extracted"]


def run(args):
    t = time.time()
    p = subprocess.run([BIN] + args, capture_output=True, text=True)
    assert p.returncode == 0, p.stderr[-2000:]
    return p.stdout, time.time() - t


def build(stage):
    W = C.work(f"sa_{stage}")
    shutil.rmtree(W, ignore_errors=True); os.makedirs(W)
    docs = [C.clean_doc(d) for d in C.L.run0(stage)]
    data, starts = bytearray(), []
    for i, d in enumerate(docs):
        data += b"\xff\xff" + struct.pack("<I", i)
        starts.append(len(data))
        data += d["text"].encode("utf-8")
    fn = os.path.join(W, "data.bin")
    open(fn, "wb").write(data)
    _, t_make = run(["make", "--data-file", fn])
    ratio = os.path.getsize(fn + ".table.bin") // len(data)
    return W, fn, docs, bytes(data), starts, t_make, ratio


def ranges_for(W, fn, L):
    cache = os.path.join(W, f"cache_{L}")
    shutil.rmtree(cache, ignore_errors=True)
    _, t1 = run(["self-similar", "--data-file", fn, "--length-threshold", str(L), "--cache-dir", cache,
                 "--num-threads", "4"])
    out, t2 = run(["collect", "--data-file", fn, "--cache-dir", cache, "--length-threshold", str(L)])
    lines = out.split("\n")
    k = lines.index("out") if "out" in lines else -1
    rs = [tuple(map(int, l.split())) for l in lines[k + 1:] if l.strip()]
    shutil.rmtree(cache, ignore_errors=True)
    return rs, t1 + t2


def measure(stage, top=False):
    W, fn, docs, data, starts, t_make, ratio = build(stage)
    import bisect
    ends = [starts[i + 1] - 6 if i + 1 < len(starts) else len(data) for i in range(len(starts))]
    text_bytes = sum(e - s for s, e in zip(starts, ends))
    res = {"docs": len(docs), "text_bytes": text_bytes, "file_bytes": len(data), "table_ratio": ratio,
           "rough_seconds_make": round(t_make, 1), "by_L": []}
    for L in THRESHOLDS:
        rs, tq = ranges_for(W, fn, L)
        # a range can start inside the 6-byte separator (the index bytes of neighbours often agree): clip each range
        # to the document that contains its last byte
        clipped = []
        for a, b in rs:
            di = bisect.bisect_right(starts, b - 1) - 1
            if max(a, starts[di]) < b:
                clipped.append((max(a, starts[di]), b))
        rs = clipped
        covered = sum(b - a for a, b in rs)
        per_doc = collections.Counter()
        first_seen, keep_one_saved = {}, 0
        content_docs = collections.defaultdict(set)
        for a, b in rs:
            di = bisect.bisect_right(starts, a) - 1
            per_doc[di] += b - a
            key = data[a:b]
            if key not in first_seen:
                first_seen[key] = (a, b); keep_one_saved += b - a
            content_docs[key].add(di)
        emptied = sum(1 for di, c in per_doc.items() if c >= 0.9 * (ends[di] - starts[di]))
        row = {"L": L, "ranges": len(rs), "bytes": covered, "frac": round(covered / text_bytes, 4),
               "docs_touched": len(per_doc), "docs_90pct_removed": emptied,
               "bytes_keep_one": covered - keep_one_saved, "distinct_spans": len(first_seen),
               "rough_seconds_find": round(tq, 1)}
        if top and L == 100:
            spans = []
            for key, ds in content_docs.items():
                hosts = {urllib.parse.urlsplit(docs[d]["url"]).hostname for d in ds}
                if True:
                    s = key.decode("utf-8", "replace")
                    spans.append([len(ds), len(hosts), len(key), C.scrub(s[:240])])
            spans.sort(key=lambda x: (-x[1] * x[2]))
            row["top_spans"] = spans[:25]
            row["spans_total"] = len(spans)
        res["by_L"].append(row)
        print(stage, {k: v for k, v in row.items() if k != "top_spans"}, flush=True)
    os.remove(fn + ".table.bin")
    return res


prev = os.path.join(C.OUT, "dd_suffix.json")
out = json.load(open(prev)) if os.path.exists(prev) else {"stages": {}}  # a run on some stages keeps the others
out["tool"] = "google-research/deduplicate-text-datasets @ 4e9888ac (dedup_dataset 1.0.0)"
for stage in STAGES:
    out["stages"][stage] = measure(stage, top=(stage == "final"))
C.save("dd_suffix.json", out)
