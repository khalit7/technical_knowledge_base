"""Parse the paper's tables from inputs/tables_v2.txt (extract_paper.py's text of the arXiv HTML v2) into tables.json,
keeping the printed strings, and add the figure values decoded by decode_figs.py (inputs/figs.json).
usage: python3 mk_tables.py"""
import json, re

blocks = {}
for b in open('inputs/tables_v2.txt', encoding='utf-8').read().split('=== ')[1:]:
    head, body = b.split('\n', 1)
    blocks[head.split()[0]] = [x.strip() for x in body.split('\n') if x.strip()]


def rows(lines, start, ncols, stop):
    """Group the flat cell list into rows of ncols starting at the first cell equal to start."""
    i = lines.index(start); out = []
    while i < len(lines) and not lines[i].startswith(stop):
        out.append(lines[i:i + ncols]); i += ncols
    return out


clean = lambda s: re.sub(r'\s*\(.*?et al\.,? \d{4}[ab]?\)', '', s).replace('$H_{0}$', 'H0').replace('$\\Delta$', 'Δ').strip()
T = {}
L = blocks['S4.T1']
T['t1'] = {'cap': 'Table 1: comparison with prior harness evolution methods on agentic workspace tasks (Harvey LAB evolve and ID held-out are in distribution; JobBench, GDPval, APEX-Agents out of distribution).',
           'at': 'S4.T1', 'cols': ['Harvey LAB (Evolve)', 'Harvey LAB (ID Held-out)', 'JobBench', 'GDPval', 'APEX-Agents'],
           'rows': [[clean(r[0])] + r[1:] for r in rows(L, '$H_{0}$ (no evolution)', 6, 'Table')]}
L = blocks['S4.T2']
T['t2'] = {'cap': 'Table 2: ablation of the regularizers on agentic workspace tasks; OOD Avg. is the mean over JobBench, GDPval and APEX-Agents; tokens per trial in millions.',
           'at': 'S4.T2', 'cols': ['Harvey LAB (Evolve)', 'Harvey LAB (ID Held-out)', 'OOD Avg.', 'Tokens/trial (m)'],
           'rows': [[clean(r[0])] + r[1:] for r in rows(L, '$H_{0}$ (no evolution)', 5, 'Table')]}
L = blocks['S4.T3']
i = L.index('Claude Opus 4.8')
T['t3'] = {'cap': 'Table 3: policy robustness in the coding domain; evolution run independently with each frozen policy on Terminal-Bench 2.1, the harness evaluated unchanged on SWE-bench Verified.',
           'at': 'S4.T3', 'cols': ['Policy', 'Benchmark', 'H0', 'RRSI', 'Δ'],
           'rows': [[L[i]] + L[i + 1:i + 5], [L[i]] + L[i + 5:i + 9], [L[i + 9]] + L[i + 10:i + 14], [L[i + 9]] + L[i + 14:i + 18]]}
L = blocks['S4.T4']
T['t4'] = {'cap': 'Table 4: cross-model transfer on Terminal-Bench 2.1; the harness evolved with Gemini 3.5 Flash run unchanged with Gemini 3.1 Flash Lite.',
           'at': 'S4.T4', 'cols': ['Evaluation policy', 'H0', 'RRSI', 'Δ'],
           'rows': rows(L, 'Gemini 3.5 Flash (search policy)', 4, 'Table')}
L = blocks['A4.T5']
T['t5'] = {'cap': 'Table 5: hyperparameters used by RRSI in each evolution setting ("fixed without consulting held-out or OOD benchmarks").',
           'at': 'A4.T5', 'cols': ['Hyperparameter', 'Role', 'Coding', 'Agentic workspace', 'Engineering design'],
           'rows': [[r[0].replace('$', '').replace('\\mathrm{', '').replace('}', '').replace('{', '').replace('\\delta', 'δ').replace('\\beta_', 'β_').replace('\\min', 'min').replace('\\max', 'max')] + r[1:] for r in rows(L, '$T$', 5, 'Table')]}
L = blocks['A5.T6']
i = L.index('Coding, R0-A')
T['t6'] = {'cap': 'Table 6: representative harness-evolution decisions from RRSI.', 'at': 'A5.T6',
           'cols': ['Domain / Round', 'Harness change', 'Outcome', 'What it illustrates'],
           'rows': [[re.sub(r'\$([^$]*)\$', r'\1', x).replace('\\rightarrow', '→').replace('\\%', '%') for x in L[j:j + 4]] for j in range(i, i + 16, 4)]}
F = json.load(open('inputs/figs.json'))
T['fig1a'] = F['fig1a']; T['fig4a'] = F['fig4a']
T['fig1bcd'] = {'labels': F['fig1bcd_labels'], 'panels': ['SWE-bench Verified', 'JobBench, GDPval, APEX-Agents (mean)', 'Frontier-Eng'], 'order': ['H0', 'prior average', 'RRSI']}
T['fig4b'] = {'steps': {'H0': 21.2, 'RRSI': 26.3, 'TTHE': 27.3, 'Meta-Harness': 28.7, 'HarnessX': 29.5, 'AHE': 34.6}, 'how': 'printed bar labels, figures/efficiency.pdf'}
T['fig3'] = {'how': 'printed labels, figures/main_results.pdf',
             'bars': [['Coding', 'Terminal-Bench 2.1', 'Evolve', 74.2, 80.2], ['Coding', 'SWE-bench Verified', 'OOD', 82.0, 83.8],
                      ['Agentic workspace', 'Harvey LAB', 'Evolve', 89.4, 90.5], ['Agentic workspace', 'Harvey LAB', 'ID held-out', 86.9, 89.2],
                      ['Agentic workspace', 'JobBench', 'OOD', 36.0, 40.7], ['Agentic workspace', 'GDPval', 'OOD', 48.8, 52.3],
                      ['Agentic workspace', 'APEX-Agents', 'OOD', 34.2, 37.9], ['Engineering design', 'EngDesign', 'Evolve', 50.0, 54.9],
                      ['Engineering design', 'Frontier-Eng', 'OOD', 17.7, 22.0]]}
lab = [w[0] for w in F['fig3_labels']]
for b in T['fig3']['bars']:  # every bar value is printed in the PDF's text layer
    assert '%.1f' % b[3] in lab and '%.1f' % b[4] in lab, b
json.dump(T, open('tables.json', 'w'), ensure_ascii=False, indent=1)
for k in ('t1', 't2', 't3', 't4', 't5', 't6'): print(k, T[k]['rows'][:2] if k != 't6' else T[k]['rows'][0][:1], len(T[k]['rows']))
