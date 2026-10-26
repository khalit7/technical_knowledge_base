"""Build tables.json: the paper's three tables (transcribed from inputs/table_*.txt) and its bar charts
(decoded from the e-print's vector PDFs into inputs/figs.json by decode_figs.py).

  python3 mk_tables.py      (build.sh runs it)

Printed labels keep the paper's precision; values the paper did not print are the decoded bar heights,
rounded to 0.001 (accuracies) or 0.1 (points), and every table says which kind it holds.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
F = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))['figures']


def panel(fig, i):
    return F[fig]['panels'][i]


def bars(fig, i, color):
    return [b for b in panel(fig, i)['bars'] if b['color'] == color]


def pv(b, nd):
    """The printed label as a number when there is one, else the decoded value rounded."""
    if b.get('printed'):
        return float(b['printed'].replace('−', '-').replace('+', ''))
    return round(b['value'], nd)


T = {'_doc': 'Written by mk_tables.py from inputs/table_*.txt and inputs/figs.json; do not edit by hand.'}

# Figure 1: base model, students, teacher; ID (blue) and OOD (magenta); teacher from the dashed lines
f1 = []
for i, name in enumerate(['VGB / Dyck', 'VGB / Sokoban', 'A* / Sokoban']):
    B, M = bars('fig_main_results', i, 'blue'), bars('fig_main_results', i, 'magenta')
    L = {l['color']: l['value'] for l in panel('fig_main_results', i)['lines']}
    f1.append({'setting': name, 'rows': [
        {'arm': 'base model', 'id': pv(B[0], 3), 'ood': pv(M[0], 3)},
        {'arm': 'student from scratch', 'id': pv(B[1], 3), 'ood': pv(M[1], 3)},
        {'arm': 'student fine-tuned from base', 'id': pv(B[2], 3), 'ood': pv(M[2], 3)},
        {'arm': 'teacher (harness + base)', 'id': round(L['blue'], 3), 'ood': round(L['magenta'], 3), 'decoded': True}]})
T['fig1'] = {'anchor': 'S1.F1', 'title': 'Figure 1: same-size students against the teacher (0.68M-parameter models)', 'kind': 'printed bar labels (2 decimals); teacher lines decoded from the vector PDF', 'settings': f1}

# Figure 2b: VGB on Dyck, best student accuracy per size (decoded; no printed labels)
p = panel('fig3', 0)
B, M = bars('fig3', 0, 'blue'), bars('fig3', 0, 'magenta')
T['fig2b'] = {'anchor': 'S2.F2', 'title': 'Figure 2b: VGB on Dyck, best student accuracy at each size', 'kind': 'decoded from the vector PDF (no printed labels), 0.001',
              'params_M': [float(b['near_label']) if b['near_label'].replace('.', '').isdigit() else None for b in B],
              'id': [round(b['value'], 3) for b in B], 'ood': [round(b['value'], 3) for b in M], 'teacher': round(p['lines'][0]['value'], 3)}
T['fig2b']['params_M'] = [0.10, 0.16, 0.24, 0.44, 0.68, 2.32, 2.94, 5.65]  # the x labels, read in order from the PDF

# Figure 2c = Table 2's <BT> rows; Table 2 transcribed in full
T['table2'] = {'anchor': 'A1.T2', 'title': 'Table 2: simple-BT distillation on Dyck (accuracy)', 'kind': 'transcribed from the arXiv HTML',
               'cols': ['base', 'oracle-BT teacher', 'distilled, ID traces', 'distilled, α=0.25', 'distilled, α=0.50', 'distilled, OOD traces', 'synthetic BT, random errors', 'synthetic BT, ID errors'],
               'rows': [['one pass, ID', [0.947, None, 0.936, 0.957, 0.942, 0.947, 0.977, 0.840]],
                        ['one pass, OOD', [0.650, None, 0.133, 0.470, 0.313, 0.250, 0.637, 0.450]],
                        ['with <BT>, ID', [None, 0.996, 0.966, 0.970, 0.957, 0.957, 0.963, 0.933]],
                        ['with <BT>, OOD', [None, 0.873, 0.543, 0.677, 0.680, 0.637, 0.683, 0.697]]],
               'note': 'The column headers in the HTML read "base, oracle-BT, ID, α=0.25, α=0.50, OOD, random, ID" under the groups reference, distilled (trace source) and synthetic BT (errors from); the synthetic group has three sources in the text (OOD, random, ID) but two columns here, so the last two columns are read as random and ID.'}
B2, M2 = bars('fig3', 1, 'blue'), bars('fig3', 1, 'magenta')
T['fig2c'] = {'anchor': 'S2.F2', 'title': 'Figure 2c: simple backtracking is learned (Dyck, with the student\'s own <BT>)', 'kind': 'decoded; OOD bars carry printed labels',
              'arms': ['base (one pass)', 'ID-source traces', 'α = 0.25', 'α = 0.50'], 'id': [round(b['value'], 3) for b in B2], 'ood': [pv(b, 3) for b in M2],
              'teacher': {l['color']: round(l['value'], 3) for l in panel('fig3', 1)['lines'] if l['color'] in ('blue', 'magenta')}}

# Figure 3 and Figure 11: greedy against scaffold by training chain-of-thought length L
for key, fig, anchor, nops, Ls in (('fig3', 'fig4', 'S2.F3', 20, [0, 10, 15, 17, 18, 19, 20]), ('fig11', 'fig13', 'A1.F11', 10, [0, 4, 6, 8, 10])):
    B, M = bars(fig, 0, 'blue'), bars(fig, 0, 'magenta')
    T[key] = {'anchor': anchor, 'title': 'Figure %s: modular arithmetic, n_ops = %d: greedy decoding against the scaffold (K = 16, oracle verifier)' % ('3b' if key == 'fig3' else '11b', nops),
              'kind': 'printed bar labels (whole percent); decoded values to 0.1 beside them', 'n_ops': nops, 'L': Ls,
              'greedy': [pv(b, 1) for b in B], 'scaffold': [pv(b, 1) for b in M],
              'greedy_dec': [round(b['value'], 1) for b in B], 'scaffold_dec': [round(b['value'], 1) for b in M]}

# Figure 5a / 12e: tree shapes; Figure 12d: calls per shape
p5 = panel('fig6', 0)
G = [b for b in p5['bars'] if b['color'] == 'grey']
Mg, Bl = [b for b in p5['bars'] if b['color'] == 'magenta'], [b for b in p5['bars'] if b['color'] == 'blue']
shapes = ['(2,1)', '(3,1)', '(4,1)', '(2,2)', '(2,3)', '(3,2)', '(4,2)', '(3,3)', '(4,3)']
calls = [pv(b, 0) for b in panel('branching_all', 3)['bars']]
T['fig5a'] = {'anchor': 'S5.F5', 'title': 'Figure 5a (= Figure 12e): Branching on Qwen3-1.7B, teacher (multi-call) against student (one pass), pass@1 %', 'kind': 'printed bar labels; calls from Figure 12d',
              'base': pv(G[0], 1), 'shapes': shapes, 'calls': calls, 'teacher': [pv(b, 1) for b in Mg], 'student': [pv(b, 1) for b in Bl] + [None]}
# Figure 12 a-c: distillation knobs on the ks=[3] tree
T['fig12'] = {'anchor': 'A1.F12', 'title': 'Figure 12a to c: distillation settings on the ks=[3] tree (pass@1 %)', 'kind': 'printed bar labels; teacher and base lines decoded',
              'teacher': panel('branching_all', 0)['lines'][0]['value'], 'base': panel('branching_all', 0)['lines'][1]['value'],
              'clean_ratio': {'x': [0, 25, 50, 75, 100], 'student': [pv(b, 1) for b in panel('branching_all', 0)['bars']]},
              'traces': {'x': [134, 267, 535], 'student': [pv(b, 1) for b in panel('branching_all', 1)['bars']]},
              'epochs': {'x': [1, 2, 4], 'student': [pv(b, 1) for b in panel('branching_all', 2)['bars']]}}
# Figure 13
a, b, c = (panel('branching_capacity', i) for i in range(3))
T['fig13'] = {'anchor': 'A1.F13', 'title': 'Figure 13: what closes the gap on Qwen3', 'kind': 'printed bar labels; (c) intervals decoded from the error bars',
              'backbone': {'arms': ['teacher', '1.7B student', '4B student'], 'v': [pv(x, 1) for x in a['bars']]},
              'capacity': {'arms': ['teacher', 'LoRA r=16', 'LoRA r=64', 'full fine-tune'], 'v': [pv(x, 1) for x in b['bars']]},
              'qed': {'shapes': ['(1,4)', '(1,5)', '(1,6)', '(2,2)', '(3,3)'], 'calls': [5, 6, 7, 7, 40], 'gain': [round(x['value'], 1) for x in c['bars']],
                      'lo': [e['lo'] for e in c['errbars']], 'hi': [e['hi'] for e in c['errbars']],
                      'fits': [x['color'] == 'blue' for x in c['bars']]}}
# Figure 5b
pb = panel('fig6', 1)
T['fig5b'] = {'anchor': 'S5.F5', 'title': 'Figure 5b: QED-Nano, trace length and gain over one call', 'kind': 'trace lengths decoded (thousand tokens); gains printed',
              'shapes': ['(1,3)', '(1,4)', '(1,5)'], 'trace_k': [round(x['value'], 1) for x in pb['bars'] if x['color'] == 'blue'],
              'window_k': round([x['value'] for x in pb['bars'] if x['color'] == 'grey'][0], 1),
              'gain': [float(x['printed'].replace('−', '-').replace('+', '')) for x in pb['bars'] if x['color'] == 'magenta']}
# Figure 9: Sokoban size sweeps (decoded only)
T['fig9'] = {'anchor': 'A1.F9', 'title': 'Figure 9: best student accuracy at each size on Sokoban', 'kind': 'decoded from the vector PDF (no printed labels), 0.001', 'panels': []}
for i, (nm, xs) in enumerate((('A* / Sokoban', [0.10, 0.16, 0.44, 0.98, 1.77]), ('VGB / Sokoban', [0.10, 0.16, 0.24, 0.44, 0.68, 0.98, 2.94, 5.65]))):
    p = panel('ms_best', i)
    T['fig9']['panels'].append({'setting': nm, 'params_M': xs, 'id': [round(x['value'], 3) for x in p['bars'] if x['color'] == 'blue'],
                                'ood': [round(x['value'], 3) for x in p['bars'] if x['color'] == 'magenta'],
                                'teacher': [round(l['value'], 3) for l in p['lines']][:2]})
# Table 1 and Table 3, transcribed
T['table1'] = {'anchor': 'A1.T1', 'title': 'Table 1: student scales (width d / layers L / heads H, parameters)', 'kind': 'transcribed from the arXiv HTML',
               'rows': [['tiny', 32, 2, 4, 0.10], ['xsmall', 48, 2, 4, 0.16], ['small', 64, 2, 4, 0.24], ['s_plus', 96, 2, 4, 0.44], ['teacher', 128, 2, 4, 0.68], ['t_plus', 160, 2, 8, 0.98],
                        ['mini', 192, 3, 8, 1.77], ['m_m1', 224, 3, 8, 2.32], ['m_m2', 256, 3, 8, 2.94], ['medium', 256, 4, 8, 3.73], ['m_plus', 320, 4, 8, 5.65], ['large', 384, 6, 8, 11.5]]}
T['table3'] = {'anchor': 'A1.T3', 'title': 'Table 3: QED-Nano tree shapes and median full-trace length', 'kind': 'transcribed from the arXiv HTML',
               'rows': [['(1,4)', 4, '1', 5, '208k'], ['(1,5)', 5, '1', 6, '253k'], ['(1,6)', 6, '1', 7, '309k'], ['(2,2)', 4, '2+1', 7, '--'], ['(3,3)', 27, '13', 40, '≈ 1.4M']]}

json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables.json:', ', '.join(k for k in T if not k.startswith('_')))
