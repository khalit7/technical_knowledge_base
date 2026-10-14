"""End-to-end latency of one RAG request on SciFact, stage by stage (bench lock; Apple M1 Pro).
40 test claims (every 7th sorted id, the same claims as the root's Pipeline lab latency.py), batch 1, 3 passes after a
warm-up. Stages, timed in one process plus llama-server:
  embed    Qwen3-Embedding-0.6B encodes the claim (MPS, fp16, with its instruction)
  search   exact inner product over 5,183 x 1,024 float32 vectors, top 30 (numpy)
  rerank   ms-marco MiniLM-L6 cross-encoder scores the 30 (MPS, one batch)
  generate Qwen3-1.7B Q4_K_M in llama-server reads the top 5 abstracts and the claim; time to first streamed token,
           and to the end of 64 output tokens; cache_prompt off (every request prefills its whole prompt)
Output: data/e2e_latency.json"""
import gc
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import torch
from common import L, loadavg, save
import llm

corpus, queries, qrels = L.beir("scifact")
qs = sorted(qrels["test"])[::7][:40]
ids, X = L.embeddings("scifact", "qwen3-emb-0.6b"); X = np.ascontiguousarray(np.asarray(X, dtype=np.float32))
enc = L.encoder("qwen3-emb-0.6b"); pref = L.query_prefix("qwen3-emb-0.6b", "scifact")
from sentence_transformers import CrossEncoder
ce = CrossEncoder(L.model_dir("ce-minilm-l6"), device="mps", max_length=512)
llm.start("qwen3-1.7b")
SYS = "Decide whether the documents support or refute the claim, citing document numbers. Be brief."


def one(q):
    t = {}
    t0 = time.perf_counter()
    v = enc.encode([queries[q]], prompt=pref, normalize_embeddings=True, convert_to_numpy=True)[0]
    t["embed"] = time.perf_counter() - t0
    t1 = time.perf_counter()
    s = X @ v; k = np.argpartition(-s, 30)[:30]; k = k[np.argsort(-s[k])]
    t["search"] = time.perf_counter() - t1
    t2 = time.perf_counter()
    sc = ce.predict([(queries[q], L.doc_text(corpus[ids[j]])) for j in k], batch_size=30, show_progress_bar=False)
    torch.mps.synchronize()
    top5 = [ids[j] for j in k[np.argsort(-sc)[:5]]]
    t["rerank"] = time.perf_counter() - t2
    ctx = "\n\n".join("[%d] %s" % (i + 1, L.doc_text(corpus[d])) for i, d in enumerate(top5))
    g = llm.stream_ttft([{"role": "system", "content": SYS}, {"role": "user", "content": "Documents:\n" + ctx + "\n\nClaim: " + queries[q]}], 64, cache_prompt=False)
    t["ttft"] = g["ttft_ms"] / 1000; t["gen_total"] = g["total_ms"] / 1000
    t["wall_to_first_token"] = time.perf_counter() - t0 - (g["total_ms"] - g["ttft_ms"]) / 1000
    return {k2: round(1000 * v2, 2) for k2, v2 in t.items()} | {"prompt_n": g["prompt_n"], "gen_tps": g["gen_tps"]}


res = {"queries": qs, "loadavg": [["start", loadavg()]], "passes": []}
one(qs[0]); one(qs[1])  # warm-up
for p in range(3):
    rows = [one(q) | {"qid": q} for q in qs]
    res["passes"].append(rows); res["loadavg"].append(["after pass %d" % (p + 1), loadavg()])
    print("pass", p + 1, {k: round(float(np.median([r[k] for r in rows])), 1) for k in ("embed", "search", "rerank", "ttft", "wall_to_first_token", "gen_total")}, flush=True)
allr = [r for rows in res["passes"] for r in rows]
res["summary"] = {k: {"p50": round(float(np.percentile([r[k] for r in allr], 50)), 1), "p90": round(float(np.percentile([r[k] for r in allr], 90)), 1),
                      "p99": round(float(np.percentile([r[k] for r in allr], 99)), 1),
                      "median_per_pass": [round(float(np.median([r[k] for r in rows])), 1) for rows in res["passes"]]}
                  for k in ("embed", "search", "rerank", "ttft", "wall_to_first_token", "gen_total", "prompt_n")}
llm.stop()
res["when"] = time.strftime("%Y-%m-%d %H:%M")
save("e2e_latency.json", res)
