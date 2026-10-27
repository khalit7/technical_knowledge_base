"""Build tables.json from the paper's own text: tables parsed from inputs/tables_v1.txt (extract_paper.py) and
figure values from inputs/figs.json (decode_figs.py: printed labels, and Figure 3's bars read from vector rectangles).
Printed strings are kept as printed; nothing is typed by hand except the row order of Figure 6, which is the
figure's own order.  usage: python3 mk_tables.py"""
import json, re

S = open('inputs/tables_v1.txt').read()
FG = json.load(open('inputs/figs.json'))

def tab(tid):
    i = S.index('=== ' + tid); j = S.find('=== ', i + 5)
    t = S[i:j if j > 0 else None]
    return t[t.index('\n'):]            # drop the '=== id url' line (its arXiv number would match number patterns)

def cells(tid, start):
    t = tab(tid); t = t[t.index(start):]
    return [c.strip() for c in re.split(r'\t|\n\n', t) if c.strip()]

T = {}
# ---- Table 11: completion and refusal for 39 models (two side-by-side column groups) ----
c = cells('A8.T11', 'DeepSeek-V4-Pro')
rows = []
i = 0
while i + 3 < len(c) and len(rows) < 39:
    if re.fullmatch(r'[\d.]+', c[i + 1] or '') and re.fullmatch(r'[\d.]+', c[i + 2]) and re.fullmatch(r'\d+', c[i + 3]):
        rows.append([c[i], c[i + 1], c[i + 2], c[i + 3]]); i += 4
    else: i += 1
T['T11'] = rows
# ---- Figure 3 (decoded): four-way shares for the same 39 models ----
T['F3'] = FG['fig3']

def words(f): return [w[2] for w in FG[f]]
# ---- Figure 4: R@10/day for 37 semantic and 3 classical monitors on the GPT-5.3 single-day corpus ----
w = words('fig_monitor_ranking')
nums = [x for x in w if re.fullmatch(r'0\.\d{3}', x)]
names = []
cur = []
for x in w:
    if x in ('R@10/day',) or re.fullmatch(r'0\.\d', x) or re.fullmatch(r'0\.\d{3}', x) or x in ('semantic', 'monitor', 'classical', '/'): continue
    names.append(x)
# names come out word by word; rebuild from the figure's label lines (same y = same label)
lab = {}
for x0, y, t in FG['fig_monitor_ranking']:
    if re.fullmatch(r'0\.\d+', t) or t in ('R@10/day', 'semantic', 'monitor', 'classical'): continue
    lab.setdefault((x0 > 395, round(y)), []).append((x0, t))
lines = sorted(lab.items(), key=lambda kv: (kv[0][0], -kv[0][1]))
mon = [' '.join(t for x0, t in sorted(v)) for k, v in lines]
mon = [m for m in mon if m and not m.startswith('semantic') and m != 'classical monitor']
T['F4'] = [[m, v] for m, v in zip(mon, nums)]
# ---- Table 12: AUROC / R@10/day, 4 generators x 3 monitors x 5 columns ----
c = cells('A9.T12', 'GPT-5.3\t')
out, gen = [], None
k = 0
while k < len(c):
    if c[k] in ('GPT-5.3', 'Kimi', 'Qwen', 'DeepSeek'): gen = c[k]; k += 1; continue
    if c[k] in ('GPT-4.1-mini', 'GPT-4.1', 'GPT-5.5') and k + 5 < len(c):
        out.append([gen, c[k]] + c[k + 1:k + 6]); k += 6; continue
    k += 1
