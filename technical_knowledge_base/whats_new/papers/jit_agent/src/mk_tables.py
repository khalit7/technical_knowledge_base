"""Parse the paper's tables from inputs/tables_v2.txt (extract_paper.py) and the decoded figures (inputs/figs.json) into tables.json.
Nothing is retyped: every number comes from the arXiv HTML v2 or the e-print's vector figures. Also checks v1's tables agree."""
import json, re
def blocks(path):
    s = open(path).read(); out = {}
    for b in s.split('=== ')[1:]:
        k = b.split()[0]; out[k] = [re.sub(r'\s+', ' ', t).strip() for t in re.split(r'[\n\t]', b) if t.strip()]
    return out
B2 = blocks('inputs/tables_v2.txt'); B1 = blocks('inputs/tables_v1.txt')
isnum = lambda t: re.fullmatch(r'\$?[\d,]+(\.\d+)?', t) is not None
num = lambda t: float(t.replace('$', '').replace(',', ''))
cleanv1 = lambda toks: [re.sub(r'^\\cellcolor[a-z]+', '', t) for t in toks]

# Table 1: seed bank (13 rows x 4 modules)
t = B2['S3.T1']; i = t.index('ReAct [69]')
seeds = []
while i < len(t) and len(seeds) < 13:
    seeds.append({'name': re.sub(r'\s*\[\d+\]$', '', t[i]), 'M': t[i + 1], 'P': t[i + 2], 'A': t[i + 3], 'F': t[i + 4]}); i += 5
# Table 2: main results
cols = ['BC+', 'DSQA', 'xBench', 'AgentIF', 'PinchBench', 'Shop', 'Travel', 'Office', 'Odyssey']
def table2(toks):
    i = toks.index('Odyssey') + 1; rows = []
    while i < len(toks):
        name = toks[i]; vals = toks[i + 1:i + 10]
        if not all(isnum(v) for v in vals): break
        rows.append({'model': name, 'v': [num(v) for v in vals]}); i += 10
    return rows
T2 = table2(B2['S5.T2']); T2v1 = table2(cleanv1(B1['S4.T3'] if 'S4.T3' in B1 else B1[[k for k in B1 if k.endswith('T3')][0]]))
assert len(T2) == 10, len(T2)
assert [r['v'] for r in T2] == [r['v'] for r in T2v1], 'v1 and v2 Table 2 differ'
# Table 3: controlled harness comparison
def table3(toks):
    rows = []; bb = None; i = 0
    while i < len(toks):
        if toks[i] in ('DeepSeek-V4-Flash', 'Qwen3.6-Flash'): bb = toks[i]; i += 1; continue
        if bb and i + 9 < len(toks) and all(isnum(v) for v in toks[i + 1:i + 10]):
            v = [num(x) for x in toks[i + 1:i + 10]]
            rows.append({'backbone': bb, 'harness': toks[i], 'DSQA': v[0:3], 'xBench': v[3:6], 'AgentIF': v[6:9]}); i += 10; continue
        i += 1
    return rows
T3 = table3(B2['S5.T3']); T3v1 = table3(B1[[k for k in B1 if k.endswith('T4')][0]])
assert len(T3) == 12 and T3 == T3v1, (len(T3), len(T3v1))
# Table 4: paradigms
t = B2['A1.T4']; i = t.index('AutoHarness (Lou et al., 2026)'); T4 = []
while i < len(t):
    T4.append({'method': re.sub(r'\s*\(.*\)$', '', t[i]), 'cite': t[i], 'construction': t[i + 1], 'flags': [x == '✓' for x in t[i + 2:i + 6]]}); i += 6
assert len(T4) == 8, len(T4)
F = json.load(open('inputs/figs.json'))
out = {'_doc': 'Built by mk_tables.py from inputs/tables_v2.txt (arXiv HTML v2) and inputs/figs.json (decode_figs.py). v1 and v2 tables are identical (asserted).',
       'seeds': seeds, 't2cols': cols, 't2': T2, 't3': T3, 't4': T4, 'fig4': F['fig4'], 'fig6': F['fig6']}
json.dump(out, open('tables.json', 'w'), separators=(',', ':'))
print('tables.json: seeds', len(seeds), 't2', len(T2), 't3', len(T3), 't4', len(T4))
