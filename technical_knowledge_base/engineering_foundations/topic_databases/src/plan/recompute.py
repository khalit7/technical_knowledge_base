"""Recompute every derived number the Query plans tab prints, straight from inputs/*.json, so the page's JavaScript can be checked.
Run: python3 recompute.py"""
import json, os
IN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs'); L = lambda f: json.load(open(os.path.join(IN, f)))
pages = lambda r: r['plan']['Plan']['Shared Hit Blocks'] + r['plan']['Plan']['Shared Read Blocks']
def pair(name, b, a):
    print(f'{name}: {pages(b):,} -> {pages(a):,} pages ({pages(b)/pages(a):.1f}x), {b["median_ms"]} -> {a["median_ms"]} ms ({b["median_ms"]/a["median_ms"]:.1f}x)')
c1 = L('c1.json'); pair('case 1 email', c1['before'], c1['after']); print('  index', c1['index_bytes'] / 2**20, 'MB')
c2 = L('c2.json'); pair('case 2 hour', c2['before'], c2['after']); print('  used', pages(c2['used']), c2['used']['median_ms'])
c3 = L('c3.json'); pair('case 3 date', c3['before'], c3['after']); pair('case 3 lower', c3['before2'], c3['after2'])
c4 = L('c4.json')
for k in c4: print(f'case 4 {k}: {c4[k]["median_ms"]} ms, {pages(c4[k]):,} pages, cost {c4[k]["plan"]["Plan"]["Total Cost"]}')
c5 = L('c5.json'); s = c5['single']; prod = s["country = 'US'"] * s["city = 'Chicago'"] * s["timezone = 'America/Chicago'"]
print(f'case 5 independence estimate {prod*1e5:.0f} users vs actual {c5["actual_users"]} ({c5["actual_users"]/(prod*1e5):.0f}x)')
def find(n, rel):
    if n.get('Relation Name') == rel: return n
    for c in n.get('Plans', []):
        r = find(c, rel)
        if r: return r
for k in ('before', 'after'):
    n = find(c5[k]['plan']['Plan'], 'users'); w = [x for x in [c5[k]['plan']['Plan']] + c5[k]['plan']['Plan'].get('Plans', []) if 'Workers Planned' in x][0]['Workers Planned']
    div = w + max(0, 1 - 0.3 * w); print(f'  {k}: users node est {n["Plan Rows"]} per process x divisor {div} = {n["Plan Rows"]*div:.0f}; actual {n["Actual Rows"]*n["Actual Loops"]}')
pair('case 5', c5['before'], c5['after'])
c6 = L('c6_pg.json'); d = L('c6_duck.json')
two = sum(c['compressed'] for c in d['parquet_columns'] if c['column'] in ('model', 'tokens'))
print(f'case 6 PG table {c6["table_bytes"]/2**30:.2f} GB, two parquet columns {two/2**20:.1f} MB, ratio {c6["table_bytes"]/two:.0f}x; '
      f'PG wall {c6["wall"]["median_ms"]} ms / duck {d["native_threads10"]["median_ms"]} ms = {c6["wall"]["median_ms"]/d["native_threads10"]["median_ms"]:.0f}x; '
      f'PG explain {c6["parallel"]["median_ms"]} ms; results equal: {[r.split("|")[0] for r in c6["result"].splitlines()] == [r[0] for r in d["result"]]}')
for r1, r2 in zip(c6['result'].splitlines(), d['result']): assert [float(x) for x in r1.split('|')[1:]] == r2[1:], (r1, r2)
c7 = L('c7_before.json'); pair('case 7', c7['before'], c7['after'])
c8 = L('c8.json')
for k in c8:
    if isinstance(c8[k], dict): p = c8[k]['plan']['Plan']; print(f'case 8 {k}: {c8[k]["median_ms"]} ms, hit {p["Shared Hit Blocks"]} read {p["Shared Read Blocks"]} io {p.get("I/O Read Time")}')
print('QORL: 1 - 1/1.81 =', round(1 - 1 / 1.81, 4), '; 99/113 =', round(99 / 113, 3), '; 81/113 =', round(81 / 113, 3))
