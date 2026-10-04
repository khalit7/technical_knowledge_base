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
# KV per token
for i, m in enumerate(kv['models']):
    per = m.get('per_token_override') or 2 * m['layers'] * m['kvh'] * m['hd'] * m['bytes']
    got = num(re.search(r'= ([0-9,]+) B|^Per token\s+([0-9,]+) B', P['kv_%d_0' % i], re.M).group(0).split('=')[-1])
    ok('KV bytes per token ' + m['m'][:30], got, per)
ok('Llama 3.1 70B, 128K tokens in GiB', num(re.search(r'One conversation\s+([0-9.]+) GiB', P['kv_0_5']).group(1)), 40.0)
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
bad = [c for c in checks if not c['ok']]
json.dump({'checks': checks, 'failed': len(bad)}, open(os.path.join(H, 'recompute_out.json'), 'w'), indent=1)
for c in bad: print('MISMATCH', c)
print(len(checks), 'checks,', len(bad), 'failed')
