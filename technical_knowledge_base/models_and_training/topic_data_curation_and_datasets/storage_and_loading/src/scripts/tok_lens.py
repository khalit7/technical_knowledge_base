"""Token lengths (Qwen3 tokenizer, no special tokens) of the first N rows of a parquet file, plus rough tokenizer
throughput. Deterministic lengths; the timing is rough (shared machine, low priority, RAYON_NUM_THREADS threads).
  RAYON_NUM_THREADS=4 nice -n 15 <venv>/bin/python -I tok_lens.py <parquet> <N> <tokenizer.json> <out.json>
"""
import json, os, sys, time
import numpy as np, pyarrow.parquet as pq
from tokenizers import Tokenizer
src, N, tokp, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
texts = pq.read_table(src, columns=["text"]).slice(0, N).column(0).to_pylist()
tok = Tokenizer.from_file(tokp)
t0 = time.perf_counter(); enc = tok.encode_batch(texts, add_special_tokens=False); dt = time.perf_counter() - t0
lens = [len(e.ids) for e in enc]
one = texts[:2000]; t1 = time.perf_counter()
for t in one: tok.encode(t, add_special_tokens=False)
d1 = time.perf_counter() - t1
T = int(sum(lens)); chars = sum(len(t) for t in texts); byts = sum(len(t.encode()) for t in texts)
res = {"n_docs": len(texts), "tokens": T, "chars": chars, "utf8_bytes": byts, "chars_per_token": chars / T, "bytes_per_token": byts / T,
       "lens": lens, "threads": int(os.environ.get("RAYON_NUM_THREADS", "0")),
       "rough_batch_tokens_per_s": T / dt, "rough_single_thread_tokens_per_s": sum(lens[:2000]) / d1}
json.dump(res, open(out, "w"))
print({k: v for k, v in res.items() if k != "lens"})
