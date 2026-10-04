"""Recompute every number the page derives, and mirror the Queue lab simulator (parts/22_js_qsim.js) in Python.
Run: python3 recompute.py   -> recompute_out.json (read by check_sim.mjs, which runs the page's JS and compares).
Stdlib only."""
import json, math, os, heapq
os.chdir(os.path.dirname(os.path.abspath(__file__)))
out = {}

# ---------------------------------------------------------------- Kafka murmur2 (Utils.murmur2) and the UtilsTest vectors
def i32(x): x &= 0xffffffff; return x - (1 << 32) if x & 0x80000000 else x
def imul(a, b): return i32((a & 0xffffffff) * (b & 0xffffffff))
def murmur2(s):
    d = s.encode(); n = len(d); m = 0x5bd1e995; h = i32(0x9747b28c ^ n)
    for i in range(n // 4):
        j = i * 4; k = i32(d[j] | d[j+1] << 8 | d[j+2] << 16 | d[j+3] << 24)
        k = imul(k, m); k = i32(k ^ ((k & 0xffffffff) >> 24)); k = imul(k, m); h = imul(h, m); h = i32(h ^ k)
    t = n & ~3; r = n % 4
    if r >= 3: h = i32(h ^ (d[t+2] << 16))
    if r >= 2: h = i32(h ^ (d[t+1] << 8))
    if r >= 1: h = i32(h ^ d[t]); h = imul(h, m)
    h = i32(h ^ ((h & 0xffffffff) >> 13)); h = imul(h, m); h = i32(h ^ ((h & 0xffffffff) >> 15))
    return h
vectors = {"21": -973932308, "foobar": -790332482, "a-little-bit-long-string": -985981536,
           "a-little-bit-longer-string": -1486304829, "lkjh234lh9fiuh90y23oiuhsafujhadof229phr9h19h89h8": -58897971, "abc": 479470107}
out['murmur2_vectors_ok'] = all(murmur2(k) == v for k, v in vectors.items())
out['partitions'] = {k: {P: (murmur2(k) & 0x7fffffff) % P for P in range(1, 9)} for k in ['user-1', 'user-4', 'user-6', 'user-8']}

# ---------------------------------------------------------------- the measured lab, summarised as the page states it
lab = json.load(open('inputs/lab_measured.json')); b1 = json.load(open('inputs/lab_outbox_batch1.json'))
def runs(name, k): return [r[k] for r in lab['redelivery'] if r['name'] == name]
c5 = 'at-least-once, 5% crashes'
out['lab'] = {
    'at_most_once_lost': runs('at-most-once (delete first), 5% crashes', 'lost'),
    'at_least_once_dups': runs(c5, 'duplicates'), 'at_least_once_effects': runs(c5, 'effects'),
    'idem_effects': runs('at-least-once + idempotent receiver, 5% crashes', 'effects'),
    'idem_hits': runs('at-least-once + idempotent receiver, 5% crashes', 'dedup_hits'),
    'vt_dups': runs('at-least-once, no crashes, visibility timeout 0.3 s, work exponential mean 0.1 s', 'duplicates'),
    'mean_dups_5pct': round(sum(runs(c5, 'duplicates')) / 3, 1),
    'expected_dups_5pct': round(1000 * 0.05 / 0.95, 1),
    'skip_locked_8': [r['jobs_per_s'] for r in lab['throughput'] if r['mode'] == 'skip_locked' and r['workers'] == 8][0],
    'for_update': [r['jobs_per_s'] for r in lab['throughput'] if r['mode'] == 'for_update'],
    'outbox_naive_lost': [r['lost_events'] for r in lab['outbox'] if r['mode'] == 'naive'],
    'outbox_first_phantom': [r['phantom_events'] for r in lab['outbox'] if r['mode'] == 'naive_publish_first'],
    'outbox_b10_dups': [r['duplicate_events'] for r in lab['outbox'] if r['mode'] == 'outbox'],
    'outbox_b10_dups_per_crash': [round(r['duplicate_events'] / r['relay_crashes'], 2) for r in lab['outbox'] if r['mode'] == 'outbox'],
    'outbox_b1_dups': [r['duplicate_events'] for r in b1], 'outbox_b1_crashes': [r['relay_crashes'] for r in b1],
    'outbox_lost_all': sum(r['lost_events'] for r in lab['outbox'] if r['mode'] == 'outbox') + sum(r['lost_events'] for r in b1)}

# ---------------------------------------------------------------- formulas stated in the text
out['formulas'] = {
    'p_exceed_0.3_mean_0.1': round(math.exp(-0.3 / 0.1), 4),       # about 5%
    'p_exceed_0.3_mean_0.15': round(math.exp(-0.3 / 0.15), 4),     # lab preset "Timeout too short": about 13%
    'healthy_rho': 20 * 0.15 / 4, 'over_rho': 30 * 0.15 / 4, 'over_growth_per_s': round(30 - 4 / 0.15, 2),
    'burst_rho': 60 * 0.15 / 4, 'bounded_wait_s': round(200 / (4 / 0.15), 1),
    'little_pdf': 5 * 20, 'little_wait_500_at_50': 500 / 50, 'yanacek_threads': [100 * 0.1, 100 * 10]}

# ---------------------------------------------------------------- qsim: line-by-line mirror of parts/22_js_qsim.js
def rng(seed):
    a = [seed & 0xffffffff]
    def r():
        a[0] = (a[0] + 0x6D2B79F5) & 0xffffffff; t = a[0]
        t = imul(t ^ (t >> 15), t | 1) & 0xffffffff
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & 0xffffffff; t &= 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    return r

def qsim(p):
    R = rng(p['seed']); H = p['T'] if p['mode'] == 'backlog' else p['T'] * 1.5
    ev = []; seq = [0]
    def push(t, k, x): heapq.heappush(ev, (t, seq[0], k, x)); seq[0] += 1
    msgs = []; ready = []; W = [0] * p['C']
    st = dict(admitted=0, rejected=0, completed=0, redeliveries=0, duplicates=0, dedup=0, dlq=0, crashes=0, poisonFails=0, lateAcks=0, effects=0)
    lat = []; S = {'depth': 0, 'inflight': 0, 'area': 0.0, 'tl': 0.0, 'oldest': 0, 'nextS': 0}; samples = []
    rate = lambda t: p['lam'] * (3 if p['burst'] and p['T'] / 4 <= t < p['T'] / 2 else 1)
    expo = lambda m: -m * math.log(1 - R())
    def sample(t):
        while S['oldest'] < len(msgs) and msgs[S['oldest']]['done']: S['oldest'] += 1
        samples.append(dict(t=t, depth=S['depth'], completed=st['completed'], age=(t - msgs[S['oldest']]['t0']) if S['oldest'] < len(msgs) else 0))
    def admit(t):
        if p['B'] > 0 and S['depth'] >= p['B']: st['rejected'] += 1; return
        m = dict(id=len(msgs), t0=t, rec=0, claim=0, eff=0, done=False, poison=R() < p['pp'], vis=None)
        msgs.append(m); heapq.heappush(ready, m['id']); S['depth'] += 1; st['admitted'] += 1
    def dispatch(t):
        i = 0
        while i < len(W):
            if W[i] != 0: i += 1; continue
            m = None
            while ready:
                c = msgs[heapq.heappop(ready)]
                if not c['done'] and c['vis'] is not False: m = c; break
            if m is None: return
            if p['M'] > 0 and m['rec'] >= p['M']:
                m['done'] = True; st['dlq'] += 1; S['depth'] -= 1; continue
            m['rec'] += 1
            if m['rec'] > 1: st['redeliveries'] += 1
            m['claim'] += 1; m['vis'] = False; S['inflight'] += 1
            push(t + p['V'], 'vis', (m['id'], m['claim']))
            w = expo(p['S']) if p['dist'] == 'exp' else p['S']; crash = R() < p['pc']
            W[i] = 1; push(t + w, 'done', (i, m['id'], m['claim'], crash)); i += 1
    if p['mode'] == 'backlog':
        for _ in range(p['N']): admit(0)
    elif p['lam'] > 0: push(expo(1 / rate(0)), 'arr', None)
    dispatch(0)
    while ev:
        t, _, k, x = heapq.heappop(ev)
        if t > H: break
        while S['nextS'] <= t and S['nextS'] <= H:
            S['area'] += S['depth'] * (S['nextS'] - S['tl']); S['tl'] = S['nextS']; sample(S['nextS']); S['nextS'] += 1
        S['area'] += S['depth'] * (t - S['tl']); S['tl'] = t
        if k == 'arr':
            admit(t)
            if t < p['T']: push(t + expo(1 / rate(t)), 'arr', None)
            dispatch(t)
        elif k == 'vis':
            m = msgs[x[0]]
            if not m['done'] and m['claim'] == x[1] and m['vis'] is False:
                m['vis'] = True; S['inflight'] -= 1; heapq.heappush(ready, m['id']); dispatch(t)
        elif k == 'done':
            wi, mid, claim, crash = x; m = msgs[mid]
            if m['poison']: st['poisonFails'] += 1; W[wi] = 0; dispatch(t); continue
            if p['idem'] and m['eff'] >= 1: st['dedup'] += 1
            else:
                m['eff'] += 1; st['effects'] += 1
                if m['eff'] > 1: st['duplicates'] += 1
            if crash: st['crashes'] += 1; W[wi] = 2; push(t + p['Rs'], 'up', wi)
            else:
                if not m['done']:
                    m['done'] = True; S['depth'] -= 1; st['completed'] += 1; lat.append(t - m['t0'])
                    if m['vis'] is False: S['inflight'] -= 1
                else: st['lateAcks'] += 1
                W[wi] = 0
            dispatch(t)
        elif k == 'up': W[x] = 0; dispatch(t)
    while S['nextS'] <= H:
        S['area'] += S['depth'] * (S['nextS'] - S['tl']); S['tl'] = S['nextS']; sample(S['nextS']); S['nextS'] += 1
    st['left'] = S['depth']; st['L'] = S['area'] / H; st['X'] = st['completed'] / H
    st['Wmean'] = sum(lat) / len(lat) if lat else 0
    st['maxAge'] = max(s['age'] for s in samples)
    return st

base = dict(mode='rate', lam=20, N=1000, T=120, C=4, S=0.15, dist='exp', V=30, pc=0, Rs=1, idem=False, M=0, pp=0, B=0, burst=False, seed=1)
presets = {'healthy': {}, 'over': dict(lam=30), 'burst': dict(burst=True), 'bounded': dict(lam=30, B=200), 'crash': dict(pc=0.05),
           'crashIdem': dict(pc=0.05, idem=True), 'shortV': dict(V=0.3), 'poison': dict(pp=0.02, V=5), 'poisonDlq': dict(pp=0.02, V=5, M=5),
           'labCrash': dict(mode='backlog', N=1000, T=30, C=4, S=0.01, dist='fixed', V=2, pc=0.05, Rs=0.5),
           'labVT': dict(mode='backlog', N=600, T=40, C=4, S=0.1, dist='exp', V=0.3)}
out['qsim'] = {}
for name, over in presets.items():
    p = dict(base, **over); st = qsim(p)
    out['qsim'][name] = {'params': p, 'st': {k: (round(v, 6) if isinstance(v, float) else v) for k, v in st.items()}}
# the two lab presets over 20 seeds, against the measurement
for name, meas in (('labCrash', out['lab']['at_least_once_dups']), ('labVT', out['lab']['vt_dups'])):
    d = [qsim(dict(base, **presets[name], seed=s))['duplicates'] for s in range(1, 21)]
    out['qsim'][name]['dups_20_seeds_mean'] = round(sum(d) / 20, 1); out['qsim'][name]['dups_20_seeds_range'] = [min(d), max(d)]
    out['qsim'][name]['measured'] = meas
json.dump(out, open('recompute_out.json', 'w'), indent=1)
print(json.dumps({k: out[k] for k in ('murmur2_vectors_ok', 'lab', 'formulas')}, indent=1))
for k, v in out['qsim'].items(): print(k, {kk: v['st'][kk] for kk in ('completed', 'redeliveries', 'duplicates', 'dlq', 'rejected', 'left')}, v.get('dups_20_seeds_mean', ''), v.get('dups_20_seeds_range', ''))
