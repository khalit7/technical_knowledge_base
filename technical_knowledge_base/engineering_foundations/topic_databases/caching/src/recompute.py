"""Recompute every derived number of the page from inputs/*.json and compare with what the page's JavaScript printed
(page_numbers.json, written by check_ui.mjs; run that first, from the repo root). Writes recompute_out.json."""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, 'inputs')
L = lambda n: json.load(open(os.path.join(I, n)))
P = json.load(open(os.path.join(H, 'page_numbers.json')))
checks = []
def ok(name, got, want, tol=0.0):
    good = abs(got - want) <= tol if isinstance(want, (int, float)) else got == want
    checks.append({'check': name, 'page': got, 'expected': want, 'ok': bool(good)})
num = lambda s: float(re.sub(r'[^0-9.\-]', '', s.replace('−', '-')))
sk, pg, race, sem, ev, sim, pr, kv = L('skew.json'), L('pg.json'), L('race.json'), L('sem.json'), L('evict.json'), L('sim.json'), L('prices.json'), L('kv.json')
nv = dict(P['nv'])
# prose numbers
ok('top 1% share', num(nv['skew.share_top.1%']), round(sk['share_top']['1%'] * 100))
ok('top 0.1% share', num(nv['skew.s01']), round(sk['share_top']['0.1%'] * 100))
ok('viewed once share', num(nv['skew.once_share']), round(sk['once'] / sk['pages'] * 100))
ok('delete stale share', num(nv['race.strategies.delete.stale_share']), round(race['strategies']['delete']['stale_share'] * 100))
lru = next(r for r in ev['runs'] if r['work'] == 'wiki' and r['policy'] == 'allkeys-lru' and r['cap_keys'] == 50000 and r['samples'] == 5)
lfu = next(r for r in ev['runs'] if r['work'] == 'wiki' and r['policy'] == 'allkeys-lfu' and r['cap_keys'] == 50000 and r['samples'] == 5)
ok('LFU minus LRU at 50k (points)', num(nv['ev_note.lfu_gain_50k']), round((lfu['hit'] - lru['hit']) * 100, 1))
ok('MV speedup', num(nv['pg_note.mv_speedup']), round(pg['mv']['raw_query']['median_ms'] / pg['mv']['mv_query']['median_ms']))
ok('memoize ratio', num(nv['pg_note.memo_ratio']), round(pg['memo']['planner_default']['ms_median'] / pg['memo']['nested_loop_memoize']['ms_median'], 1), 0.05)
ok('read time per block (us)', num(nv['pg_note.read_us']), round(pg['warm']['after_restart']['read_ms'] / pg['warm']['after_restart']['blks_read'] * 1000))
i90 = sem['thresholds'].index(0.9)
mini = sem['models']['sentence-transformers/all-MiniLM-L6-v2']
ok('MiniLM FPR at 0.90', num(nv['sem_note.mini_fpr90']), round(mini['qqp_pairs']['fpr'][i90] * 100))
# break-even for every model: n* = 1 + (w - 1)/(1 - r) + storage / (input - read), in input-price ratios
for i, m in enumerate(pr['models']):
    w, r = m['w'] / m['in'], m['r'] / m['in']
    n = 1 + (w - 1) / (1 - r) + (m['store'] / (m['in'] - m['r']) if m['store'] else 0)
    txt = P['be_%d' % i]
    ok('break-even ' + m['m'], float(re.search(r'([0-9.]+) uses', txt).group(1)), round(n, 2))
    M = 10000 / 1e6
    if not (m['min'] and 10000 < m['min']):
        cost = M * m['w'] + M * m['r'] + (M * m['store'] if m['store'] else 0)
        sv = round((1 - cost / (2 * M * m['in'])) * 100, 1)
        got = re.search(r'Saved\s+([0-9.]+)%', txt)
        ok('saving at 2 uses ' + m['m'], float(got.group(1)) if got else -float(re.search(r'costs ([0-9.]+)% more', txt).group(1)), sv)
ok('Anthropic Sonnet 5.5 break-even (old page said 1.3 reads)', round(1 + 0.25 / 0.9, 2), 1.28)
ok('81% of input bill removed', round(0.9 * (1 - 0.1), 2), 0.81)
# race table
for s, r in race['strategies'].items():
    ok('race stale ' + s, r['stale'], r['stale'])
    assert ('%d / %d' % (r['stale'], race['trials'])) in P['race_tbl'], s
