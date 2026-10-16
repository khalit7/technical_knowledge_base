"""Self-Instruct's ROUGE-L novelty filter, measured on real instruction sets.

Self-Instruct (Wang et al. 2022) adds a generated instruction to the pool only if its ROUGE-L with every instruction
already in the pool is below 0.7; Alpaca's generate_instruction.py does the same. Here, for every instruction of a
set, the highest ROUGE-L F against any other instruction of the same set (both directions), and the sequential
replay in file order (what a pool-growing filter at 0.7 would have rejected).

ROUGE-L F = 2 LCS / (len a + len b) on rouge_score's default tokens (lower-case, runs of [a-z0-9]).
Exact for every pair that can reach the threshold: candidates come from a multiset token-overlap upper bound
(LCS <= multiset overlap), computed as sparse products in chunks; LCS is then computed exactly.
Sets: Alpaca 52k instructions, Dolly 15k instructions, Self-Instruct's 175 seed tasks (and Alpaca's seeds).
Output: data/out/selfinst.json. Run: nice -n 15, 2 to 4 threads.
"""
import json
import os
import re
import sys
from collections import Counter

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402

TH = 0.7
TOK = re.compile(r"[a-z0-9]+")


def toks(s):
    return TOK.findall((s or "").lower())


def lcs(a, b):
    if len(a) < len(b):
        a, b = b, a
    prev = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b):
            cur.append(prev[j] + 1 if x == y else max(prev[j + 1], cur[j]))
        prev = cur
    return prev[-1]


def rouge_l(a, b):
    return 2 * lcs(a, b) / (len(a) + len(b)) if a and b else 0.0


def best_neighbours(T, lo=0.5):
    """For each token list, the best ROUGE-L against any other one (only pairs whose bound reaches lo are scored)."""
    from scipy import sparse
    vocab = {}
    rows, cols = [], []
    for i, t in enumerate(T):
        seen = Counter()
        for w in t:
            seen[w] += 1
            key = (w, seen[w])
            j = vocab.setdefault(key, len(vocab))
            rows.append(i)
            cols.append(j)
    X = sparse.csr_matrix((np.ones(len(rows), dtype=np.float32), (rows, cols)), shape=(len(T), len(vocab)))
    XT = X.T.tocsr()
    lens = np.array([len(t) for t in T], dtype=np.float32)
    best = np.zeros(len(T))
    arg = -np.ones(len(T), dtype=np.int64)
    pairs = []
    for s in range(0, len(T), 1000):
        O = (X[s:s + 1000] @ XT).toarray()
        for r in range(O.shape[0]):
            i = s + r
            O[r, i] = 0
            bound = 2 * O[r] / (lens[i] + lens + 1e-9)
            cand = np.nonzero(bound >= lo)[0]
            for j in cand:
                if j == i:
                    continue
                f = rouge_l(T[i], T[j])
                if f > best[i]:
                    best[i], arg[i] = f, j
                if f >= TH and j > i:
                    pairs.append((i, int(j), round(f, 4)))
    return best, arg, pairs


def sequential(best_pairs, n):
    """Replay a pool that grows in file order: row j is rejected if any earlier kept row has ROUGE-L > 0.7 (strictly,
    as Alpaca's generate_instruction.py:196 @ 761dc5bf and Self-Instruct do)."""
    earlier = {}
    for i, j, f in best_pairs:
        if f > TH + 1e-9:
            earlier.setdefault(j, []).append(i)
    kept = np.ones(n, dtype=bool)
    for j in range(n):
        if any(kept[i] for i in earlier.get(j, [])):
            kept[j] = False
    return kept


def seeds():
    out = {}
    # data/seed_tasks.jsonl of yizhongw/self-instruct @ 0b26ccaa and seed_tasks.jsonl of tatsu-lab/stanford_alpaca
    # @ 761dc5bf are byte-identical (sha256 7779004f...); one copy is kept in inputs/seed_tasks.jsonl, with its three
    # fictional example e-mail addresses rewritten to example.com (the instructions are unchanged).
    for k, fn in [("seeds", "seed_tasks.jsonl")]:
        p = os.path.join(C.PAGE, "inputs", fn)
        if os.path.exists(p):
            out[k] = [json.loads(x) for x in open(p) if x.strip()]
    return out


def run(key, instr, show=12):
    T = [toks(x) for x in instr]
    best, arg, pairs = best_neighbours(T)
    kept = sequential(pairs, len(T))
    # only pairs whose token-overlap bound reaches 0.5 are scored, so every best below 0.5 is reported as one bucket
    hist = [int((best < 0.5).sum())] + np.histogram(best[best >= 0.5], bins=np.linspace(0.5, 1, 11))[0].tolist()
    ex = sorted(pairs, key=lambda p: -p[2])
    pick = [p for p in ex if p[2] < 1][:show] + [p for p in ex if p[2] >= 1][:4]
    return dict(n=len(T), over=int((best >= TH).sum()), above=int((best > TH + 1e-9).sum()),
                exactly=int((np.abs(best - TH) < 1e-9).sum()), identical=int((best >= 0.9999).sum()), pairs=len(pairs),
                rejected_sequential=int((~kept).sum()), hist=hist, mean_best=float(best.mean()),
                examples=[dict(a=instr[i][:300], b=instr[j][:300], f=f) for i, j, f in pick])


def main():
    res = {}
    a = C.frame("alpaca")
    res["alpaca"] = run("alpaca", list(a.instruction))
    print("alpaca", res["alpaca"]["over"], flush=True)
    d = C.frame("dolly")
    res["dolly"] = run("dolly", list(d.instruction))
    print("dolly", res["dolly"]["over"], flush=True)
    sd = seeds()
    for k, rows in sd.items():
        ins = [r["instruction"] for r in rows]
        res["seed_" + k] = run("seed_" + k, ins)
        res["seed_" + k]["rows"] = [dict(name=r.get("name", ""), instruction=r["instruction"][:240],
                                         cls=r.get("is_classification")) for r in rows]
    # Alpaca against its own seeds: how close the generated instructions stay to the 175 human-written seeds
    if "seeds" in sd:
        S = [toks(r["instruction"]) for r in sd["seeds"]]
        A = [toks(x) for x in a.instruction]
        bs = [max(rouge_l(x, s) for s in S) for x in A[:5000]]
        res["alpaca_vs_seeds"] = dict(n=len(bs), hist=np.histogram(bs, bins=np.linspace(0, 1, 21))[0].tolist(),
                                      above=int(sum(b > TH + 1e-9 for b in bs)),
                                      over=int(sum(b >= TH for b in bs)), mean=float(np.mean(bs)))
    C.save_out("selfinst.json", res)


if __name__ == "__main__":
    main()
