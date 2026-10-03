"""Transcribe the paper's tables from the arXiv HTML text (inputs/paper_v1.txt, made by extract_paper.py) into tables.json,
keeping the printed precision (values stay strings as printed; '-' where the paper prints none).
usage: python3 mk_tables.py"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
T = [l.strip() for l in open(os.path.join(HERE, 'inputs', 'paper_v1.txt'), encoding='utf-8')]
T = [l for l in T if l]
JUDGES = ['GPT-4o', 'Prometheus-7B-v2.0', 'Llama-3-70B', 'Qwen2-72B', 'Mistral-Nemo', 'Llama-3-8B', 'Qwen2-7B', 'Mistral-7B-v0.3', 'Phi-3-mini-4k', 'Qwen2.5-3B',
          'Llama-3.2-3B', 'Gemma-2-2B', 'InternLM2.5-1.8B', 'Qwen2.5-1.5B', 'Qwen2-1.5B', 'Llama-3.2-1B', 'Qwen2.5-0.5B']
VAL = re.compile(r'^(-?\d+(\.\d+)?%?|-)$')
def rows(a, b, k, names=JUDGES):
    """rows between line indices a and b: a judge name followed by k values"""
    out, i = [], a
    while i < b:
        if T[i] in names and all(VAL.match(T[i + 1 + j] or '') for j in range(k)):
            out.append([T[i]] + T[i + 1:i + 1 + k]); i += 1 + k
        else: i += 1
    return out
idx = lambda s, start=0: next(i for i in range(start, len(T)) if T[i].startswith(s))
tb = {}
# Table 1 (two blocks: agreement with GPT-4o, agreement with Claude-3.5-Sonnet), columns Direct, CoT, CoT_GPT-4o
a = idx('Agreement with GPT-4o'); b = idx('Agreement with Claude-3.5-Sonnet'); c = idx('Table 1:')
tb['t1'] = {'cap': 'Agreements of different judges on WildBench (pairwise, from point-wise scores)', 'at': 'S2.T1', 'cols': ['Direct', 'CoT', 'CoT with GPT-4o analysis'],
            'gpt4o_vs_claude': '60.7%', 'vs_gpt4o': rows(a, b, 3), 'vs_claude': rows(b, c, 3)}
# Table 2
a = idx('Table 2:'); b = idx('Figure 6:')
tb['t2'] = {'cap': 'Agreement ratios of different LLM judges with MT-Bench human judgments', 'at': 'S4.T2', 'cols': ['CoT', 'Direct', 'Fixed', 'Ours (Unsup.)', 'Ours (Sup.)'],
            'base': {'GPT-4 (Pairwise)': '65.8%', 'GPT-4 (Single)': '59.6%', 'Human-to-human': '64.7%', 'GPT-4o': '66.6%', 'Prometheus-7B-v2.0': '55.7%'}, 'rows': rows(a, b, 5)}
# Table 3
a = idx('Table 3:'); b = idx('List-level Correlation.')
tb['t3'] = {'cap': 'Correlation of ranking with Chatbot Arena Elo (Hard prompts, English) on WildBench, 12 test models', 'at': 'S4.T3',
            'cols': ['CoT', 'Direct', 'Fixed', 'Ours (Unsup.)', 'Ours (Sup.)'], 'sub': ['Kend.', 'Spea.'], 'rows': rows(a, b, 10)}
# Table 4 (layout too irregular to parse; transcribed here, checked by recompute.py)
tb['t4'] = {'cap': 'Evaluation cost on WildBench with different LLM judges', 'at': 'S4.T4', 'rows': [
    {'m': 'CoT', 'judge': 'GPT-4o (20240806)', 'env': 'proprietary', 'price': 'I/O: $1.25 / $5.00 per 1M tokens', 'use': 'I/O: 1.84M / 220k tokens', 'extra': 'N/A', 'n': ['$34.0', '$340', '$3400']},
    {'m': 'CoT', 'judge': 'GPT-4o-mini (20240718)', 'env': 'proprietary', 'price': 'I/O: $0.075 / $0.30 per 1M tokens', 'use': 'I/O: 1.84M / 220k tokens', 'extra': 'N/A', 'n': ['$2.00', '$20.0', '$200']},
    {'m': 'RocketEval', 'judge': 'Llama-3-70B (AWQ)', 'env': '4 x A5000', 'price': '$1.44 / hour', 'use': '3760s', 'extra': '$2.87*', 'n': ['$15.1', '$125', '$1224']},
    {'m': 'RocketEval', 'judge': 'Llama-3-8B', 'env': '1 x A5000', 'price': '$0.36 / hour', 'use': '685s', 'extra': '$2.87*', 'n': ['$3.55', '$9.72', '$71.4']},
    {'m': 'RocketEval', 'judge': 'Gemma-2-2B', 'env': '1 x A5000', 'price': '$0.36 / hour', 'use': '248s', 'extra': '$2.87*', 'n': ['$3.12', '$5.35', '$27.7']},
    {'m': 'RocketEval', 'judge': 'Qwen2.5-1.5B', 'env': '1 x A5000', 'price': '$0.36 / hour', 'use': '165s', 'extra': '$2.87*', 'n': ['$3.04', '$4.52', '$19.4']}],
    'note': '*The checklist generation process on WildBench consumes 1.38M input tokens and 228k output tokens on GPT-4o.'}
# Table 5
tb['t5'] = {'cap': 'Statistics of benchmark datasets', 'at': 'A1.T5', 'cols': ['#Instances', 'Turns', 'QueryLen', 'PromptLen'], 'rows': [
    ['MT-Bench', '160*', '1-2', '202.2', '1123.4'], ['WildBench', '1024', '1-5', '978.5', '3402.1'], ['AlpacaEval', '805', '1', '164.9', '164.9'], ['Arena-Hard', '500', '1', '406.4', '406.4']],
    'note': '*Each 2-turn dialogue counted as 2 instances.'}
# Table 6: three benchmarks, columns CoT, Direct, Ours (Unsup.), Ours (Sup.), Kendall and Spearman each
a = idx('Table 6:'); m1 = idx('AlpacaEval', a + 3); m2 = idx('Arena-Hard', m1 + 1); e = idx('A.3.2 Results')
gp = {}
for k, s in (('mt', a), ('alpaca', m1), ('arena', m2)):
    j = idx('Kendall’s Tau (Kend.):', s); gp[k] = re.findall(r'\d[\d.]*', T[j])
tb['t6'] = {'cap': 'Correlation of ranking with Chatbot Arena Elo (Hard prompts, English) on three more benchmarks', 'at': 'A1.T6', 'cols': ['CoT', 'Direct', 'Ours (Unsup.)', 'Ours (Sup.)'],
            'sub': ['Kend.', 'Spea.'], 'gpt4o': gp, 'mt': rows(a, m1, 8), 'alpaca': rows(m1, m2, 8), 'arena': rows(m2, e, 8)}
# Tables 7 and 8 (ablations)
a = idx('Table 7:'); b = idx('Table 8:'); c = idx('The results, presented in Tables 7 and 8')
cols = ['RocketEval (Unsup.)', 'w/o Norm Score', 'w/o Indep. Judgment', 'w/o Weight Factor', 'RocketEval (Sup.)']
tb['t7'] = {'cap': 'Ablation study on instance-level agreement with MT-Bench human judgments', 'at': 'A1.T7', 'cols': cols, 'rows': rows(a, b, 5)}
tb['t8'] = {'cap': 'Ablation study on list-level correlation with Chatbot Arena Elo on WildBench', 'at': 'A1.T8', 'cols': cols, 'sub': ['Kend.', 'Spea.'], 'rows': rows(b, c, 10)}
for k in ('t1', 't2', 't3', 't6', 't7', 't8'):
    v = tb[k]; n = {kk: len(v[kk]) for kk in ('vs_gpt4o', 'vs_claude', 'rows', 'mt', 'alpaca', 'arena') if kk in v}; print(k, n)
json.dump(tb, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
