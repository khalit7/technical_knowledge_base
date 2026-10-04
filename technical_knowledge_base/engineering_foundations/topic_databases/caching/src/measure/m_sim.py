"""Exact eviction policies simulated on the same traces the Redis runs replayed (m_skew.py), for comparison with Redis's
sampled approximations: exact LRU, FIFO, perfect LFU (counts every request ever seen, kept for evicted keys too),
Belady's OPT (evict the key used furthest in the future: the upper bound no real cache reaches), and
GreedyDual (cost-aware: Young 1994 / Cao and Irani 1997 with size 1; each entry's priority is L + miss cost, L rises to the
priority of each victim), using the measured miss costs of m_pg.py for the one-in-ten "expensive" keys.
Capacity in keys (20,000 to 200,000); hit ratio over requests 500,001 to 2,000,000 as in m_evict.py.
Env: CA_SCRATCH. Reads inputs/pg.json (costs). Writes inputs/sim.json. Pure Python plus numpy; about 10 minutes.
"""
import os, sys, json, heapq, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import S, save, machine, INPUTS

WARM = 500_000
SIZES = [20_000, 50_000, 100_000, 200_000]
WORK = ['wiki', 'wiki6h', 'zipf0.7', 'zipf0.9', 'zipf1.1']
EXP = np.random.default_rng(11).random(2_000_000) < 0.1      # same expensive keys as m_evict.py
pgc = json.load(open(os.path.join(INPUTS, 'pg.json')))['costs']
C_CHEAP, C_EXP = pgc['pk_lookup']['median_ms'], pgc['usage_aggregate']['median_ms']


def lru(tr, cap):
    d = collections.OrderedDict(); h = np.zeros(len(tr), bool)
    for i, k in enumerate(tr):
        if k in d: d.move_to_end(k); h[i] = True
        else:
            d[k] = 1
            if len(d) > cap: d.popitem(last=False)
    return h


def fifo(tr, cap):
    d = collections.OrderedDict(); h = np.zeros(len(tr), bool)
    for i, k in enumerate(tr):
        if k in d: h[i] = True
        else:
            d[k] = 1
            if len(d) > cap: d.popitem(last=False)
    return h


def lfu(tr, cap):
    cnt = collections.Counter(); inc = set(); heap = []; h = np.zeros(len(tr), bool)
    for i, k in enumerate(tr):
        cnt[k] += 1
        if k in inc:
            h[i] = True; heapq.heappush(heap, (cnt[k], i, k))
        else:
            inc.add(k); heapq.heappush(heap, (cnt[k], i, k))
            while len(inc) > cap:
                c, _, v = heapq.heappop(heap)
                if v in inc and c == cnt[v]: inc.discard(v)
    return h


def opt(tr, cap):
    n = len(tr); nxt = np.empty(n, np.int64); last = {}
    for i in range(n - 1, -1, -1):
        k = int(tr[i]); nxt[i] = last.get(k, n + i); last[k] = i
    inc = {}; heap = []; h = np.zeros(n, bool)
    for i in range(n):
        k = int(tr[i])
        if k in inc: h[i] = True
        inc[k] = nxt[i]; heapq.heappush(heap, (-nxt[i], k))
        while len(inc) > cap:
            nu, v = heapq.heappop(heap)
            if inc.get(v) == -nu: del inc[v]
    return h


def greedydual(tr, cap):
    L = 0.0; pri = {}; heap = []; h = np.zeros(len(tr), bool)
    for i, k in enumerate(tr):
        k = int(k); c = C_EXP if EXP[k] else C_CHEAP
        if k in pri: h[i] = True
        pri[k] = L + c; heapq.heappush(heap, (pri[k], i, k))
        while len(pri) > cap:
            p, _, v = heapq.heappop(heap)
            if pri.get(v) == p:
                L = p; del pri[v]
    return h


out = {**machine(), 'costs_ms': {'cheap': C_CHEAP, 'expensive': C_EXP}, 'runs': []}
for w in WORK:
    tr = np.load(os.path.join(S, f'trace_{w}.npy'))
    ex = EXP[tr[WARM:]]
    for cap in SIZES:
        for name, f in (('lru', lru), ('fifo', fifo), ('lfu', lfu), ('opt', opt), ('greedydual', greedydual)):
            hh = f(tr.tolist() if name != 'opt' else tr, cap)[WARM:]
            out['runs'].append({'work': w, 'cap_keys': cap, 'policy': name, 'hit': float(hh.mean()),
                                'hit_cheap': float(hh[~ex].mean()), 'hit_exp': float(hh[ex].mean()), 'exp_share': float(ex.mean())})
            print(w, cap, name, round(float(hh.mean()), 4), flush=True)
        save('sim.json', out)
