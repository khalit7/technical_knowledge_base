"""Why caches work: popularity skew on a real access log.
Input: one hour of Wikimedia pageviews (pageviews-20260915-120000.gz, 15 September 2026 12:00 to 13:00 UTC,
https://dumps.wikimedia.org/other/pageviews/2026/2026-09/), saved in the scratch directory as pv.gz (62 MB, not committed).
English Wikipedia desktop ("en") and mobile ("en.m") rows are summed by title.
Writes inputs/skew.json (shares, Zipf fit, rank-frequency points, ideal hit ratio by cache size) and, in the scratch
directory, the request traces the Redis runs replay: trace_wiki.npy (2,000,000 requests drawn without replacement from
the hour's views, order shuffled: the hourly file has no timestamps) and trace_zipf{a}.npy (synthetic Zipf, 1,000,000 keys).
"""
import os, sys, gzip, json, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import S, save, machine

N_REQ = 2_000_000
cnt = collections.Counter()
with gzip.open(os.path.join(S, 'pv.gz'), 'rt', encoding='utf-8', errors='replace') as f:
    for line in f:
        p = line.split(' ')
        if len(p) < 3 or p[0] not in ('en', 'en.m') or p[1] == '-':
            continue
        cnt[p[1]] += int(p[2])
titles, views = zip(*cnt.most_common())
v = np.array(views, dtype=np.int64)
tot = int(v.sum()); n = len(v)
cum = np.cumsum(v) / tot
share = lambda frac: float(cum[max(0, int(frac * n) - 1)])
# Zipf fit on ranks 10 to 100,000 (log-log least squares): views ~ C / rank^alpha
r = np.arange(1, n + 1)
sel = (r >= 10) & (r <= 100_000)
alpha = -np.polyfit(np.log(r[sel]), np.log(v[sel]), 1)[0]
pts = sorted(set(int(x) for x in np.unique(np.round(np.logspace(0, np.log10(n), 60)))))
out = {**machine(), 'source': 'https://dumps.wikimedia.org/other/pageviews/2026/2026-09/pageviews-20260915-120000.gz',
       'hour': '2026-09-15 12:00 to 13:00 UTC', 'pages': n, 'views': tot,
       'top': [{'title': titles[i], 'views': int(v[i])} for i in range(10)],
       'once': int((v == 1).sum()),
       'share_top': {k: share(f) for k, f in [('0.1%', 0.001), ('1%', 0.01), ('10%', 0.1), ('20%', 0.2), ('50%', 0.5)]},
       'zipf_alpha_fit': round(float(alpha), 3), 'fit_ranks': [10, 100000],
       'rank_views': [[p, int(v[p - 1])] for p in pts],
       # ideal hit ratio of a cache holding the k most popular pages (static, perfect knowledge, independent requests)
       'ideal_hit': [[k, float(cum[k - 1])] for k in [1000, 10000, 50000, 100000, 250000, 500000, 1000000] if k <= n]}
rng = np.random.default_rng(7)
# 2M requests drawn without replacement from the multiset of this hour's views, shuffled
idx = np.repeat(np.arange(n, dtype=np.int32), v)
trace = rng.permutation(idx)[:N_REQ]
np.save(os.path.join(S, 'trace_wiki.npy'), trace)
u = len(np.unique(trace))
out['trace'] = {'requests': N_REQ, 'distinct_keys': int(u), 'compulsory_miss_share': u / N_REQ}
for a in (0.7, 0.9, 1.1):
    K = 1_000_000
    p = 1.0 / np.arange(1, K + 1) ** a; p /= p.sum()
    t = rng.choice(K, size=N_REQ, p=p).astype(np.int32)
    np.save(os.path.join(S, f'trace_zipf{a}.npy'), t)
    out.setdefault('zipf_traces', {})[str(a)] = {'keys': K, 'requests': N_REQ, 'distinct_keys': int(len(np.unique(t))),
                                                 'share_top_1%': float(p[:K // 100].sum())}
save('skew.json', out)
print(json.dumps({k: out[k] for k in ('pages', 'views', 'once', 'share_top', 'zipf_alpha_fit', 'trace')}, indent=1))
