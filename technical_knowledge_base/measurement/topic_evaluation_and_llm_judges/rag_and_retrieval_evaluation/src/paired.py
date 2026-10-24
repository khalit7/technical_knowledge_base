"""Per-query paired comparison of two retrievers on the same queries and labels (Reading, "Comparing two RAG systems fairly").
Run from src/: python3 paired.py   (reads inputs/page_data.json only; writes inputs/paired.json; seconds on a CPU)
Per query: nDCG@10 (linear gain, as trec_eval) for each system from the stored ranks of the labelled passages;
delta = B - A; wins, ties (|delta| < 1e-9), losses; mean delta; paired bootstrap 95% interval of the mean delta
(10,000 resamples of queries, seed 0); and recall@k for k = 1..100 for the curve figure."""
import json, math, random
D = json.load(open('inputs/page_data.json'))
SYS = D['sys']

def per_query(ds, si):
    out = []
    for q in D['beir'][ds]['Q']:
        fl = q[3][si]; d = 0.0
        for j in range(0, len(fl), 2):
            rk, g = fl[j], fl[j + 1]
            if rk <= 10: d += g / math.log2(rk + 1)
        out.append(d / q[1])
    return out

def recall_curve(ds, si):
    Q = D['beir'][ds]['Q']; cur = []
    for k in range(1, 101):
        r = 0.0
        for q in Q:
            fl = q[3][si]; r += sum(1 for j in range(0, len(fl), 2) if fl[j] <= k) / q[0]
        cur.append(round(r / len(Q), 4))
    return cur

res = {'pairs': {}, 'curves': {}}
for ds in ['scifact', 'nfcorpus', 'fiqa']:
    res['curves'][ds] = {s: recall_curve(ds, i) for i, s in enumerate(SYS) if s in ('bm25_lucene', 'dense_minilm', 'hybrid_rrf')}
    for a, b in [('bm25_lucene', 'dense_minilm'), ('bm25_lucene', 'hybrid_rrf'), ('bm25_lucene', 'bm25okapi')]:
        A = per_query(ds, SYS.index(a)); B = per_query(ds, SYS.index(b))
        dl = [y - x for x, y in zip(A, B)]; n = len(dl)
        rnd = random.Random(0); means = []
        for _ in range(10000):
            means.append(sum(dl[rnd.randrange(n)] for _ in range(n)) / n)
        means.sort()
        res['pairs'][f'{ds}|{a}|{b}'] = {
            'n': n, 'meanA': round(sum(A) / n, 4), 'meanB': round(sum(B) / n, 4), 'mean_delta': round(sum(dl) / n, 4),
            'wins': sum(1 for x in dl if x > 1e-9), 'ties': sum(1 for x in dl if abs(x) <= 1e-9), 'losses': sum(1 for x in dl if x < -1e-9),
            'ci95': [round(means[249], 6), round(means[9749], 6)]}
json.dump(res, open('inputs/paired.json', 'w'), separators=(',', ':'))
for k, v in res['pairs'].items(): print(k, v)
for ds in res['curves']: print(ds, {s: (c[9], c[99]) for s, c in res['curves'][ds].items()})
