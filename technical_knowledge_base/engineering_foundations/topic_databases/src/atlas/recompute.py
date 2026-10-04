"""Independent checks of the atlas numbers and logic.
1. Arithmetic behind the claims (vector bytes, 100M and 10M totals).
2. Every TPS figure quoted in claims.json appears in inputs/pg_tps.json (the measurement), and vice versa for the ones quoted.
3. The chooser: re-implements the JS rules in Python from atlas.json and compares candidates with test_out.json (written by test_atlas.mjs).
4. Row hygiene: version dates not in the future, Jepsen and licence dates in order, no em-dash.
Run: python3 recompute.py  (after build_atlas.py and test_atlas.mjs)"""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__))
A = json.load(open(os.path.join(H, 'atlas.json')))
ok = bad = 0
def check(cond, msg):
    global ok, bad
    if cond: ok += 1
    else: bad += 1; print('FAIL', msg)
# 1. vector arithmetic (pgvector README: 4 * dimensions + 8 bytes)
b = 4 * 1536 + 8
check(b == 6152, 'bytes per 1536-d vector')
check(round(100e6 * b / 1e9) == 615, '100M vectors GB')
check(round(100e6 * b / 2**30) == 573, '100M vectors GiB')
check(round(10e6 * b / 1e9, 1) == 61.5, '10M vectors GB')
check(round(100e6 * (2 * 1536 + 8) / 1e9) == 308, 'halfvec 100M GB')
claims = {c['id']: c for c in A['claims']}
check('6,152' in claims['vec_bytes']['finding'] and '615 GB' in claims['vec_bytes']['finding'] and '573 GiB' in claims['vec_bytes']['finding'], 'vec claim text matches')
check('61.5 GB' in claims['pgv_10m']['finding'], '10M claim text matches')
# 2. TPS measurement quoted correctly
T = json.load(open(os.path.join(H, 'inputs', 'pg_tps.json')))
txt = claims['pg_tps']['finding']
for mode in ('default_sync', 'writethrough'):
    for r in T[mode]['runs']:
        check(f"{r['tps']:,}" in txt, f"pg_tps {mode} {r['clients']} clients {r['tps']} quoted")
# 3. chooser re-implemented
rows = A['rows']
def judge(r, a):
    c = r['ch']; ok_, no, soft = [], [], []
    if 'access' in a: (ok_ if a['access'] in c['acc'] else no).append('acc')
    if a.get('inv') == 'yes': (ok_ if c['txn'] == 'multi' else soft if c['txn'] == 'shard' else no).append('txn')
    if 'writes' in a: (ok_ if c['wr'] >= {'low': 1, 'mid': 2, 'high': 3}[a['writes']] else no).append('wr')
    if a.get('known') == 'no': (ok_ if c['flex'] else soft).append('flex')
    if a.get('known') == 'yes' and not c['flex']: ok_.append('fixed')
    if 'ops' in a: (ok_ if a['ops'] in c['ops'] else no).append('ops')
    return no
p = os.path.join(H, 'test_out.json')
if os.path.exists(p):
    t = json.load(open(p))
    for run in t['chooser']:
        exp = sorted(r['id'] for r in rows if not judge(r, run['combo']))
        check(exp == run['cand'], f"chooser {run['combo']}: py {exp} js {run['cand']}")
    for run in t['runs']:
        check(not run['errors'], f"puppeteer {run['scheme']} {run['width']} errors {run['errors']}")
        check(run['counts']['rows'] == len(rows), f"rows shown {run['counts']['rows']} vs {len(rows)}")
else:
    print('no test_out.json; run test_atlas.mjs first')
# 4. hygiene
for r in rows:
    if r['version_date']: check(r['version_date'] <= A['asof'], f"{r['id']} version date {r['version_date']} after as-of")
    for k in ('jepsen', 'licence_events'):
        ds = [e['date'] for e in r[k]]; check(ds == sorted(ds), f"{r['id']} {k} order")
        for d in ds: check(d <= A['asof'], f"{r['id']} {k} date {d} in future")
check('\u2014' not in json.dumps(A, ensure_ascii=False), 'no em-dash')
fam = {}
for r in rows: fam[r['family']] = fam.get(r['family'], 0) + 1
print('rows by family', fam)
print(f'{ok} checks passed, {bad} failed')
