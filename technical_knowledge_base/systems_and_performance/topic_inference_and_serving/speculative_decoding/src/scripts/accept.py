"""Speculative decoding written from scratch on MLX with KV caches (the same cache handling as mlx-lm),
real Qwen3 models: target 1.7B-4bit, draft 0.6B-4bit. Records, for every step, the number of accepted draft
tokens and alpha_i = sum_x min(p_i(x), q_i(x)) at every position the step examined (T > 0), or
1[argmax p == argmax q] (T = 0); for k = 4, seed 0 also the step's tokens. usage: accept.py <models> <out json> [max_tokens]"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, mlx.core as mx
from common import *
from mlx_lm.models.cache import make_prompt_cache, trim_prompt_cache

MD, OUT = sys.argv[1], sys.argv[2]
MAXT = int(sys.argv[3]) if len(sys.argv) > 3 else 256
tm, dm, tok = load_pair(MD)
EOS = set(tok.eos_token_ids)
TOPK = 50

def dist(lg, T):
    lg = np.array(lg.astype(mx.float32), dtype=np.float64)
    if T == 0:
        i = int(np.argmax(lg)); return np.array([i]), np.array([1.0])
    ids = np.argpartition(-lg, TOPK)[:TOPK]; z = lg[ids] / T; z -= z.max(); p = np.exp(z); p /= p.sum()
    return ids, p

def generate(prompt_ids, k, T, seed, keep_text=False):
    rng = np.random.default_rng(seed)
    def draw(d): return int(d[0][min(np.searchsorted(np.cumsum(d[1]), rng.random(), side="right"), len(d[0]) - 1)])
    def pr(d, t):
        m = d[0] == t; return float(d[1][m][0]) if m.any() else 0.0
    tc, dc = make_prompt_cache(tm), make_prompt_cache(dm)
    x = mx.array(prompt_ids[:-1])[None]
    tm(x, cache=tc); dm(x, cache=dc); mx.eval([c.state for c in tc + dc])
    y = [prompt_ids[-1]]; ydr = [prompt_ids[-1]]
    out, steps = [], []
    while len(out) < MAXT:
        kk = min(k, MAXT - len(out))
        drafts, qs = [], []
        inp = ydr
        for i in range(kk):
            lg = dm(mx.array(inp)[None], cache=dc)[0, -1]
            q = dist(lg, T); qs.append(q)
            d = int(q[0][0]) if T == 0 else draw(q)
            drafts.append(d); inp = [d]
        lgs = tm(mx.array(y + drafts)[None], cache=tc)[0]
        mx.eval(lgs)
        ps = [dist(lgs[i], T) for i in range(kk + 1)]
        n = 0; new = None; alphas = []
        for i in range(kk):
            p, q = ps[i], qs[i]
            pd = dict(zip(p[0].tolist(), p[1].tolist())); qd = dict(zip(q[0].tolist(), q[1].tolist()))
            a = (1.0 if int(p[0][0]) == int(q[0][0]) else 0.0) if T == 0 else sum(min(v, qd.get(t, 0.0)) for t, v in pd.items())
            alphas.append(a)
            d = drafts[i]
            ok = int(p[0][0]) == d if T == 0 else rng.random() < min(1.0, pr(p, d) / pr(q, d))
            if ok:
                n += 1
            else:
                if T == 0:
                    new = int(p[0][0])
                else:
                    r = {t: max(0.0, v - qd.get(t, 0.0)) for t, v in pd.items()}
                    s = sum(r.values()); keys = list(r); w = np.array([r[t] for t in keys]) / s
                    new = int(keys[min(np.searchsorted(np.cumsum(w), rng.random(), side="right"), len(keys) - 1)])
                break
        if new is None:
            new = int(ps[kk][0][0]) if T == 0 else draw(ps[kk])
        acc = drafts[:n] + [new]
        steps.append({"n": n, "k": kk, "a": [round(v, 4) for v in alphas]})
        if keep_text: steps[-1]["t"] = [tok.decode([x]) for x in acc]
        out.extend(acc)
        trim_prompt_cache(tc, kk - n)
        trim_prompt_cache(dc, max(kk - n - 1, 0))
        y = [new]; ydr = [drafts[-1], new] if n == kk else [new]
        if any(t in EOS for t in acc):
            break
    return out, steps

res = {"target": "mlx Qwen3-1.7B-4bit", "draft": "mlx Qwen3-0.6B-4bit", "topk": TOPK, "max_tokens": MAXT, "runs": []}
for name in ["code_edit", "summarize", "story", "list", "sea", "animal"]:
    ids = chat_ids(tok, PROMPTS[name])
    for T in (0.0, 1.0):
        for k in (1, 2, 3, 4, 6, 8):
            for seed in ((0,) if T == 0 else (0, 1, 2)):
                t0 = time.time()
                out, steps = generate(ids, k, T, 1000 * k + seed, keep_text=(k == 4 and seed == 0))
                res["runs"].append({"prompt": name, "T": T, "k": k, "seed": seed, "n_out": len(out), "steps": steps,
                                    "text": tok.decode(out) if seed == 0 else None, "secs": round(time.time() - t0, 2)})
                print(name, T, k, seed, len(out), len(steps), round(len(out) / len(steps), 3), round(time.time() - t0, 1), flush=True)
json.dump(res, open(OUT, "w"))