T['T12'] = out[:12]
# ---- Table 13: resampling intervals ----
t = tab('A9.T13')
T['T13'] = [[a, b.replace('$-$ ', '-'), c] for a, b, c in re.findall(r'(\-?\d\.\d{3})\t\n\[\s*(\$?\-?\$?\s*\-?\d\.\d{3})\s*,\s*(\d\.\d{3})\]', t)]
# ---- Figure 6: threat-level R@10/day, GPT-5.3 single-day (rows in the figure's order) ----
w = [x for x in words('fig_single_day_attacks') if re.fullmatch(r'\d\.\d\d', x)]
rowsF6 = ['Credential exfil.', 'IP theft', 'Weight exfil.', 'Sabotage', 'Release manip.', 'Privilege escalation', 'Data poisoning', 'Evaluation manip.', 'Fraud', 'Safety sabotage', 'ALL']
cols = ['z-score', 'peer-fit', 'FACADE', 'GPT-4.1-mini', 'GPT-4.1', 'GPT-5.5', 'best']
w = w[:len(rowsF6) * 7]
T['F6'] = {'cols': cols, 'rows': [[r] + w[i * 7:(i + 1) * 7] for i, r in enumerate(rowsF6)]}
# ---- Figure 5 / Table 12 are the same numbers; Figure 10 single-day observability ----
w = [x for x in words('fig_single_day_observability') if re.fullmatch(r'\d\.\d\d', x)]
T['F10'] = {'GPT-5.3': w[:12], 'Kimi': w[12:24]}
# ---- Figure 12: multiday rankings, printed values ----
T['F12'] = FG['fig_multiday_monitor_ranking']
# ---- Figure 7 / Table 19 cross-benchmark AUROC ----
T['T19'] = [['CERT r4.2', '0.753', '0.677'], ['OrgForge', '0.993', '0.998'], ['Mole', '0.694', '0.872']]
assert all(v in tab('A11.T19') for r in T['T19'] for v in r[1:])
# ---- Table 20, 21, 22 ----
c = cells('A11.T20', 'robust')
T['T20'] = [re.findall(r'\d\.\d{3}', tab('A11.T20'))[i * 3:(i + 1) * 3] for i in range(5)]
T['T20names'] = ['robust z-score', 'peer-fit', 'supervised, 20 audit features', 'supervised, audit + RQ5 statistics', 'GPT-5.5 semantic monitor']
T['T21'] = re.findall(r'(\d\.\d{3})/(\d\.\d{3})', tab('A11.T21'))
t = tab('A12.T22')
T['T22'] = re.findall(r'\n\n([^\n]+?)\n\n([^\n]+?)\n\n(\d\.\d\d)\t\n(\d\.\d{3})\*?\t\n(\d\.\d{3})(\*?)\t\n(\d\.\d{3})', t)
# ---- Table 7 (FACADE tuning, with the robust z-score reference), Table 6 (human validation) ----
T['T7'] = re.findall(r'(\d\.\d{3})', tab('A6.T7'))[:3]
T['T6'] = re.findall(r'(\d\.\d\d) \[(-?\d\.\d\d), (\d\.\d\d)\]', tab('A5.T6'))
# ---- Figure 8(a) and Figure 16, printed labels ----
T['F8'] = [x for x in words('fig_autoresearch') if re.fullmatch(r'\d\.\d+', x)]

# ---- Table 1 (threats, completed harm, techniques) and Table 4 (assigned objectives) ----
def idrows(tid, ncol):
    b = [x.strip() for x in tab(tid).split('\n\n')]
    out = []
    for i, x in enumerate(b):
        if re.fullmatch(r'(0\d|10|C1|C2)', x):
            out.append([x] + [' '.join(y.split()) for y in b[i + 1:i + ncol]])
    return out
T['T1'] = idrows('S2.T1', 4)
T['T4'] = idrows('A4.T4', 3)

# ---- Appendix J.1: classical monitors on the four multiday corpora (AUROC / R@10/day), from the text ----
P = open('inputs/paper_v1.txt').read()
seg = P[P.index('Classical-monitor rankings.'):P.index('J.2 Trace-level')]
v = re.findall(r'(0\.\d{3})/(0\.\d\d)', seg)
T['J1'] = {g: v[i * 3:(i + 1) * 3] for i, g in enumerate(['GPT-5.3', 'Kimi', 'Qwen', 'DeepSeek'])}
json.dump(T, open('tables.json', 'w'), indent=1, ensure_ascii=False)
print('T11', len(T['T11']), 'F3', len(T['F3']), 'F4', len(T['F4']), 'T12', len(T['T12']), 'T13', len(T['T13']), 'F6', len(T['F6']['rows']),
      'T21', len(T['T21']), 'T22', len(T['T22']), 'T6', len(T['T6']), 'T7', T['T7'])
