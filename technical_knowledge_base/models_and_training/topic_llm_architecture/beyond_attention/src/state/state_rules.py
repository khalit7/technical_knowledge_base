"""Write the same (key, value) pairs into one head's state under five update rules, then read each key back.

This is the Python reference for the Reading animation "One state, five write rules" (parts/23_js_rd_write.js
ports it line by line; check_data.py compares the two). Pure Python, float64, a seeded mulberry32 generator that the
JavaScript copies exactly, so both draw the same vectors.

Rules (S is d_v x d_k; a write stores value v under key k; a read with query q returns S q):
  softmax  keep every (k, v) (a KV cache); read = sum_j softmax(beta q.k_j) v_j, beta = 8
  linear   S <- S + v k^T                                     (Katharopoulos et al. 2020, no feature map)
  decay    S <- a S + v k^T, a = 0.9                           (scalar decay: RetNet, Mamba-2 style)
  delta    S <- S + b (v - S k) k^T, b = 1                     (DeltaNet: replace what k held)
  gated    S <- a S; S <- S + b (v - S k) k^T                  (Gated DeltaNet, as transformers' Qwen3-Next loop)
Keys are unit vectors (Gated DeltaNet and Kimi Linear L2-normalise q and k). Score per word: cosine between what is
read with that word's key and the value most recently written under it.
"""
import json, math, sys

WRITES = ["Roxy", "hill", "icy", "climb", "Billy", "sad", "tree", "rock", "cold", "slide", "Roxy", "hill"]
RULES = ["softmax", "linear", "decay", "delta", "gated"]


def mulberry32(seed):
    s = seed & 0xFFFFFFFF
    def nxt():
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        t = s
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


def unit_vectors(n, d, rnd):
    out = []
    for _ in range(n):
        v = []
        for _ in range(d):                       # Box-Muller
            u1 = max(rnd(), 1e-12); u2 = rnd()
            v.append(math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2))
        nrm = math.sqrt(sum(x * x for x in v)); out.append([x / nrm for x in v])
    return out


def run(dk=8, rule="delta", writes=WRITES, seed=1, a=0.9, b=1.0, beta=8.0):
    words = sorted(set(writes), key=writes.index)
    rnd = mulberry32(seed)
    keys = dict(zip(words, unit_vectors(len(words), dk, rnd)))
    vals = unit_vectors(len(writes), dk, rnd)                # d_v = d_k
    S = [[0.0] * dk for _ in range(dk)]; cache = []; states = []
    for t, w in enumerate(writes):
        k, v = keys[w], vals[t]
        if rule == "softmax":
            cache.append((k, v))
        else:
            if rule in ("decay", "gated"):
                S = [[a * x for x in row] for row in S]
            if rule in ("delta", "gated"):
                Sk = [sum(S[i][j] * k[j] for j in range(dk)) for i in range(dk)]
                e = [b * (v[i] - Sk[i]) for i in range(dk)]
            else:
                e = v
            S = [[S[i][j] + e[i] * k[j] for j in range(dk)] for i in range(dk)]
        states.append([row[:] for row in S])
    latest = {w: vals[t] for t, w in enumerate(writes)}
    cos = {}
    for w in words:
        q = keys[w]
        if rule == "softmax":
            sc = [beta * sum(qi * ki for qi, ki in zip(q, k)) for k, _ in cache]
            mx = max(sc); ex = [math.exp(s - mx) for s in sc]; z = sum(ex)
            r = [sum(ex[j] / z * cache[j][1][i] for j in range(len(cache))) for i in range(dk)]
        else:
            r = [sum(S[i][j] * q[j] for j in range(dk)) for i in range(dk)]
        nr = math.sqrt(sum(x * x for x in r)) or 1e-12
        cos[w] = sum(x * y for x, y in zip(r, latest[w])) / nr
    return {"cos": cos, "mean": sum(cos.values()) / len(cos), "state_last": states[-1]}


if __name__ == "__main__":
    out = {"writes": WRITES, "rules": {}}
    for dk in (4, 8, 16, 32):
        for rl in RULES:
            r = run(dk=dk, rule=rl)
            out["rules"][f"{rl}_d{dk}"] = {"cos": {k: round(v, 6) for k, v in r["cos"].items()}, "mean": round(r["mean"], 6)}
    for rl in RULES:
        print(rl, " ".join(f"d{dk}={out['rules'][f'{rl}_d{dk}']['mean']:.3f}" for dk in (4, 8, 16, 32)))
    json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else "state_rules.json", "w"), indent=1)
