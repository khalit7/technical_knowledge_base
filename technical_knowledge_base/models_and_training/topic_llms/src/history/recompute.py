"""Recompute every count, first, median and ratio the Release history tab and the Reading section
"How we got here" state, from ../data/release_history.json (after mk_data.py has applied the corrections).
Run from anywhere: python3 src/history/recompute.py
"""
import json, os, collections, statistics as st
H = os.path.dirname(os.path.abspath(__file__))
J = json.load(open(os.path.join(H, '..', 'data', 'release_history.json')))['rows']
R = [dict(m=j['model'], l=j['lab'], d=j['date'], k=j['kind'], o=j['open_weights'], t=j['total_params_B'],
          a=j['active_params_B'], lic=j['licence']) for j in J]
sk = lambda r: r['d'] if len(r['d']) == 10 else r['d'] + '-00'   # month-only rows sort to the start of their month
print('rows', len(R), 'open', sum(r['o'] for r in R), 'closed', sum(not r['o'] for r in R), 'labs', len({r['l'] for r in R}))
print('month-only', [r['m'] for r in R if len(r['d']) == 7])
print(collections.Counter(r['l'] for r in R).most_common())
for y in '2023 2024 2025 2026'.split():
    rs = [r for r in R if r['d'][:4] == y]; o = sum(r['o'] for r in rs)
    print(y, 'rows', len(rs), 'open', o, 'share %.0f%%' % (100 * o / len(rs)), 'labs shipping', len({r['l'] for r in rs}))
q = lambda r: (int(r['d'][:4]) - 2023) * 4 + (int(r['d'][5:7]) - 1) // 3
qs = collections.defaultdict(set)
for r in R: qs[q(r)].add(r['l'])
print('labs shipping per quarter', [(2023 + k // 4, k % 4 + 1, len(v)) for k, v in sorted(qs.items())])
print('rows per quarter', sorted(collections.Counter(q(r) for r in R).items()))
FIRST = {}
for tag in ['open', 'moe', 'reasoning', 'hybrid-attention', 'multimodal']:
    seen = {}
    for r in sorted(R, key=sk):
        ok = r['o'] if tag == 'open' else tag in r['k']
        if ok and r['l'] not in seen: seen[r['l']] = (sk(r), r['m'])
    FIRST[tag] = seen
    print('\nFIRST', tag, len(seen)); [print('  ', v, k) for k, v in sorted(seen.items(), key=lambda x: x[1])]
# the shared skeleton: labs whose rows so far include MoE, reasoning and hybrid attention
trio = ['moe', 'reasoning', 'hybrid-attention']
print('\nlabs with all three, by date of the third:')
for l in sorted({r['l'] for r in R}):
    if all(l in FIRST[t] for t in trio):
        print('  ', max(FIRST[t][l][0] for t in trio), l, [FIRST[t][l][0] for t in trio])
# reasoning spread: labs within N months of o1-preview
rs = sorted(v[0] for v in FIRST['reasoning'].values())
print('reasoning labs by 2025-05-12 (eight months after o1-preview):', sum(d <= '2025-05-12' for d in rs), 'by 2026-04-30:', sum(d <= '2026-04-30' for d in rs))
print('reasoning labs by 2025-01-12 (four months):', sum(d <= '2025-01-12' for d in rs))
sz = [r for r in R if r['t'] is not None]
print('\nwith size', len(sz), 'open with size', sum(r['o'] for r in sz), 'closed with size', [r['m'] for r in sz if not r['o']])
print('null size open', [r['m'] for r in R if r['o'] and r['t'] is None])
moe = [r for r in sz if r['a'] is not None and r['a'] != r['t']]
print('MoE rows with both sizes', len(moe), 'sparsity %.1f to %.1f' % (min(r['t'] / r['a'] for r in moe), max(r['t'] / r['a'] for r in moe)))
for y in '2023 2024 2025 2026'.split():
    o = [r for r in sz if r['o'] and r['d'][:4] == y]
    m = [r for r in o if r['a'] is not None and r['a'] != r['t']]
    print(y, 'open sized', len(o), 'max total', max(r['t'] for r in o), 'median total', st.median(r['t'] for r in o),
          'median active', st.median((r['a'] or r['t']) for r in o), 'MoE share of open sized %d/%d' % (len(m), len(o)))
rec = 0
for r in sorted([r for r in sz if r['o']], key=sk):
    if r['t'] > rec: rec = r['t']; print('  open record', r['d'], r['m'], r['t'])
print('record growth 65.2B -> %gB = %.0fx' % (rec, rec / 65.2))
# licences (this page's four groups)
def grp(r):
    l = r['lic'] or ''
    if not r['o']: return 'closed'
    if (l.startswith('Apache 2.0') or l.startswith('MIT')) and 'Modified' not in l: return 'perm'
    if 'Modified MIT' in l or 'MIT-style' in l: return 'cond'
    if 'Non-commercial' in l or 'CC-BY-NC' in l or 'Research License' in l: return 'nc'
    return 'own'
for y in '2023 2024 2025 2026'.split():
    rs = [r for r in R if r['d'][:4] == y]
    print(y, collections.Counter(grp(r) for r in rs))
print(collections.Counter(r['lic'] for r in R if r['o']).most_common())
