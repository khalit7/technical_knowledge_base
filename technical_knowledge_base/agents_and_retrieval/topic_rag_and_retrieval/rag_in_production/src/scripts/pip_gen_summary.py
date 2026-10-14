"""Summarise the root Pipeline lab's generator records (no new runs, no lock): llama-server's own prefill and decode
rates for Qwen3-1.7B Q4_K_M, by prompt length, from its cache file $RAG_SCRATCH/pipe/gen/e2e.jsonl (records whose
prompt was prefilled from scratch, n_in_new > 0). Output: data/pip_gen_summary.json"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from common import L, save

R = [json.loads(l) for l in open(os.path.join(L.scratch(), "pipe", "gen", "e2e.jsonl"))]
R = [r for r in R if r.get("n_in_new", 0) > 0 and r.get("prompt_tps")]
bins = [(0, 200), (200, 500), (500, 1000), (1000, 2000), (2000, 4000)]
rows = []
for lo, hi in bins:
    s = [r for r in R if lo <= r["n_in_new"] < hi]
    if s:
        rows.append({"tokens": [lo, hi], "n": len(s), "median_prompt_tokens": float(np.median([r["n_in_new"] for r in s])),
                     "prefill_tps_p50": round(float(np.median([r["prompt_tps"] for r in s])), 1),
                     "decode_tps_p50": round(float(np.median([r["gen_tps"] for r in s])), 1)})
E2 = json.load(open(os.path.join(L.HERE, "..", "pipe", "out", "e2e.json")))["cost"]
G2 = json.load(open(os.path.join(L.HERE, "..", "pipe", "out", "e2e.json")))["gen_cost"]
save("pip_gen_summary.json", {"run": {"when": E2["when"], "loadavg_before": E2["loadavg_before"], "loadavg_after": E2["loadavg_after"],
                                      "answers": G2["answers"], "prompt_tps_median": G2["prompt_tps_median"], "gen_tps_median": G2["gen_tps_median"],
                                      "model": E2["model"]},"source": "root src/pipe/gen.py records (Qwen3-1.7B Q4_K_M, llama-server, temperature 0), file gen/e2e.jsonl",
                              "records": len(R), "rows": rows})
print(rows)
