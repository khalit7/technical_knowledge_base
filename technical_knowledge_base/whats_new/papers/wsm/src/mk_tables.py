"""Transcribe the paper's tables (arXiv HTML v2, extracted to inputs/table_*.txt by extract_paper.py) into tables.json.
Values are kept as printed strings (precision preserved); recompute.py does the arithmetic."""
import json, re
T = {}
# Tables 1 and 2 share the HTML figure S4.T2
T['t1'] = {'anchor': 'S4.T2', 'title': 'Table 1: Base model performance comparison (checkpoint with the highest average benchmark score)',
  'cols': ['General Knowledge', 'Language Modeling', 'Math', 'Code', 'Professional Knowledge', 'Overall Average'],
  'rows': {'WSD': ['69.06', '67.78', '57.49', '64.88', '53.46', '62.67'], 'WSM': ['70.22', '68.67', '58.81', '65.58', '56.04', '63.95']},
  'improv': ['+1.68%', '+1.31%', '+2.30%', '+1.08%', '+4.83%', '+2.04%']}
T['t2'] = {'anchor': 'S4.T2', 'title': 'Table 2: Instruct model performance comparison (epoch with the highest average benchmark score)',
  'cols': ['Language', 'Knowledge', 'Math', 'Code', 'Reason', 'Agent', 'Overall Average'],
  'rows': {'WSD': ['81.12', '60.00', '61.43', '58.23', '63.21', '68.16', '62.90'], 'WSM': ['84.78', '61.73', '62.28', '57.95', '64.94', '69.33', '64.07']},
  'improv': ['+4.51%', '+2.88%', '+1.38%', '-0.48%', '+2.74%', '+1.72%', '+1.86%']}
T['t3'] = {'anchor': 'S4.T3', 'title': 'Table 3: Impact of merging algorithm', 'cols': T['t1']['cols'],
  'rows': {'Decay (1-sqrt)': ['69.06', '67.78', '57.49', '64.88', '53.46', '62.67'], 'Merge: EMA': ['69.05', '67.64', '58.81', '64.19', '54.44', '63.01'],
           'Merge: Mean': ['70.22', '68.67', '58.81', '65.58', '56.04', '63.95'], 'Merge: 1-sqrt': ['70.27', '68.26', '59.65', '65.70', '55.42', '64.06']}}
T['t4'] = {'anchor': 'S4.T4', 'title': 'Table 4: Saving/merging intervals within an 80B-token merge duration ((5B,16) = save every 5B tokens, merge the latest 16)', 'cols': T['t1']['cols'],
  'rows': {'(5B,16)': ['69.46', '79.95', '57.07', '64.68', '53.82', '63.63'], '(10B,8)': ['69.23', '80.00', '57.94', '64.39', '53.78', '63.78'],
           '(20B,4)': ['69.29', '80.29', '56.79', '63.87', '54.19', '63.36'], '(40B,2)': ['68.47', '79.83', '56.57', '63.59', '52.20', '62.77'],
           '(80B,1)': ['67.47', '64.98', '55.07', '61.69', '51.61', '60.33']}}
T['t5'] = {'anchor': 'S4.T5', 'title': 'Table 5: Impact on MoE load balancing', 'cols': ['language modeling loss', 'mean_global_max_violation', 'mean_global_min_violation'],
  'rows': {'WSD': ['0.675', '0.601', '0.322'], 'WSM': ['0.697', '0.545', '0.201']}}
T['t6'] = {'anchor': 'A1.T6', 'title': 'Table 6: Detailed model architectures', 'cols': ['n_layers', 'd_model', 'd_ffn', 'd_expert', 'n_heads', 'n_kv_head', 'E', 'E_a', 'E_s', 'N', 'N_a'],
  'rows': {'Ling-mini': ['20', '2048', '5120', '512', '16', '4', '256', '8', '1', '16.3B', '1.43B']}}
# Tables 7 to 9: per-benchmark results, parsed from the extracted text
NUM = re.compile(r'-?\d+(\.\d+)?')
def parse(text, ncol, cats):
    t = text.split(); rows = []; cat = None; i = 0
    while i < len(t):
        hit = next((c for c in cats if t[i:i + len(c.split())] == c.split()), None)
        if hit: cat = hit; i += len(hit.split()); continue
        j = i
        while j < len(t) and not NUM.fullmatch(t[j]): j += 1
        name = ' '.join(t[i:j]); vals = t[j:j + ncol]
        if name and len(vals) == ncol and all(NUM.fullmatch(v) for v in vals): rows.append([cat, name] + vals)
        i = j + ncol if name else j + 1
    return rows
def body(f, after):
    t = ' '.join(open('inputs/' + f).read().split()); return t[t.index(after) + len(after):]
cats7 = ['General Knowledge & Reasoning', 'Language Understanding', 'Professional Knowledge', 'Math', 'Code']
T['t7'] = {'anchor': 'A5.T7', 'title': 'Table 7: Base models, WSD against WSM with three merging algorithms, per benchmark', 'cols': ['WSD', 'WSM EMA', 'WSM mean', 'WSM 1-sqrt'],
  'rows': parse(body('table_A5_T7.txt', 'EMA mean 1-sqrt'), 4, cats7)}
cats8 = ['Knowledge Basic Knowledge', 'Professional Knowledge', 'Code Code Completion', 'Code Generation', 'Math Elementary Mathematics', 'Intermediate Mathematics', 'Advanced Mathematics']
T['t8'] = {'anchor': 'A5.T8', 'title': 'Table 8: After SFT (5 epochs, best epoch): knowledge, code, math', 'cols': ['WSD', 'WSM'], 'rows': parse(body('table_A5_T8.txt', 'Metric WSD WSM'), 2, cats8)}
cats9 = ['Language Language Understanding', 'Reasoning Complex Reasoning', 'Agent Tool-use', 'Instruction Following']
T['t9'] = {'anchor': 'A5.T9', 'title': 'Table 9: After SFT (5 epochs, best epoch): language, reasoning, agent, instruction following', 'cols': ['WSD', 'WSM'], 'rows': parse(body('table_A5_T9.txt', 'Metric WSD WSM'), 2, cats9)}
json.dump(T, open('tables.json', 'w'), indent=1)
for k in ('t7', 't8', 't9'):
    print(k, len(T[k]['rows'])); [print('  ', r) for r in T[k]['rows']]
