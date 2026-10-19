"""Transcribe the tables and decoded figures the page rebuilds into tables.json (printed precision kept).

  python3 mk_tables.py        (build.sh runs it; needs inputs/figs.json from decode_figs.py)

Printed tables are typed in from inputs/tables_v1.txt; figure values come from inputs/figs.json (vector paths) or are
the labels printed on the figure. Each entry names where it is in the paper (an arXiv HTML anchor).
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
FIG = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
M7 = ['CLM', 'Summary', 'MEM1', 'Self-Compact', 'ACM', 'RLM', 'Base']
T = {}
T['t1'] = dict(title='Table 1: mathematical optimisation, best of one run per method', at='S5.T1',
    cols=['Method', 'Circle packing (higher)', 'Heilbronn (higher)', 'Min-max/min-dist (higher)', 'Erdős overlap (lower)'],
    better=[None, 1, 1, 1, -1],
    rows=[['OpenEvolve', '2.541', '0.03127', '0.07690', '0.38123'], ['OpenEvolve-Agent', '2.525', '0.03053', '0.07724', '0.38167'],
          ['CLM', '2.618', '0.03653', '0.07758', '0.38094'], ['CLM with subagents', '2.636', '0.03617', '0.07758', '0.38109']],
    note='Claude 4.6 Sonnet, 32K context, at most 100 scored attempts or five hours, one run per method (Appendix E).')
T['t2'] = dict(title='Table 2: online RL on BrowseComp-Plus with Qwen3.5-9B (before and after training)', at='S5.T2',
    cols=['Method', 'Accuracy before (%)', 'Accuracy after (%)', 'PFLOPs per question before', 'PFLOPs per question after'],
    rows=[['Summary harness', '34.7', '42.1', '4.01', '2.19'], ['CLM', '28.8', '42.5', '1.52', '1.34']],
    note='830 questions, one checkpoint each, selected on 500 held-out OpenResearcher questions. CLM trained with the efficiency advantage (weight 0.25) and tool-call penalties; the summary harness with the task reward alone (Appendix E).')
f5 = FIG['fig5']
T['f5'] = dict(title='Figure 5: accuracy against prefix-reuse PFLOPs per question, Qwen3.6-27B, 32K', at='S5.F5',
    bench={'bcp': 'BrowseComp-Plus', 'tb21': 'TerminalBench 2.1', 'tblite': 'TBLite'},
    data={k: {m: [f5[k][m]['acc'], f5[k][m]['pflops']] for m in M7 if m in f5[k]} for k in f5},
    amb={k: f5[k]['_ambiguity']['swap_if_wrong'] if f5[k]['_ambiguity']['margin_pt'] < 10 else [] for k in f5},
    note='Read from the figure\'s vector paths (decode_figs.py), calibrated on its tick marks; about 0.1 point and 0.01 PFLOPs. Method names are printed beside the circles; where the runner-up assignment is within 10 pt of total label distance, the pair could be swapped (marked). The Summary, MEM1 and CLM circles are confirmed by the numbers the text prints.')
f19 = FIG['fig19']
T['f19'] = dict(title='Figure 19 (top row): the same three benchmarks with Qwen3.5-9B', at='A6.F19',
    data={k[3:]: {m: [f19[k][m]['acc'], f19[k][m]['pflops']] for m in M7 if m in f19[k]} for k in f19 if k.startswith('9b')},
    amb={k[3:]: f19[k]['_ambiguity']['swap_if_wrong'] if f19[k]['_ambiguity']['margin_pt'] < 10 else [] for k in f19 if k.startswith('9b')},
    note='The BrowseComp-Plus panel has a broken x axis (ticks 0.0, 1.5, 3.0, then 7.0 after a break mark); points past the break have no readable cost (shown as "past 3"). RLM is not run for 9B; MEM1, Self-Compact and RLM are not run on TBLite.')
T['f8'] = dict(title='Figures 8 and 27: EdgeBench-10 and Software World (printed end labels)', at='S5.F8',
    cols=['Setting', 'Method', 'Score', 'Prefix-reuse PFLOPs per trial'],
    rows=[['Qwen3.6-27B, 32K', 'CLM', '44.6', '179'], ['Qwen3.6-27B, 32K', 'CLM with subagents', '44.2', '181'], ['Qwen3.6-27B, 32K', 'Summary', '42.3', '437'], ['Qwen3.6-27B, 32K', 'Base', '21.8', '3'],
          ['Claude 4.6 Sonnet, 32K', 'CLM', '51.0', 'n/a'], ['Claude 4.6 Sonnet, 32K', 'CLM with subagents', '50.4', 'n/a'], ['Claude 4.6 Sonnet, 32K', 'Summary', '42.3', 'n/a'], ['Claude 4.6 Sonnet, 32K', 'Base', '24.2', 'n/a'],
          ['Qwen3.6-27B, 128K', 'CLM', '47.3', '142'], ['Qwen3.6-27B, 128K', 'CLM with subagents', '50.2', '219'], ['Qwen3.6-27B, 128K', 'Summary', '47.8', '222'],
          ['GPT-5.6-Sol, 272K, Software World', 'CLM swarm', '1.044 (geometric-mean speedup)', 'same spend'], ['GPT-5.6-Sol, 272K, Software World', 'Summary swarm', '1.026', 'same spend']],
    note='EdgeBench-10: ten tasks, best of three seeds per task, 12 hours each. Software World: one swarm per method, 17 held-out benchmarks; cost is API spend.')
T['f28'] = dict(title='Figure 28 and Appendix F: assisted skill evolution on ContextBench (Qwen3.6-27B agent)', at='A6.F28',
    cols=['Task', 'Development accuracy, no instruction (%)', 'Development accuracy, selected skill (%)'],
    rows=[['Needle Retention', '97.6', '100.0'], ['Sudoku Sketchpad', '45.3', '65.8'], ['KV Store', '22.3', '83.8'], ['Log Triage', '0.0', '100.0']],
    note='Held-out test split, KV Store only: 38.3% to 74.2% (102 instances, three seeds). The development split (102 instances, one seed) is the one used to select the skill.')
T['f9'] = dict(title='Figure 9: one sentence in the prompt (printed labels)', at='S5.F9',
    cols=['Instruction', 'Without it', 'With it'],
    rows=[['"Compact to 4k tokens once you reach Y tokens": context at first compaction, Y = 16k / 24k / 32k', 'n/a', '16.0k / 23.6k / 30.9k'],
          ['"Compact at sub-question boundaries": compacted within two turns of a boundary', '0.40', '0.88'],
          ['"Back up on disk before you compact": edits preceded by a backup', '0.00', '0.68 full (+0.09 partial)']],
    note='Claude 4.6 Sonnet on BrowseComp-Plus questions. The boundary rates are the two "within 2 turns" call-outs; which call-out belongs to which series is read from their order (the grey no-instruction series lower).')
T['scr'] = dict(title='Figures 11, 14 and 15: Suffix Cache Reuse on BrowseComp-Plus (Qwen3.6-27B, K = 6)', at='S5.F11',
    cols=['Turns', 'Serving', 'Prefix-cache hit (%)', 'Reused after reasoning stripping (%)', 'Reused after context edits (%)', 'Prefilled (%)'],
    rows=[['All turns', 'Standard SGLang', '72.9', 'n/a', 'n/a', '27.1'], ['All turns', 'Suffix Cache Reuse', '73.9', '5.3', '2.5', '18.3'],
          ['Edited turns', 'Standard SGLang', '24.2', 'n/a', 'n/a', '75.8'], ['Edited turns', 'Suffix Cache Reuse', '29.9', '19.3', '8.9', '41.8']],
    extra=[['Accuracy (%)', '60.2', '60.2'], ['Empirical prefix-reuse PFLOPs per question', '10.98', '7.14']],
    note='830 questions. Figure 11 prints the accuracy and PFLOPs; Figure 14 the token shares.')
f2 = FIG['fig2']
T['f2'] = dict(title='Figure 2: ContextBench pilot, GPT-5.4, 32K context', at='S3.F2',
    tasks={'needle': 'Needle Retention', 'sudoku': 'Sudoku Sketchpad', 'kv': 'KV Store', 'log': 'Log Triage'},
    data={t: {m: [[d['pressure'], d['acc']] for d in v] for m, v in f2[t].items()} for t in f2},
    note='Read from the vector paths (decode_figs.py), accuracy to about 0.01. Pressure is input volume over the 32K limit; levels between printed ticks are interpolated on the log axis (approximate, marked with a tilde). Four seeds a level, eight for some.')
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=0, ensure_ascii=False)
print('tables.json:', ', '.join(T))
