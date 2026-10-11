"""Exactness test of speculative sampling with real models.
Target Qwen3-1.7B-4bit, draft Qwen3-0.6B-4bit (MLX), temperature T, top-k 50 applied to both.
Draws N sequences of L output tokens with each verification rule and records them; the exact target
probability of every sequence category is computed from the same cached distributions (stats.py tests them).
Tokens are drawn lazily (a draft token only when its position is reached), which is equivalent in distribution
to drawing all k first, because tokens 1..L depend only on draft positions 1..L.
usage: exact.py <models dir> <out json> <prompt name> [N] [k] [L] [T]"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from common import *

MD, OUT, PNAME = sys.argv[1], sys.argv[2], sys.argv[3]
N = int(sys.argv[4]) if len(sys.argv) > 4 else 20000
K_DRAFT = int(sys.argv[5]) if len(sys.argv) > 5 else 3
L = int(sys.argv[6]) if len(sys.argv) > 6 else 4
T = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
tm, dm, tok = load_pair(MD)
ids = chat_ids(tok, PROMPTS[PNAME])
P, Q = Dist(tm, ids, T), Dist(dm, ids, T)
rng = np.random.default_rng(12345)

def draw(d):
    return int(d[0][np.searchsorted(np.cumsum(d[1]), rng.random() * d[1].sum(), side="right").clip(0, len(d[0]) - 1)])

def prob(d, t):
    m = d[0] == t
    return float(d[1][m][0]) if m.any() else 0.0

def residual(p, q):
    pd, qd = as_dict(p), as_dict(q)
    keys = list(pd)
    r = np.array([max(0.0, pd[t] - qd.get(t, 0.0)) for t in keys])
    return (np.array(keys), r / r.sum())

def run(variant):
    """returns L tokens and per-step accepted counts"""
    out, steps = [], []
    while len(out) < L:
        acc = 0; done = False
        for i in range(K_DRAFT):
            pre = out
            p, q = P(pre), Q(pre)
            if variant == "target":
                out.append(draw(p)); done = True; break
            if variant in ("leviathan", "bug_resample_p"):
                d = draw(q)
                if rng.random() < min(1.0, prob(p, d) / prob(q, d)):
                    out.append(d); acc += 1
                else:
                    out.append(draw(residual(p, q) if variant == "leviathan" else p)); done = True
            elif variant in ("sample_compare", "greedy_compare"):
                d = draw(q) if variant == "sample_compare" else int(q[0][0])
                t = draw(p)
                out.append(t)
                if t == d: acc += 1
                else: done = True
            if done or len(out) >= L: break
        if not done and len(out) < L:
            out.append(draw(P(out)))  # bonus token from the target after k accepted drafts
        steps.append(acc)
    return out[:L], steps

res = {"prompt": PNAME, "N": N, "k": K_DRAFT, "L": L, "T": T, "K": 50,
       "target": "mlx Qwen3-1.7B-4bit", "draft": "mlx Qwen3-0.6B-4bit", "variants": {}}
for v in ["target", "leviathan", "sample_compare", "greedy_compare", "bug_resample_p"]:
    t0 = time.time(); seqs = []; accs = []
    for n in range(N):
        s, st = run(v); seqs.append(s); accs.extend(st)
    res["variants"][v] = {"seqs": seqs, "acc_per_step": accs, "secs": time.time() - t0}
    print(v, "done", round(time.time() - t0, 1), "s, calls", P.calls, Q.calls, flush=True)

cats = []
def expand(pre, pr):
    if len(pre) == L:
        cats.append((pre, pr)); return
    ids_, ps = P(pre)
    for t, x in zip(ids_.tolist(), ps.tolist()):
        if pr * x * N >= 5: expand(pre + [t], pr * x)
expand([], 1.0)
res["cats"] = [[c, p] for c, p in cats]
res["calls"] = [P.calls, Q.calls]
p0, q0 = P([]), Q([])
keys = list(dict.fromkeys(p0[0][:12].tolist() + q0[0][:12].tolist()))
res["first"] = [{"id": t, "tok": tok.decode([t]), "p": prob(p0, t), "q": prob(q0, t)} for t in keys]
res["tokstr"] = {}
for v in res["variants"].values():
    for s in v["seqs"][:2000]:
        for t in s: res["tokstr"].setdefault(str(t), tok.decode([t]))
for c, _ in cats:
    for t in c: res["tokstr"].setdefault(str(t), tok.decode([t]))
json.dump(res, open(OUT, "w"))
print("cats", len(cats), "mass", sum(p for _, p in cats))
