"""Transcribe the paper's Tables 1 to 10 from the arXiv HTML text extracts (inputs/table_*.txt) into tables.json.
Values are kept exactly as printed (strings like "36.2%"; "-" for missing). Column headers are set here by hand, from the
same extracts; the row data are parsed, not retyped. Table 5's two grey cells (majority vote over 32 samples, not top-1)
are flagged from the HTML's colour attribute (#808080). usage: python3 mk_tables.py"""
import json, re
def blocks(f):
    s = open('inputs/' + f).read().split('\n', 2)[2]
    s = s[:s.index('Table ')] if 'Table ' in s else s
    out = []
    for b in re.split(r'\n\s*\n', s):
        cells = [c.strip().rstrip('|').strip() for c in re.split(r'[\n\t]', b) if c.strip().strip('|').strip()]
        if cells: out.append(cells)
    return out
GROUPS = {'Closed-Source Base Model', 'Open-Source Base Model', 'Closed-Source Model', 'Open-Source Model', 'Two-Stage Training', 'One-Stage Training'}
def rows(f, ncols):
    """Data rows: blocks ending in ncols values; a one-cell block is a group label."""
    res, grp = [], ''
    for b in blocks(f):
        if len(b) == 1:
            if b[0] in GROUPS: grp = b[0]
            continue
        vals = b[-ncols:]
        if all(re.fullmatch(r'-?[\d.]+%|-|–|N/A|[\d.]+B', v) for v in vals) and len(b) > ncols:
            res.append({'group': grp, 'label': ' '.join(b[:-ncols]), 'v': vals})
    return res
EN8 = ['GSM8K', 'MATH', 'OCW', 'SAT', 'MMLU-STEM', 'CMATH', 'Gaokao-MathCloze', 'Gaokao-MathQA']
T = {}
T['T1'] = {'anchor': 'S2.T1', 'title': 'Table 1: DeepSeek-LLM 1.3B trained for 150B tokens on each math corpus (few-shot chain-of-thought)', 'cols': ['Size'] + EN8, 'rows': rows('table_S2_T1.txt', 9)}
T['T2'] = {'anchor': 'S2.T2', 'title': 'Table 2: base models, chain-of-thought prompting (Minerva quoted from Lewkowycz et al.)', 'cols': EN8, 'rows': rows('table_S2_T2.txt', 8)}
T['T3'] = {'anchor': 'S2.T3', 'title': 'Table 3: base models with tools (program-of-thought) and informal-to-formal proving in Isabelle', 'cols': ['GSM8K+Python', 'MATH+Python', 'miniF2F-valid', 'miniF2F-test'], 'rows': rows('table_S2_T3.txt', 4)}
T['T4'] = {'anchor': 'S2.T4', 'title': 'Table 4: general language understanding, reasoning and code (dagger: the Coder checkpoint before learning-rate decay, the one DeepSeekMath starts from)', 'cols': ['MMLU', 'BBH', 'HumanEval', 'MBPP'], 'rows': rows('table_S2_T4.txt', 4)}
T['T5'] = {'anchor': 'S3.T5', 'title': 'Table 5: instruction-tuned and RL models, top-1 accuracy (grey: majority vote over 32 samples)', 'cols': ['GSM8K', 'MATH', 'MGSM-zh', 'CMATH'], 'rows': rows('table_S3_T5.txt', 4)}
T['T6'] = {'anchor': 'S5.T6', 'title': 'Table 6: code and math training at 1.3B, mathematical reasoning without and with tools', 'cols': ['General', 'Code', 'Math', 'GSM8K', 'MATH', 'CMATH', 'GSM8K+Python', 'MATH+Python'], 'rows': rows('table_S5_T6.txt', 8)}
T['T7'] = {'anchor': 'S5.T7', 'title': 'Table 7: the same models on language understanding, reasoning and code', 'cols': ['General', 'Code', 'Math', 'MMLU', 'BBH', 'HumanEval', 'MBPP'], 'rows': rows('table_S5_T7.txt', 7)}
T['T8'] = {'anchor': 'S5.T8', 'title': 'Table 8: math training on arXiv-only corpora (1.3B for 150B tokens; 7B for 40B tokens)', 'cols': EN8, 'rows': rows('table_S5_T8.txt', 8)}
T['T9'] = {'anchor': 'S5.T9', 'title': 'Table 9: arXiv-only training and informal-to-formal proving, DeepSeek-Coder-Base-v1.5 7B', 'cols': ['miniF2F-valid', 'miniF2F-test'], 'rows': rows('table_S5_T9.txt', 2)}
# Table 5: split the Chain-of-Thought and Tool-Integrated halves; group labels carry closed/open
half = 'CoT'
for r in T['T5']['rows']:
    pass
b5 = blocks('table_S3_T5.txt'); half = None; k = 0
for b in b5:
    if b == ['Chain-of-Thought Reasoning']: half = 'Chain-of-thought'
    if b == ['Tool-Integrated Reasoning']: half = 'Tool-integrated'
    if len(b) > 4 and k < len(T['T5']['rows']) and ' '.join(b[:-4]) == T['T5']['rows'][k]['label']:
        T['T5']['rows'][k]['half'] = half; k += 1
for r in T['T5']['rows']:
    r['grey'] = [r['label'] in ('Gemini Ultra -', 'Gemini Pro -') and i == 0 for i in range(4)]
# Table 8: carry the model name down the arXiv-corpus rows
cur = ''
for r in T['T8']['rows']:
    m = re.match(r'(DeepSeek-LLM 1\.3B|DeepSeek-Coder-Base-v1\.5 7B) (.*)', r['label'])
    if m: cur = m.group(1); r['label'] = m.group(2)
    r['group'] = cur
T['T10'] = {'anchor': 'S5.T10', 'title': 'Table 10: data source, reward function and gradient coefficient of each method', 'cols': ['Data source', 'Reward', 'Gradient coefficient'],
            'rows': [{'label': 'SFT', 'v': ['q, o ~ P_sft(Q, O)', '-', '1']}, {'label': 'RFT', 'v': ['q ~ P_sft(Q), o ~ π_sft(O|q)', 'Rule', 'Equation 10']},
                     {'label': 'DPO', 'v': ['q ~ P_sft(Q), o+, o- ~ π_sft(O|q)', 'Rule', 'Equation 14']}, {'label': 'Online RFT', 'v': ['q ~ P_sft(Q), o ~ π_θ(O|q)', 'Rule', 'Equation 10']},
                     {'label': 'PPO', 'v': ['q ~ P_sft(Q), o ~ π_θ(O|q)', 'Model', 'Equation 18']}, {'label': 'GRPO', 'v': ['q ~ P_sft(Q), {o_i} ~ π_θ(O|q)', 'Model', 'Equation 21']}]}
for k in ('T2', 'T3', 'T4', 'T5'):
    for r in T[k]['rows']:
        r['label'] = r['label'].replace(' ${\\dagger}$', ' †')
        m = re.fullmatch(r'(.*) (\d+B|-)', r['label'])
        if m: r['label'], r['size'] = m.group(1), m.group(2)
src = open('inputs/table_S5_T10.txt').read()
for r in T['T10']['rows']: assert r['v'][1] in src and r['label'] in src
json.dump(T, open('tables.json', 'w'), indent=1, ensure_ascii=False)
for k, t in T.items(): print(k, len(t['rows']), [r['label'] for r in t['rows']][:12])
