"""Long context on this laptop, from the root's recorded generator calls (no new run). Deterministic, CPU.

1. Prefill time model fitted to every recorded Qwen3-1.7B call of the root's Agentic lab (llama-server, Metal,
   prompt cache on; timings are llama-server's own prompt_ms and predicted_ms, measured under the root's bench lock):
       prefill_ms = a + b * n_new + c * n_new * (n_ctx - n_new / 2) / 1000
   n_new = tokens actually prefilled (the rest came from the prompt cache), n_ctx = whole prompt. The third term is
   attention: each new token attends to everything before it. Fitted by least squares on half the calls (by key hash),
   checked on the other half.
2. Decode time per output token against prompt length: ms_per_token = d + e * n_ctx / 1000.
3. KV cache bytes per token from the Qwen3 configs (2 x layers x KV heads x head dim x 2 bytes at fp16).
4. Accuracy against prompt tokens for the recorded strategies that only differ in how much text they read.
Writes ../data/longctx.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json

import numpy as np

import arlib as A

recs = []
for name in ("closed", "single", "react", "decomp", "longctx"):
    for r in A.jl(A.L.path("agt", "gen", "1.7b_%s.jsonl" % name)):
        if r.get("n_in_new") and r.get("prompt_ms"):
            recs.append(r)
n_new = np.array([r["n_in_new"] for r in recs], float)
n_ctx = np.array([r["n_in"] for r in recs], float)
pms = np.array([r["prompt_ms"] for r in recs], float)
train = np.array([int(r["key"][-1], 16) % 2 == 0 for r in recs])
F = np.stack([np.ones_like(n_new), n_new, n_new * (n_ctx - n_new / 2) / 1000], 1)
coef, *_ = np.linalg.lstsq(F[train], pms[train], rcond=None)
pred = F @ coef
test = ~train
mape = float(np.mean(np.abs(pred[test] - pms[test]) / pms[test]))
big = test & (n_new > 2000)
mape_big = float(np.mean(np.abs(pred[big] - pms[big]) / pms[big])) if big.any() else None
# decode
dec = [(r["n_in"], r["gen_ms"] / r["n_out"]) for r in recs if r.get("n_out", 0) >= 8 and r.get("gen_ms")]
D = np.array(dec)
dcoef, *_ = np.linalg.lstsq(np.stack([np.ones(len(D)), D[:, 0] / 1000], 1), D[:, 1], rcond=None)
# points for the page's validation chart: a deterministic sample of the held-out calls
idx = [i for i in range(len(recs)) if test[i]]
idx = sorted(idx, key=lambda i: recs[i]["key"])[:160]
pts = [[int(n_new[i]), int(n_ctx[i]), round(float(pms[i]), 1)] for i in idx]

cfg = {}
for m in ("Qwen3-1.7B", "Qwen3-4B"):
    c = json.load(open(os.path.join(A.L.scratch(), "..", "inf", "models", "hf", m, "config.json")))
    cfg[m] = {k: c[k] for k in ("num_hidden_layers", "num_key_value_heads", "head_dim", "max_position_embeddings")}
    cfg[m]["kv_bytes_per_token_fp16"] = 2 * c["num_hidden_layers"] * c["num_key_value_heads"] * c["head_dim"] * 2

O = A.load_data("outcomes.json")
acc = {}
for s in ("single_k2", "single_k5", "single_k10", "longctx", "longctx_tokens8000"):
    R = O["res"][s]
    acc[s] = {"f1": A.r3(np.mean(R["f1"])), "tok": round(float(np.mean(R["tok"])), 1), "sec": A.r3(np.mean(R["sec"])),
              "both": int(sum(1 for x in R["seen"] if x == 2))}
res = {"n_calls": len(recs), "n_train": int(train.sum()), "n_test": int(test.sum()), "coef": [round(float(x), 5) for x in coef],
       "mape_test": A.r3(mape), "mape_test_big": A.r3(mape_big) if mape_big is not None else None, "n_big": int(big.sum()),
       "max_ctx": int(n_ctx.max()), "max_new": int(n_new.max()),
       "decode_coef": [round(float(x), 4) for x in dcoef], "n_decode": len(D), "pts": pts, "cfg": cfg, "acc": acc}
A.save("longctx.json", res)
print({k: v for k, v in res.items() if k != "pts"})
for n in (500, 1500, 8000, 16000, 32000):
    print(n, "tokens fresh: %.0f ms" % (coef[0] + coef[1] * n + coef[2] * n * n / 2 / 1000))
