"""Suffix arrays in depth: construction cost, tokens vs bytes, and repeated spans as the scope grows.

Uses Google's deduplicate-text-datasets (commit 4e9888ac, built by the setup agent; SA-IS construction in
src/table.rs:391-511) exactly like the root lab's dd_suffix.py: every document is preceded by 0xFF 0xFF + its 4-byte
index (the tool's load_dataset.py separator), `make` builds the array, `self-similar` + `collect` give byte ranges.

Experiments (usage: dp_sa.py tokens|scope|corpora ...):
  tokens   run0's 2,692 filtered documents as UTF-8 bytes at L = 230 bytes and as GPT-2 tokens (uint16, as the tool's
           load_dataset.py --tokenize writes them) at L = 100 bytes = 50 tokens, Lee et al.'s threshold: same spans?
  scope    the first 4,000 / 16,000 / 48,000 rows of FineWeb's CC-MAIN-2024-30 000_00000.parquet (rows are grouped by
           source WARC, so these cover a growing number of WARC files): share of bytes in repeated spans, and the cost
           of `make` (wall seconds and peak memory from /usr/bin/time -l; rough, shared machine at low priority).
  corpora  16,000 documents each of FineWeb (random row groups), FineWeb-Edu (random row groups), DCLM-baseline (first
           rows of one shard) and Nemotron-CC high-quality real (head of one part file): repeated-span share at 230 and
           500 bytes. Samples differ in how they were drawn; the page says so.
Writes ../data/out/dp_sa.json (merged across runs). Working files in $DC_SCRATCH/dp/sa/ (deleted after each run).
"""
import bisect
import gzip
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dp_common as P  # noqa: E402

BIN = os.path.join(P.C.L.scratch(), "src", "deduplicate_text_datasets", "target", "release", "dedup_dataset")
W = P.work("sa")
OUTF = os.path.join(P.OUT, "dp_sa.json")


def run(args, timed=False):
    t = time.time()
    cmd = (["/usr/bin/time", "-l"] if timed else []) + [BIN] + args
    p = subprocess.run(cmd, capture_output=True, text=True)
    assert p.returncode == 0, p.stderr[-2000:]
    rss = None
    if timed:
        m = re.search(r"(\d+)\s+maximum resident set size", p.stderr)
        rss = int(m.group(1)) if m else None
    return p.stdout, time.time() - t, rss


def write_file(name, chunks):
    """chunks: list of bytes (one per document); returns path, starts (first content byte), ends"""
    os.makedirs(W, exist_ok=True)
    data, starts, ends = bytearray(), [], []
    for i, c in enumerate(chunks):
        data += b"\xff\xff" + struct.pack("<I", i)
        starts.append(len(data))
        data += c
        ends.append(len(data))
    fn = os.path.join(W, name + ".bin")
    open(fn, "wb").write(data)
    return fn, starts, ends, bytes(data)


def ranges(fn, L, starts):
    cache = fn + f".cache{L}"
    shutil.rmtree(cache, ignore_errors=True)
    run(["self-similar", "--data-file", fn, "--length-threshold", str(L), "--cache-dir", cache, "--num-threads", "4"])
    out, _, _ = run(["collect", "--data-file", fn, "--cache-dir", cache, "--length-threshold", str(L)])
    shutil.rmtree(cache, ignore_errors=True)
    lines = out.split("\n")
    k = lines.index("out") if "out" in lines else -1
    rs = []
    for l in lines[k + 1:]:
        if not l.strip():
            continue
        a, b = map(int, l.split())
        di = bisect.bisect_right(starts, b - 1) - 1  # clip ranges that begin inside a separator
        a = max(a, starts[di])
        if a < b:
            rs.append((a, b, di))
    return rs


def span_stats(rs, data, starts, ends, step=1):
    text = sum(e - s for s, e in zip(starts, ends))
    cov = sum(b - a for a, b, _ in rs)
    first, keep = set(), 0
    per = {}
    for a, b, d in rs:
        key = data[a:b]
        if key not in first:
            first.add(key)
            keep += b - a
        per[d] = per.get(d, 0) + (b - a)
    emptied = sum(1 for d, c in per.items() if c >= 0.9 * (ends[d] - starts[d]))
    return {"text_bytes": text, "bytes": cov, "frac": round(cov / text, 4), "frac_keep_one": round((cov - keep) / text, 4),
            "docs_touched": len(per), "docs_90pct": emptied, "ranges": len(rs)}


def build(fn):
    _, t, rss = run(["make", "--data-file", fn], timed=True)
    size = os.path.getsize(fn)
    ratio = os.path.getsize(fn + ".table.bin") / size
    return {"file_bytes": size, "rough_s": round(t, 1), "peak_rss": rss, "rss_per_byte": round(rss / size, 2) if rss else None,
            "table_bytes_per_byte": round(ratio, 2)}


def cleanup():
    shutil.rmtree(W, ignore_errors=True)


