"""Chain drafts against tree drafts at the same verification budget (temperature 0), real models.
Target Qwen3-1.7B-4bit gives the greedy continuation g; at every 4th position t the draft Qwen3-0.6B-4bit builds
(a) a chain: its own greedy continuation (8 tokens), and (b) a tree in the style of EAGLE-2: expand the top 4
children of the best 4 nodes per depth by cumulative draft probability, up to depth 6, then keep the M nodes with
the highest cumulative probability. Accepted length = longest root path that matches g. usage: tree.py <models> <out>"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, mlx.core as mx
from common import *
from mlx_lm.models.cache import make_prompt_cache

MD, OUT = sys.argv[1], sys.argv[2]
tm, dm, tok = load_pair(MD)
B, W, D, MS, DC = 4, 4, 6, (4, 8, 16, 32), 8

def greedy(ids, n):
    c = make_prompt_cache(tm); lg = tm(mx.array(ids)[None], cache=c)[0, -1]; out = []
    for _ in range(n):
        t = int(mx.argmax(lg).item()); out.append(t)
        if t in tok.eos_token_ids: break
        lg = tm(mx.array([[t]]), cache=c)[0, -1]
    return out

def draft_probs(ctx, paths):
    x = mx.array([ctx + p for p in paths])
    lg = dm(x)[:, -1].astype(mx.float32)
    pr = mx.softmax(lg, axis=-1); mx.eval(pr)
    return np.array(pr)

res = {"target": "mlx Qwen3-1.7B-4bit", "draft": "mlx Qwen3-0.6B-4bit", "B": B, "W": W, "D": D, "stride": 4, "prompts": {}, "examples": []}
for name in ["code_edit", "summarize", "story", "list"]:
    ids = chat_ids(tok, PROMPTS[name]); t0 = time.time()
    g = greedy(ids, 200)
    rows = []
    for t in range(0, len(g) - DC, 4):
        ctx = ids + g[:t]
        nodes = [{"path": [], "cp": 1.0, "parent": -1}]
        frontier = [0]
        for depth in range(D):
            pr = draft_probs(ctx, [nodes[i]["path"] for i in frontier])
            cand = []
            for row, i in enumerate(frontier):
                top = np.argsort(-pr[row])[:B]
                for r, tk in enumerate(top):
                    cand.append({"path": nodes[i]["path"] + [int(tk)], "cp": nodes[i]["cp"] * float(pr[row][tk]),
                                 "p": float(pr[row][tk]), "parent": i, "rank": r})
            start = len(nodes); nodes.extend(cand)
            order = sorted(range(start, len(nodes)), key=lambda j: -nodes[j]["cp"])
            frontier = order[:W]
        chain = []
        cc = make_prompt_cache(dm); lg = dm(mx.array(ctx)[None], cache=cc)[0, -1]
        for depth in range(DC):
            nt = int(mx.argmax(lg).item()); chain.append(nt)
            lg = dm(mx.array([[nt]]), cache=cc)[0, -1]
        match_chain = 0
        while match_chain < DC and chain[match_chain] == g[t + match_chain]: match_chain += 1
        rec = {"t": t, "chain": match_chain}
        cands = sorted(range(1, len(nodes)), key=lambda j: -nodes[j]["cp"])
        for M in MS:
            best = 0
            for j in cands[:M]:
                p = nodes[j]["path"]
                if p == g[t:t + len(p)]: best = max(best, len(p))
            rec["tree%d" % M] = best
        rows.append(rec)
        if (name == "story" and t in (12, 20, 32, 48, 64, 80, 96, 112)) or (rec["tree8"] > match_chain + 1 and len(res["examples"]) < 24):
            sel = cands[:8]
            res["examples"].append({"prompt": name, "t": t, "context": tok.decode(g[max(0, t - 10):t]), "g": [tok.decode([x]) for x in g[t:t + DC]],
                                    "chain": [tok.decode([x]) for x in chain], "match_chain": match_chain, "match_tree8": rec["tree8"],
                                    "tree8": [{"path": [tok.decode([x]) for x in nodes[j]["path"]], "cp": round(nodes[j]["cp"], 4), "p": round(nodes[j]["p"], 4)} for j in sel]})
    res["prompts"][name] = {"n_pos": len(rows), "rows": rows, "text": tok.decode(g)}
    m = lambda k: float(np.mean([r[k] for r in rows]))
    print(name, len(rows), "chain(k=8) %.3f" % m("chain"), " ".join("tree%d %.3f" % (M, m("tree%d" % M)) for M in MS), round(time.time() - t0, 1), flush=True)
json.dump(res, open(OUT, "w"))
