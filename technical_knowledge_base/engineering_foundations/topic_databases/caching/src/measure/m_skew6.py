"""A real trace with popularity that drifts: six consecutive hours of English Wikipedia pageviews
(2026-09-15 06:00 to 12:00 UTC, pageviews-20260915-{06..11}0000.gz from https://dumps.wikimedia.org/other/pageviews/2026/2026-09/).
For each hour, 333,334 requests are drawn without replacement from that hour's views and shuffled within the hour
(the files have no finer timestamps); the hours are concatenated in order: 2,000,004 requests whose popular set changes
from hour to hour, unlike trace_wiki.npy (one hour, no drift). Key ids are numbered by first appearance in the trace.
Also measures how much of each hour's traffic goes to pages that were in the previous hour's top 10,000.
Writes trace_wiki6h.npy in the scratch directory and inputs/skew6.json.
"""
import os, sys, gzip, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import S, save, machine

HOURS = ['06', '07', '08', '09', '10', '11']
PER = 333_334
rng = np.random.default_rng(8)
ids = {}; parts = []; prev_top = None; stats = []
for h in HOURS:
    cnt = collections.Counter()
    with gzip.open(os.path.join(S, f'pv_{h}.gz'), 'rt', encoding='utf-8', errors='replace') as f:
        for line in f:
            p = line.split(' ')
            if len(p) >= 3 and p[0] in ('en', 'en.m') and p[1] != '-':
                cnt[p[1]] += int(p[2])
    titles = list(cnt.keys()); v = np.array([cnt[t] for t in titles], dtype=np.int64)
    pick = rng.permutation(np.repeat(np.arange(len(titles), dtype=np.int32), v))[:PER]
    seq = np.empty(PER, dtype=np.int32)
    for i, j in enumerate(pick):
        t = titles[j]
        if t not in ids: ids[t] = len(ids)
        seq[i] = ids[t]
    parts.append(seq)
    top = set(t for t, _ in cnt.most_common(10_000))
    row = {'hour': h, 'views': int(v.sum()), 'pages': len(titles)}
    if prev_top is not None:
        row['share_on_prev_top10k'] = sum(cnt[t] for t in prev_top) / v.sum()
        row['share_on_own_top10k'] = sum(cnt[t] for t in top) / v.sum()
        row['top10k_overlap'] = len(top & prev_top) / 10_000
    prev_top = top; stats.append(row); print(row, flush=True)
trace = np.concatenate(parts)
np.save(os.path.join(S, 'trace_wiki6h.npy'), trace)
save('skew6.json', {**machine(), 'hours': stats, 'requests': int(len(trace)), 'distinct_keys': int(len(np.unique(trace))),
                    'source': 'https://dumps.wikimedia.org/other/pageviews/2026/2026-09/'})
