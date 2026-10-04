"""Recompute every number the page's JavaScript derives, independently in Python, and check the HTML against the measured data.
Run: python3 recompute.py   (stdlib only) -> recompute_out.json ; then node check_recompute.mjs compares the page's JS with it.
1. Partitioning widget: keys moved and imbalance for hash mod N and consistent hashing (N = 2..10, 1..256 points per machine).
2. Clocks widget: Lamport and vector timestamps of the fixed three-process diagram.
3. Consistency lab: linearizable / sequentially consistent verdicts of each history by brute force.
4. Measured replication table in parts/20_read_d.html against inputs/replication_local.json.
5. Small derived numbers quoted in the text."""
import json, re, itertools, os
H = os.path.dirname(os.path.abspath(__file__))
out = {}

# ---- 1. hashing ----
def fnv(s):
    h = 0x811c9dc5
    for ch in s.encode('ascii'):
        h ^= ch; h = (h * 0x01000193) & 0xffffffff
    h ^= h >> 16; h = (h * 0x85ebca6b) & 0xffffffff; h ^= h >> 13; h = (h * 0xc2b2ae35) & 0xffffffff; h ^= h >> 16
    return h
K = 10000; keys = [fnv('user:%d' % i) for i in range(K)]
VN = [1, 4, 16, 64, 128, 256]
import bisect
def owners_ring(n, v):
    t = sorted((fnv('node-%d-vn-%d' % (m, j)), m) for m in range(n) for j in range(v))
    hs = [x[0] for x in t]
    res = []
    for h in keys:
        i = bisect.bisect_left(hs, h)
        res.append(t[0 if i == len(hs) else i][1])
    return res
def owners_mod(n): return [h % n for h in keys]
ring = {}
for mode in ('mod', 'ring'):
    for n in range(2, 11):
        for v in (VN if mode == 'ring' else [1]):
            a = owners_mod(n) if mode == 'mod' else owners_ring(n, v)
            b = owners_mod(n + 1) if mode == 'mod' else owners_ring(n + 1, v)
            before = [a.count(m) for m in range(n)]; after = [b.count(m) for m in range(n + 1)]
            moved = sum(1 for x, y in zip(a, b) if x != y)
            ring['%s_%d_%d' % (mode, n, v)] = {'before': before, 'after': after, 'moved': moved, 'imb': max(before) / (K / n)}
out['ring'] = ring

# ---- 2. clocks: events per process, messages (send event -> receive event) ----
from clocks_def import P, MSG  # shared definition, also embedded in the JS (checked by check_recompute.mjs)
def lamport_vector():
    L, V = {}, {}
    pending = True; done = set()
    order = []
    # process events in an order consistent with messages
    idx = {p: 0 for p in P}
    while len(done) < sum(len(P[p]) for p in P):
        progressed = False
        for p in P:
            while idx[p] < len(P[p]):
                e = P[p][idx[p]]
                src = [s for s, r in MSG if r == e]
                if src and src[0] not in done: break
                prev = P[p][idx[p] - 1] if idx[p] else None
                l = (L[prev] if prev else 0)
                v = list(V[prev]) if prev else [0] * len(P)
                if src: l = max(l, L[src[0]]); v = [max(x, y) for x, y in zip(v, V[src[0]])]
                L[e] = l + 1; v[list(P).index(p)] += 1; V[e] = v
                done.add(e); idx[p] += 1; progressed = True
        if not progressed: raise SystemExit('cycle')
    return L, V
L, V = lamport_vector()
out['clocks'] = {'lamport': L, 'vector': V}

# ---- 3. histories ----
from histories_def import HIST
def legal(seq):
    val = 0
    for op in seq:
        if op['f'] == 'w': val = op['v']
        elif op['v'] != val: return False
    return True
def check(h, real_time):
    ops = [dict(o, id=i) for i, o in enumerate(h['ops'])]
    for perm in itertools.permutations(ops):
        pos = {o['id']: k for k, o in enumerate(perm)}
        ok = True
        for a in ops:
            for b in ops:
                if a is b: continue
                if a['p'] == b['p'] and a['s'] < b['s'] and pos[a['id']] > pos[b['id']]: ok = False; break
                if real_time and a['e'] < b['s'] and pos[a['id']] > pos[b['id']]: ok = False; break
            if not ok: break
        if ok and legal(perm): return True
    return False
out['defs'] = {'P': P, 'MSG': MSG, 'HIST': HIST}
out['hist'] = {h['id']: {'lin': check(h, True), 'seq': check(h, False)} for h in HIST}

# ---- 4. measured table ----
m = json.load(open(os.path.join(H, 'inputs/replication_local.json')))['modes']
html = open(os.path.join(H, 'parts/20_read_d.html')).read()
rows = {'async': 'Asynchronous (default)', 'sync_on': 'Synchronous, <code>on</code>', 'remote_apply': 'Synchronous, <code>remote_apply</code>', 'async_lsn_wait': 'Asynchronous + client waits'}
bad = []
for k, label in rows.items():
    i = html.index(label); row = html[i:html.index('</tr>', i)]
    for f in ('write_ms_median', 'write_ms_p99'):
        if ('%.3f ms' % m[k][f]) not in row: bad.append((k, f, m[k][f]))
    if ('{:,}'.format(m[k]['stale_reads'])) not in row: bad.append((k, 'stale', m[k]['stale_reads']))
for v in ['%.3f ms' % m['async']['visible_after_ms_median'], '%.3f ms' % m['async_lsn_wait']['lsn_wait_ms_median'], '%.3f ms' % m['async_lsn_wait']['lsn_wait_ms_p99'], '%.2f%%' % m['async']['stale_pct']]:
    if v not in html: bad.append(('text', v))
out['measured_table_mismatches'] = bad

# ---- 5. derived numbers in the text ----
out['derived'] = {
    'spanner_sawtooth_ms': 200e-6 * 30 * 1e3,          # 200 us/s drift x 30 s poll = 6 ms
    'raft_majority_5': 5 // 2 + 1, 'raft_tolerates_5': (5 - 1) // 2,
    'quorum_dynamo_overlap': 2 + 2 - 3,
}
json.dump(out, open(os.path.join(H, 'recompute_out.json'), 'w'), indent=0)
print('measured table mismatches:', bad)
print('hist verdicts:', out['hist'])
print('derived:', out['derived'])
r = ring['ring_4_64']
print('ring 4->5, 64 vnodes: moved', r['moved'], 'imb %.2f' % r['imb'], '| mod 4->5 moved', ring['mod_4_1']['moved'])
