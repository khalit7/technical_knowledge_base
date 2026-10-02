"""Parse the extracted table text (inputs/table_*.txt, from extract_paper.py) into tables.json, keeping the printed precision.
  python3 mk_tables.py
Each table becomes {"src": anchor, "caption", "head": [...], "rows": [[...]]}. Two-column-pair tables (A6, A7) are unfolded."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
def rows(tid):
    t = open(os.path.join(HERE, 'inputs', 'table_' + tid.replace('.', '_') + '.txt')).read().split('\n', 2)[2]
    blocks = [b for b in re.split(r'\n\s*\n', t) if b.strip()]
    out = []
    for b in blocks:
        cells = [c.strip().replace('$', '').strip() for c in b.split('\n') if c.strip()]
        out.append(cells)
    return out
def clean(c):
    c = c.replace('\\times', '×').replace('\\rightarrow', '→').replace('\;', ' ').replace('{', '').replace('}', '').replace('\\%', '%')
    c = re.sub(r'\\[a-z]+', '', c)
    return re.sub(r'\s+', ' ', c).strip()
T = {}
def put(name, tid, head, body, cap):
    T[name] = {'src': tid, 'caption': cap, 'head': head, 'rows': [[clean(c) for c in r] for r in body]}
r = rows('S1.T1'); put('t1', 'S1.T1', ['Model', 'Size (parameters)', 'Training tokens'], [x for x in r if len(x) == 3 and x[0] != 'Model' and not x[0].startswith('Table')], 'Table 1: current LLMs')
r = rows('S3.T2'); put('t2', 'S3.T2', ['Approach', 'a (N_opt ∝ C^a)', 'b (D_opt ∝ C^b)'], [x for x in r if len(x) == 3][1:], 'Table 2: exponents, 10th and 90th percentiles in parentheses')
r = rows('S3.T3'); put('t3', 'S3.T3', ['Parameters', 'FLOPs', 'FLOPs (Gopher units)', 'Tokens'], [x for x in r if len(x) == 4][1:], 'Table 3: Approach 1 projections')
r = rows('A4.T3'); put('a3', 'A4.T3', ['Parameters', 'A2 FLOPs', 'A2 tokens', 'A3 FLOPs', 'A3 tokens'], [x for x in r if len(x) == 5 and 'Parameters' not in x[0]], 'Table A3: Approach 2 and 3 projections')
r = rows('A6.T4'); put('a4', 'A6.T4', ['Parameters', 'num_layers', 'd_model', 'ffw_size', 'num_heads', 'k/q size', 'FLOP ratio (ours/6ND)'], [x for x in r if len(x) == 7][1:], 'Table A4: FLOP comparison')
r = rows('A1.T1'); put('a1', 'A1.T1', ['Subset', 'Disk size', 'Documents', 'Sampling proportion (Gopher)', 'Epochs in 1.4T tokens'], [x for x in r if len(x) == 5], 'Table A1: MassiveText data makeup')
r = rows('A3.T2'); put('a2', 'A3.T2', ['Dataset', 'a', 'b'], [x for x in r if len(x) == 3 and len(x[0]) < 30 and x[0] != 'Approach'], 'Table A2: IsoFLOP exponents on C4 and GitHub')
r = rows('A10.T9'); put('a9', 'A10.T9', ['Parameters (million)', 'd_model', 'ffw_size', 'kv_size', 'n_heads', 'n_layers'], [x for x in r if len(x) == 6 and x[0][0].isdigit()], 'Table A9: all models')
r = rows('A8.T5'); put('a5', 'A8.T5', ['Subset', 'Chinchilla (70B)', 'Gopher (280B)', 'Jurassic-1 (170B)'], [x for x in r if len(x) == 4][1:], 'Table A5: bits per byte on The Pile')
for nm, tid, cap in (('a6', 'A8.T6', 'Table A6: MMLU by task'), ('a7', 'A8.T7', 'Table A7: BIG-bench by task')):
    body = []
    for x in rows(tid):
        if x[0] == 'Task': continue
        for k in range(0, len(x) - 2, 3): body.append(x[k:k + 3])
    put(nm, tid, ['Task', 'Chinchilla', 'Gopher'], body, cap)
r = rows('S4.T4'); put('t4', 'S4.T4', ['Model', 'Layers', 'Heads', 'Key/value size', 'd_model', 'Max LR', 'Batch size'], [x for x in r if len(x) == 7][1:], 'Table 4: architecture')
r = rows('S4.T6'); put('t6', 'S4.T6', ['', 'MMLU 5-shot'], [x for x in r if len(x) == 2], 'Table 6: MMLU')
r = rows('S4.T7'); put('t7', 'S4.T7', ['Task', 'Chinchilla', 'Gopher', 'GPT-3', 'MT-NLG 530B'], [x for x in r if len(x) == 5], 'Table 7: reading comprehension')
r = rows('S4.T8'); put('t8', 'S4.T8', ['Task', 'Chinchilla', 'Gopher', 'GPT-3', 'MT-NLG 530B', 'Supervised SOTA'], [x for x in r if len(x) == 6], 'Table 8: common sense, zero-shot')
r = rows('S4.T9'); body = []; ds = ''
for x in r:
    if x[0] in ('Method',) or x[0].startswith('Table'): continue
    if not x[0].endswith('shot'): ds = x[0]; x = x[1:]
    body.append([ds] + x + ['-'] * (5 - len(x)) if len(x) < 5 else [ds] + x)
put('t9', 'S4.T9', ['Dataset', 'Shots', 'Chinchilla', 'Gopher', 'GPT-3', 'SOTA (open book)'], body, 'Table 9: closed-book question answering')
r = rows('S4.T10'); put('t10', 'S4.T10', ['Group', 'Chinchilla', 'Gopher'], [x for x in r if len(x) == 3], 'Table 10 (left): Winogender')
# hand-entered tables, each row with its source
T['t10r'] = {'src': 'S4.T10', 'caption': 'Table 10 (right): Winogender gotcha examples', 'head': ['Group', 'Chinchilla', 'Gopher'],
             'rows': [['Male gotcha', '62.5%', '59.2%'], ['Male not gotcha', '80.0%', '76.7%'], ['Female gotcha', '76.7%', '66.7%'], ['Female not gotcha', '82.5%', '75.8%']]}
T['models'] = {'_doc': 'Parameters N, training tokens D and release month of models on the Then and now timeline, each with its source.', 'rows': [
    ['GPT-3 175B', 175e9, 300e9, '2020-05', 'https://arxiv.org/html/2005.14165v1#S2.T1', '3c65c17b0d0d8193ac92c7648cfaca12'],
    ['Gopher 280B', 280e9, 300e9, '2021-12', 'https://arxiv.org/html/2203.15556v1#S1.T1', ''],
    ['MT-NLG 530B', 530e9, 270e9, '2022-01', 'https://arxiv.org/html/2203.15556v1#S1.T1', ''],
    ['Chinchilla 70B', 70e9, 1.4e12, '2022-03', 'https://arxiv.org/html/2203.15556v1#S1.T1', ''],
    ['LLaMA 7B', 6.7e9, 1.0e12, '2023-02', 'https://arxiv.org/abs/2302.13971', ''],
    ['LLaMA 65B', 65.2e9, 1.4e12, '2023-02', 'https://arxiv.org/abs/2302.13971', ''],
    ['Llama 2 7B', 7e9, 2e12, '2023-07', 'https://arxiv.org/html/2307.09288v2#S2.SS1', ''],
    ['Llama 3 8B', 8e9, 15e12, '2024-04', 'https://arxiv.org/html/2407.21783v3#S3', '3c65c17b0d0d81aca58ccb9d720b474e'],
    ['Gemma 2 9B', 9e9, 8e12, '2024-06', 'https://arxiv.org/html/2408.00118v3#S3', ''],
    ['Llama 3 405B', 405e9, 15.6e12, '2024-07', 'https://arxiv.org/html/2407.21783v3#S3.SS2.SSS1', '3c65c17b0d0d81aca58ccb9d720b474e'],
    ['DeepSeek-V3 (37B active)', 37e9, 14.8e12, '2024-12', 'https://arxiv.org/abs/2412.19437', '3c65c17b0d0d815fb8dac9ba1e35ab81']]}
T['repl'] = {'_doc': 'Estimates of a in N_opt ∝ C^a: this paper, its appendix, and later work. Kind: A1/A2/A3 as in the paper.', 'head': ['Study', 'Data', 'Method', 'a', 'b'], 'rows': [
    ['Kaplan et al. 2020', 'WebText2', 'frontier of fixed-schedule runs', '0.73', '0.27', 'https://arxiv.org/abs/2001.08361'],
    ['This paper, Approach 1', 'MassiveText', 'training-curve envelope', '0.50', '0.50', 'https://arxiv.org/html/2203.15556v1#S3.T2'],
    ['This paper, Approach 2', 'MassiveText', 'IsoFLOP parabolas', '0.49', '0.51', 'https://arxiv.org/html/2203.15556v1#S3.T2'],
    ['This paper, Approach 3', 'MassiveText', 'parametric fit', '0.46', '0.54', 'https://arxiv.org/html/2203.15556v1#S3.T2'],
    ['This paper, Appendix C', 'C4', 'IsoFLOP parabolas', '0.50', '0.50', 'https://arxiv.org/html/2203.15556v1#A3.T2'],
    ['This paper, Appendix C', 'GitHub code', 'IsoFLOP parabolas', '0.53', '0.47', 'https://arxiv.org/html/2203.15556v1#A3.T2'],
    ['Besiroglu et al. 2024', '240 points read off Figure 4', 'parametric fit, summed Huber', '0.513 (s.e. 0.018)', '0.487', 'https://arxiv.org/html/2404.10102v2#S3.T1'],
    ['This page', 'the same 240 points', 'parametric fit (SciPy and JS agree)', 'RC_SUM', '', 'tab:t-run'],
    ['This page', 'IsoFLOP points read off Figure 4', 'IsoFLOP parabolas', 'RC_A2', '', 'tab:t-read:s-a2'],
    ['DeepSeek LLM 2024', 'early in-house data', 'IsoFLOP (FLOPs per token, not N)', '0.450', '0.550', 'https://arxiv.org/html/2401.02954v1#S3.T4'],
    ['DeepSeek LLM 2024', 'current in-house data', 'IsoFLOP', '0.524', '0.476', 'https://arxiv.org/html/2401.02954v1#S3.T4'],
    ['DeepSeek LLM 2024', 'OpenWebText2', 'IsoFLOP', '0.578', '0.422', 'https://arxiv.org/html/2401.02954v1#S3.T4'],
    ['Llama 3 2024', 'Llama 3 mix', 'IsoFLOP, 6e18 to 1e22 FLOPs; tokens D* = 0.29 C^0.53', '0.47', '0.53', 'https://arxiv.org/html/2407.21783v3#S3.SS2.SSS1'],
    ['Porian et al. 2024', 'RefinedWeb, OpenWebText2', 'Kaplan setup with each cause removed, tuned per size', 'about 0.5', '', 'https://arxiv.org/html/2406.19146v1#S1']]}
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=0, ensure_ascii=False)
for k, v in T.items():
    if isinstance(v, dict): print(k, len(v['rows']), v['rows'][:2], v['rows'][-1:])
    else: print(k, v)
