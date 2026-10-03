"""Parse the paper's tables from inputs/tables_v1.txt (arXiv HTML v1) into tables.json, keeping printed strings.
Also adds Figure 2 and Figure 4 values decoded by decode_figs.py. usage: python3 mk_tables.py"""
import re, json
T = open('inputs/tables_v1.txt').read()
sec = {m.group(1): T[m.end():] for m in re.finditer(r'=== (\S+)  \S+\n', T)}
for k in list(sec):
    nxt = sec[k].find('\n=== ')
    sec[k] = sec[k] if nxt < 0 else sec[k][:nxt]
    sec[k] = sec[k][:sec[k].rfind('Table ')]  # drop the caption
nums = lambda s, pat=r'(?<![\w.])\d+\.\d+(?![\w.])': re.findall(pat, s)
MIX = ['5s0f', '4s1f', '3s2f', '2s3f', '1s4f', '0s5f']
BEN = ['TB2', 'SB', 'TBPro']
out = {'source': 'https://arxiv.org/html/2608.14036v1', 'mixtures': MIX}
# Table 1: per pairing: raw x3, then 6 rows x (TB2 wf, TB2 sk, SB wf, SB sk, Pro wf, Pro sk)
v = nums(sec['S1.T1'], r'\d\.\d{4}')
assert len(v) == 2 * (3 + 36), len(v)
t1 = {}
for i, pair in enumerate(['codex', 'gemini']):
    w = v[i * 39:(i + 1) * 39]
    d = {'raw': dict(zip(BEN, w[:3]))}
    rows = [w[3 + 6 * r:9 + 6 * r] for r in range(6)]
    for b, bn in enumerate(BEN):
        d[bn] = {'workflow': [r[2 * b] for r in rows], 'skill': [r[2 * b + 1] for r in rows]}
    t1[pair] = d
out['T1'] = t1
# Table 4: 3 pools x 4 metrics x 5 k
v = nums(sec['S5.T4'])
assert len(v) == 60, len(v)
t4 = {}
for p, pool in enumerate(['random', 'similar', 'dissimilar']):
    t4[pool] = {m: v[p * 20 + j * 5:p * 20 + j * 5 + 5] for j, m in enumerate(['arm1_p', 'arm2_p', 'arm3_p', 'arm3_succ'])}
out['T4'] = t4; out['K'] = [5, 10, 20, 50, 100]
# Table 9 and 10
out['T9'] = re.findall(r'(\d+) / (\d+)', sec['A1.T9'])
out['T10'] = re.findall(r'([+-−]?\d\.\d{4})', sec['A1.T10'])
# Table 11: 12 modes x 3 arms
s = sec['A1.T11']
modes = re.findall(r'(SC\d)\s+(\w+)\s+([\d.]+)%\s+([\d.]+)%\s+([\d.]+)%', s)
assert len(modes) == 12, len(modes)
out['T11'] = [{'sc': a, 'mode': b, 'raw': c, 'wf': d, 'skill': e} for a, b, c, d, e in modes]
# Table 12
out['T12'] = [{'cond': c.strip(), 'source': src.strip(), 'succ': int(a), 'n': int(b), 'rate': r} for c, src, a, b, r in re.findall(r'\n\n([A-Z][\w -]+)\n\n([^\n]+?)\s*\n(\d+) / (\d+)\s*\n([\d.]+)%', sec['A1.T12'])]
# Table 13 absolute rows
out['T13'] = re.findall(r'(Raw trajectories|Workflow Memory|Skill)\s+([\d.]+)%\s+([\d.]+)K\s+([\d.]+)K\s+([\d.]+)K', sec['A1.T13'])
# Table 14: per pool: k=5 has 7 numbers? (top1 P, top3 P R F1, top5 dashes)
s = sec['A3.T14']
rows14 = []
for pool in ['Random', 'Similar', 'Dissimilar']:
    part = s[s.index(pool):]
    for k in [5, 10, 20, 50, 100]:
        pass
v = re.findall(r'(\d+\.\d|–)', s)
# sequence per pool: k5: top1, P,R,F1, -,-,-; others: top1,P,R,F1,P,R,F1
i = 0; t14 = {}
for pool in ['random', 'similar', 'dissimilar']:
    t14[pool] = []
    for k in [5, 10, 20, 50, 100]:
        t14[pool].append(v[i:i + 7]); i += 7
assert i == len(v), (i, len(v))
out['T14'] = t14
# Table 15: 2 pairings x 3 pools x 5 k x 7 numbers
v = nums(re.sub(r'Gemini-3.1-Pro-Preview|GPT-5.4', '', sec['A3.T15']))
assert len(v) == 2 * 15 * 7, len(v)
t15 = {}
for pi, pair in enumerate(['gemini', 'codex']):
    t15[pair] = {}
    for qi, pool in enumerate(['random', 'similar', 'dissimilar']):
        t15[pair][pool] = [v[(pi * 15 + qi * 5 + j) * 7:(pi * 15 + qi * 5 + j) * 7 + 7] for j in range(5)]
out['T15'] = t15; out['T15_cols'] = ['arm2_p', 'arm2_r', 'arm2_f1', 'arm3_p', 'arm3_r', 'arm3_f1', 'arm3_succ']
# Table 16
v = nums(sec['A3.T16'], r'\d\.\d{4}')
assert len(v) == 2 * 3 * 2 * 6, len(v)
t16 = {}
for pi, pair in enumerate(['codex', 'gemini']):
    t16[pair] = {}
    for bi, b in enumerate(BEN):
        base = (pi * 6 + bi * 2) * 6
        t16[pair][b] = {'normal': v[base:base + 6], 'nohint': v[base + 6:base + 12]}
out['T16'] = t16
# Figures decoded
f2 = json.load(open('inputs/fig2_decoded.json'))
out['F2'] = {arm: {m: {k: int(round(x)) for k, x in segs.items()} for m, segs in r.items()} for arm, r in f2['panels'].items()}
f4 = json.load(open('inputs/fig4_decoded.json'))
out['F4'] = {'raw': 56, 'workflow': {}, 'skill': {}, 'note': 'printed integer labels; bar tops decoded from the vector PDF agree to 0.15 point (the axis offset)'}
for m, bars in f4['bars'].items():
    bars = [b for b in bars if b['value'] < 89]  # drop the legend swatches
    out['F4']['workflow'][m] = round(bars[0]['value']); out['F4']['skill'][m] = round(bars[1]['value'])
json.dump(out, open('tables.json', 'w'), indent=1)
print('ok')