# cost-weighted hit ratio rows of the section 6 table
c1, c2 = sim['costs_ms']['cheap'], sim['costs_ms']['expensive']
cw = lambda r: (r['hit_cheap'] * (1 - r['exp_share']) * c1 + r['hit_exp'] * r['exp_share'] * c2) / ((1 - r['exp_share']) * c1 + r['exp_share'] * c2)
gd = next(r for r in sim['runs'] if r['work'] == 'wiki' and r['policy'] == 'greedydual' and r['cap_keys'] == 50000)
row = [l for l in P['cw_tbl'].splitlines() if l.startswith('GreedyDual')][0]
ok('GreedyDual CWHR at 50k', float(row.split('\t')[3].rstrip('%')), round(cw(gd) * 100, 1))
ok('GreedyDual hit at 50k', float(row.split('\t')[2].rstrip('%')), round(gd['hit'] * 100, 1))
# semantic lab: served = p*TPR + (1-p)*FPR at p = 0.37, t = 0.90
t = mini['qqp_pairs']; served = 0.37 * t['tpr'][40] + 0.63 * t['fpr'][40]
ok('Threshold lab served (MiniLM, QQP, 0.90, 37%)', float(re.search(r'Served from cache\s+([0-9.]+)%', P['semlab_mini_qqp_40']).group(1)), round(served * 100, 1))

# section 6: hit-rate arithmetic (1,000 reads a second, 600 capacity, measured Redis GET and usage aggregate)
TC, TD = pg['costs']['redis_get']['median_ms'], pg['costs']['usage_aggregate']['median_ms']
for h in (0, 40, 95, 90):
    txt = P['hit_%d' % h]; hh = h / 100
    ok('hit %d%%: database reads' % h, float(re.search(r'Database reads a second\s+([0-9,]+)', txt).group(1).replace(',', '')), round((1 - hh) * 1000))
    ok('hit %d%%: mean latency' % h, float(re.search(r'Mean latency\s+([0-9.]+) ms', txt).group(1)), round(hh * TC + (1 - hh) * (TC + TD), 2))
# section 7: jitter peak = 10,000 / (300 j)
for i, j in enumerate([0, 0.01, 0.02, 0.05, 0.1, 0.2]):
    ok('jitter %g peak' % j, float(re.search(r'Peak expiries a second\s+([0-9,]+)', P['jit_%d' % i]).group(1).replace(',', '')), round(10000 / (300 * j)) if j else 10000)
# section 7: stampede, Python twin of 30_js_rd_stamp.js (Capacity planning's model.py stampede plus serve-stale)
import math
def mulberry32(a):
    a &= 0xffffffff
    def f():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xffffffff; t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xffffffff
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    return f
def stampede(mode, rate=200, rec=0.3, horizon=2.0, seed=5, beta=1.0):
    rnd = mulberry32(seed); exp_at, pending, db, t, waits, stale = 1.0, None, 0, 0.0, [], 0
    while t < horizon:
        if pending is not None and pending <= t: exp_at = pending + 10.0; pending = None
        if mode == 'xfetch' and t < exp_at:
            u = 1 - rnd()
            if pending is None and t - rec * beta * math.log(u) >= exp_at: db += 1; pending = t + rec; waits.append(rec)
            else: waits.append(0.0)
        elif t < exp_at: waits.append(0.0)
        elif mode == 'coalesce':
            if pending is None: db += 1; pending = t + rec
            waits.append(pending - t)
        elif mode == 'swr':
            if pending is None: db += 1; pending = t + rec
            waits.append(0.0); stale += 1
        else:
            db += 1; waits.append(rec)
            if pending is None or t + rec < pending: pending = t + rec
        t = math.floor((t + 1 / rate) * 1e9 + 0.5) / 1e9
    return db, max(waits), stale
for m, want in (('none', 60), ('coalesce', 1), ('swr', 1), ('xfetch', 1)):
    db, w, st = stampede(m)
    ok('stampede %s: queries (expected %d)' % (m, want), int(re.search(r'Database queries\s+([0-9]+)', P['st_' + m]).group(1)), db)
    assert db == want, (m, db)
    ok('stampede %s: longest wait' % m, float(re.search(r'Longest wait\s+([0-9]+) ms', P['st_' + m]).group(1)), round(w * 1000))
    ok('stampede %s: served old' % m, int(re.search(r'Served the old value\s+([0-9]+)', P['st_' + m]).group(1)), st)

# build-time prefill (prefill.py) must write exactly what 26_js_fill.js writes at run time
static = re.findall(r'<span class="nv" data-n="([^"]+)"[^>]*>([^<]*)</span>', open(os.path.join(H, '..', 'index.html')).read())
ok('static numbers equal run-time numbers (%d spans)' % len(static), sum(nv.get(k) != v for k, v in static), 0)
# the static summary of section 5 quotes the script-written findings: each number must appear there
for k in ['19 of 20', '10.1', 'within 2.0 points', '55.1%', '39.4%', '36.5%', '781,318']:
    ok('section 5 summary number ' + k, k in P['ev_find'], True)
bad = [c for c in checks if not c['ok']]
json.dump({'checks': checks, 'failed': len(bad)}, open(os.path.join(H, 'recompute_out.json'), 'w'), indent=1)
for c in bad: print('MISMATCH', c)
print(len(checks), 'checks,', len(bad), 'failed')
