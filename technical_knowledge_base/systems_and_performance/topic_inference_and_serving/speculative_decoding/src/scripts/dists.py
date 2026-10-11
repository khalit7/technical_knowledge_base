"""Real p (target Qwen3-1.7B-4bit) and q (draft Qwen3-0.6B-4bit) at every position of one text per prompt.
The text is the target's own sample at temperature 1 (top-k 50, seed 7). One teacher-forced forward pass per model.
For each position: alpha = sum min(p, q) (T = 1, top-k 50 on both), sum p*q (sample-and-compare acceptance),
p(argmax q) (greedy-draft acceptance), the union of the top 8 tokens of p and q, and the full top-50 union.
usage: dists.py <models> <out json>"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, mlx.core as mx
from common import *
from mlx_lm import generate
from mlx_lm.sample_utils import make_sampler

MD, OUT = sys.argv[1], sys.argv[2]
tm, dm, tok = load_pair(MD)
K = 50
def topk(lg):
    ids = np.argpartition(-lg, K)[:K]; z = lg[ids] - lg[ids].max(); p = np.exp(z); p /= p.sum()
    return dict(zip(ids.tolist(), p.tolist()))
res = {"target": "mlx Qwen3-1.7B-4bit", "draft": "mlx Qwen3-0.6B-4bit", "T": 1.0, "topk": K, "texts": {}}
for name in ["story", "code_edit", "list", "summarize"]:
    ids = chat_ids(tok, PROMPTS[name])
    mx.random.seed(7)
    text = generate(tm, tok, ids, max_tokens=120, sampler=make_sampler(temp=1.0, top_k=K))
    out = tok.encode(text, add_special_tokens=False)
    seq = ids + out
    lp = np.array(tm(mx.array(seq)[None])[0].astype(mx.float32))
    lq = np.array(dm(mx.array(seq)[None])[0].astype(mx.float32))
    rows = []
    for i in range(len(out)):
        r = len(ids) - 1 + i
        p, q = topk(lp[r].astype(np.float64)), topk(lq[r].astype(np.float64))
        a = sum(min(v, q.get(t, 0.0)) for t, v in p.items())
        spq = sum(v * q.get(t, 0.0) for t, v in p.items())
        qa = max(q, key=q.get)
        top = list(dict.fromkeys(sorted(p, key=p.get, reverse=True)[:8] + sorted(q, key=q.get, reverse=True)[:8]))
        rows.append({"tok": tok.decode([out[i]]), "a": round(a, 4), "spq": round(spq, 4), "pg": round(p.get(qa, 0.0), 4),
                     "top": [[tok.decode([t]), round(p.get(t, 0.0), 4), round(q.get(t, 0.0), 4)] for t in top],
                     "full": [[tok.decode([t]), round(p.get(t, 0.0), 6), round(q.get(t, 0.0), 6)] for t in sorted(set(p) | set(q), key=lambda t: -(p.get(t, 0.0) + q.get(t, 0.0)))]})
    res["texts"][name] = rows
    print(name, len(rows), "mean alpha %.3f mean spq %.3f mean pg %.3f" % (np.mean([r["a"] for r in rows]), np.mean([r["spq"] for r in rows]), np.mean([r["pg"] for r in rows])), flush=True)
json.dump(res, open(OUT, "w"))
