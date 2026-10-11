"""MLX perplexity and KL divergence, scored exactly like llama-perplexity (b11146):
WikiText-2 test tokenized by llama-tokenize (same ids for every model), windows of 512 tokens,
logits at positions 256..510 predict tokens 257..511 (255 scored tokens per window), first C windows.
KLD(base || model) per scored token, base = the bf16 MLX model.

usage: mlxenv/bin/python mlxq.py <ids.txt> <chunks> <out.json> <base_dir> <model_dir> [<model_dir> ...]
The base model's log-probs are kept per window in memory one window at a time (base and model loaded together).
"""
import json, sys, time, math
import numpy as np
import mlx.core as mx
from mlx_lm import load

ids_path, C, outp, base_dir = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
models = sys.argv[5:]
ids = json.loads(open(ids_path).read())
N, FIRST = 512, 256


def window_logprobs(model, k):
    toks = mx.array(ids[k * N:(k + 1) * N])[None]
    logits = model(toks)[0, FIRST:N - 1].astype(mx.float32)
    return logits - mx.logsumexp(logits, axis=-1, keepdims=True)


base, _ = load(base_dir)
res = {"chunks": C, "ctx": N, "scored_per_chunk": N - 1 - FIRST, "base": base_dir.rstrip('/').split('/')[-1], "models": []}
# base perplexity
nll = []
for k in range(C):
    lp = window_logprobs(base, k)
    tgt = mx.array(ids[k * N + FIRST + 1:(k + 1) * N])
    nll.append(np.array(-mx.take_along_axis(lp, tgt[:, None], axis=-1)[:, 0]))
nll = np.concatenate(nll)
res["base_ppl"] = float(math.exp(nll.mean()))
print("base ppl", res["base_ppl"], flush=True)

for md in models:
    m, _ = load(md)
    t0 = time.time()
    nlls, klds, same = [], [], []
    for k in range(C):
        lb = window_logprobs(base, k)
        lq = window_logprobs(m, k)
        tgt = mx.array(ids[k * N + FIRST + 1:(k + 1) * N])
        nlls.append(np.array(-mx.take_along_axis(lq, tgt[:, None], axis=-1)[:, 0]))
        kl = mx.sum(mx.exp(lb) * (lb - lq), axis=-1)
        klds.append(np.array(kl))
        same.append(np.array(mx.argmax(lb, axis=-1) == mx.argmax(lq, axis=-1)))
    nl = np.concatenate(nlls); kd = np.concatenate(klds); sm = np.concatenate(same)
    r = {"model": md.rstrip('/').split('/')[-1], "ppl": float(math.exp(nl.mean())),
         "kld_mean": float(kd.mean()), "kld_median": float(np.median(kd)), "kld_p99": float(np.percentile(kd, 99)),
         "same_top_pct": float(sm.mean() * 100), "n_tokens": int(len(nl)), "secs": time.time() - t0}
    print(r, flush=True)
    res["models"].append(r)
    del m
    mx.clear_cache()
    json.dump(res, open(outp, "w"), indent=1)
json.dump(res, open(outp, "w"), indent=1)
