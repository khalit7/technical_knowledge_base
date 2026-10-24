# The illustrative ranked list of section 6 and its metrics at every cutoff k, checked against scikit-learn's ndcg_score.
# Run from src/:  uv run --with scikit-learn python rank_example.py
import json, math
import numpy as np
from sklearn.metrics import ndcg_score
G = [0, 3, 0, 2, 1, 0, 0, 2, 0, 0]          # relevance grade of the item at ranks 1..10 (illustrative)
MISSING = [1]                               # judged relevant items the system never returned
REL = sum(g > 0 for g in G) + len(MISSING)  # 5 relevant items for this query
IDEAL = sorted([g for g in G if g > 0] + MISSING, reverse=True)
def dcg(gr, k, exp=False):
    return sum(((2 ** g - 1) if exp else g) / math.log2(i + 2) for i, g in enumerate(gr[:k]))
rows = []
for k in range(1, 11):
    hits = sum(g > 0 for g in G[:k]); first = next((i + 1 for i, g in enumerate(G[:k]) if g > 0), None)
    ap = sum((sum(g > 0 for g in G[:i + 1]) / (i + 1)) for i in range(k) if G[i] > 0) / REL
    rows.append({'k': k, 'p': hits / k, 'r': hits / REL, 'rr': 1 / first if first else 0, 'ap': ap,
                 'dcg': dcg(G, k), 'idcg': dcg(IDEAL, k), 'ndcg': dcg(G, k) / dcg(IDEAL, k),
                 'ndcg_exp': dcg(G, k, True) / dcg(IDEAL, k, True)})
# scikit-learn: linear gain; scores are a strictly decreasing ranking, the missing item scored last
yt = np.array([G + MISSING]); ys = np.array([list(range(len(G) + len(MISSING), 0, -1))])
for r in rows:
    sk = ndcg_score(yt, ys, k=r['k'])
    assert abs(sk - r['ndcg']) < 1e-12, (r['k'], sk, r['ndcg'])
    r['sklearn_ndcg'] = sk
json.dump({'grades': G, 'missing': MISSING, 'relevant': REL, 'rows': rows}, open('inputs/rank_example.json', 'w'), indent=1)
for r in rows: print({k: round(v, 4) if isinstance(v, float) else v for k, v in r.items()})