def exp_tokens():
    import glob
    from tokenizers import Tokenizer
    tj = glob.glob(os.path.join(os.environ["HF_HOME"], "hub", "models--openai-community--gpt2", "snapshots", "*", "tokenizer.json"))[0]
    tok = Tokenizer.from_file(tj)  # GPT-2's byte-level BPE, the tokenizer of the tool's load_dataset.py --tokenize
    docs = [d["text"] for d in P.C.L.run0("filtered")]
    res = {}
    fnb, sb, eb, db = write_file("bytes", [t.encode("utf-8") for t in docs])
    res["bytes_build"] = build(fnb)
    rb = ranges(fnb, 230, sb)
    res["bytes_230"] = span_stats(rb, db, sb, eb)
    ids = [e.ids for e in tok.encode_batch(docs)]
    ntok = sum(len(x) for x in ids)
    res["tokens"] = ntok
    res["chars_per_token"] = round(sum(len(t) for t in docs) / ntok, 3)
    res["bytes_per_token"] = round(sum(len(t.encode()) for t in docs) / ntok, 3)
    fnt, st, et, dt = write_file("tok", [np.array(x, dtype=np.uint16).tobytes() for x in ids])
    res["tok_build"] = build(fnt)
    rt = ranges(fnt, 100, st)
    # a match may start at an odd byte offset (the tool compares bytes); count those
    res["tok_odd_starts"] = sum(1 for a, b, d in rt if (a - st[d]) % 2)
    res["tok_100"] = span_stats(rt, dt, st, et)
    # per document: share removed under each, and the agreement of the two sets of touched documents
    pb, pt = {}, {}
    for a, b, d in rb:
        pb[d] = pb.get(d, 0) + (b - a) / (eb[d] - sb[d])
    for a, b, d in rt:
        pt[d] = pt.get(d, 0) + (b - a) / (et[d] - st[d])
    both = set(pb) & set(pt)
    res["docs_bytes_only"] = len(set(pb) - set(pt))
    res["docs_tok_only"] = len(set(pt) - set(pb))
    res["docs_both"] = len(both)
    res["share_corr"] = round(float(np.corrcoef([pb.get(d, 0) for d in range(len(docs))],
                                                [pt.get(d, 0) for d in range(len(docs))])[0, 1]), 3)
    cleanup()
    return res


def fw_rows(n):
    import pyarrow.parquet as pq
    f = pq.ParquetFile(P.C.L.path("curated", "fineweb_2024-30_000_00000_full.parquet"))
    out, files = [], set()
    for rg in range(f.num_row_groups):
        t = f.read_row_group(rg, columns=["text", "file_path"])
        out += t["text"].to_pylist()
        files.update(t["file_path"].to_pylist())
        if len(out) >= n:
            break
    out = out[:n]
    return out, len(files)


def exp_scope():
    res = []
    for n in (4000, 16000, 48000):
        texts, nfiles = fw_rows(n)
        fn, s, e, d = write_file(f"fw{n}", [t.encode("utf-8") for t in texts])
        row = {"docs": n, "warc_files_upto": nfiles, "build": build(fn)}
        for L in (230, 500):
            row[f"L{L}"] = span_stats(ranges(fn, L, s), d, s, e)
        print(row, flush=True)
        res.append(row)
        cleanup()
    return res


def corpus_texts(name, n):
    import pyarrow.parquet as pq
    if name == "nemotron_high":
        out = []
        with gzip.open(P.C.L.path("nemotron_cc", "quality-high__kind-actual__kind2-actual__CC-MAIN-2024-30-part-00000.jsonl.gz"), "rt") as f:
            try:
                for line in f:
                    out.append(json.loads(line)["text"])
                    if len(out) >= n:
                        break
            except (EOFError, json.JSONDecodeError):
                pass  # head sample: the file is truncated on purpose
        return out
    fn = {"fineweb": "fineweb_2024-30_rand50k", "fineweb_edu": "fineweb_edu_2024-30_rand50k",
          "dclm": "dclm_baseline_first50k"}[name]
    t = pq.read_table(P.C.L.path("curated", fn + ".parquet"), columns=["text"])
    return t["text"].to_pylist()[:n]


def exp_corpora(n=16000):
    res = {}
    for name in ("fineweb", "fineweb_edu", "dclm", "nemotron_high"):
        texts = corpus_texts(name, n)
        fn, s, e, d = write_file(name, [t.encode("utf-8") for t in texts])
        row = {"docs": len(texts), "build": build(fn)}
        for L in (230, 500):
            row[f"L{L}"] = span_stats(ranges(fn, L, s), d, s, e)
        print(name, row, flush=True)
        res[name] = row
        cleanup()
    return res


out = json.load(open(OUTF)) if os.path.exists(OUTF) else {}
out["tool"] = "google-research/deduplicate-text-datasets @ 4e9888ac"
for what in sys.argv[1:]:
    t0 = time.time()
    out[what] = {"tokens": exp_tokens, "scope": exp_scope, "corpora": exp_corpora}[what]()
    print(what, "done", round(time.time() - t0), "s", flush=True)
    P.save("dp_sa.json", out)
