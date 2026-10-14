"""Storage and loading: write the same N documents in each format and record the bytes; tokenize them and record
what a token shard costs and how much of each context window is real text when documents are padded or packed.
Run with the topic's shared venv, outside the repo:
  <venv>/bin/python -I storage_sizes.py <input .parquet|.jsonl|.jsonl.gz|.jsonl.zst> <N> <tokenizer.json> <workdir> <out.json> [source label]
Deterministic (file sizes, token counts); no timings."""
import gzip, io, json, math, os, sys, shutil
import numpy as np, pyarrow as pa, pyarrow.parquet as pq, zstandard
from tokenizers import Tokenizer

src, N, tokp, work, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
label = sys.argv[6] if len(sys.argv) > 6 else os.path.basename(src)
shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
if src.endswith(".parquet"):
    rows = pq.read_table(src).slice(0, N).to_pylist()
else:
    op = gzip.open if src.endswith(".gz") else (lambda p, m: io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(open(p, "rb")), encoding="utf-8")) if src.endswith(".zst") else open
    rows = []
    with op(src, "rt") as f:
        for line in f:
            rows.append(json.loads(line))
            if len(rows) >= N: break
N = len(rows)
cols = sorted(rows[0].keys())
P = lambda n: os.path.join(work, n)
jl = "".join(json.dumps(r, ensure_ascii=False, default=str) + "\n" for r in rows).encode()
open(P("docs.jsonl"), "wb").write(jl)
with gzip.open(P("docs.jsonl.gz"), "wb", compresslevel=6) as f: f.write(jl)
open(P("docs.jsonl.zst"), "wb").write(zstandard.ZstdCompressor(level=3).compress(jl))
tab = pa.Table.from_pylist(rows)
pq.write_table(tab, P("docs.snappy.parquet"), compression="snappy")
pq.write_table(tab, P("docs.zstd.parquet"), compression="zstd")
pq.write_table(tab.select(["text"]), P("text_only.zstd.parquet"), compression="zstd")
tok = Tokenizer.from_file(tokp)
V = tok.get_vocab_size(with_added_tokens=True)
ids = [tok.encode(r["text"], add_special_tokens=False).ids for r in rows]
lens = [len(x) for x in ids]
flat = np.concatenate([np.asarray(x, dtype=np.uint32) for x in ids])
dt = np.uint16 if V <= 65536 else np.uint32
flat.astype(dt).tofile(P("tokens.bin"))
np.asarray(np.cumsum(lens), dtype=np.uint64).tofile(P("tokens.index"))
sz = lambda n: os.path.getsize(P(n))
text_bytes = sum(len(r["text"].encode()) for r in rows)
sizes = [
    {"fmt": "jsonl", "label": "JSONL, uncompressed", "bytes": sz("docs.jsonl"), "kind": "doc"},
    {"fmt": "jsonl.gz", "label": "JSONL + gzip (level 6)", "bytes": sz("docs.jsonl.gz"), "kind": "doc"},
    {"fmt": "jsonl.zst", "label": "JSONL + zstd (level 3)", "bytes": sz("docs.jsonl.zst"), "kind": "doc"},
    {"fmt": "parquet.snappy", "label": "Parquet, snappy", "bytes": sz("docs.snappy.parquet"), "kind": "doc"},
    {"fmt": "parquet.zstd", "label": "Parquet, zstd", "bytes": sz("docs.zstd.parquet"), "kind": "doc"},
    {"fmt": "parquet.text", "label": "Parquet, zstd, text column only", "bytes": sz("text_only.zstd.parquet"), "kind": "doc"},
    {"fmt": "bin", "label": "Token shard (%s) + index" % np.dtype(dt).name, "bytes": sz("tokens.bin") + sz("tokens.index"), "kind": "tok"},
]
T = int(sum(lens))
wins = []
for L in (2048, 4096, 8192):
    n_pad = sum(math.ceil(n / L) for n in lens if n)
    n_pack = math.ceil((T + N) / L)
    wins.append({"L": L, "n_pad": n_pad, "pad_frac": 1 - T / (n_pad * L), "n_pack": n_pack, "pack_fill": (T + N) / (n_pack * L)})
res = {"n_docs": N, "source": label, "columns": cols, "text_bytes": text_bytes, "tokens": T, "tokenizer": os.path.basename(os.path.dirname(tokp)) + " tokenizer, vocabulary %d" % V,
       "vocab": V, "dtype": np.dtype(dt).name, "sizes": sizes, "lens_quantiles": {q: int(np.quantile(lens, q)) for q in (0.1, 0.5, 0.9, 0.99)},
       "pack": {"windows": wins, "demo": {"L": 2048, "lens": lens[:12]}}}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: res[k] for k in ("n_docs", "tokens", "dtype", "vocab", "lens_quantiles")}), [(s["label"], s["bytes"]) for s in sizes], wins)
