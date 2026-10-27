"""Write tables.json: the paper's printed tables and in-text result lists, transcribed at their printed precision,
plus the figure values decoded by decode_figs.py (inputs/figs.json). Every transcribed number is checked, in
reading order, against the extracted arXiv text (inputs/paper_v1.txt and inputs/table_*.txt).
usage: python3 mk_tables.py   (build.sh runs it)"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
T = lambda f: open(os.path.join(HERE, 'inputs', f), encoding='utf-8').read()
PAPER = T('paper_v1.txt')


def check_in_order(text, items, where):
    pos = 0
    for it in items:
        i = text.find(it, pos)
        if i < 0: raise SystemExit('mk_tables: %r not found in reading order in %s' % (it, where))
        pos = i + len(it)


# Table 2 (Appendix D.2.2): trained teachers, 200 test examples, temperature 0.5
t2 = [
    ['Qwen2.5-7B', 'MedReason', '77.5', '90.95', '28.58'],
    ['Qwen2.5-7B', 'Science', '72.0', '288.82', '90.38'],
    ['Qwen2.5-7B', 'Countdown-3', '95.5', '168.42', '316.40'],
    ['Llama-3.1-8B', 'MedReason', '85.5', '93.74', '30.81'],
    ['Llama-3.1-8B', 'Science', '67.5', '134.65', '50.77'],
    ['Llama-3.1-8B', 'Countdown-3', '99.0', '98.82', '78.54'],
]
check_in_order(T('table_A4_T2.txt'), [x for r in t2 for x in r[2:]], 'Table 2')

# Table 6 (Appendix E): learning rates behind Mukherjee et al.'s sparsity checkpoints
t6 = [
    ['SFT', 'Llama-3.1-Tulu-3-8B-SFT', 'Full-parameter SFT', '5e-6'],
    ['SFT', 'Llama-3.1-Tulu-3-70B-SFT', 'Full-parameter SFT', '2e-6'],
    ['SFT', 'Eurus-2-7B-SFT', 'Math-reasoning SFT', '2e-5'],
    ['DPO', 'Llama-3.1-Tulu-3-8B-DPO', 'Offline DPO', '5e-7'],
    ['DPO', 'Llama-3.1-Tulu-3-70B-DPO', 'Offline DPO', '5e-7'],
    ['GRPO', 'deepseek-math-7b-rl', 'On-policy GRPO', '1e-6'],
    ['RL-Zero', 'DeepSeek-R1-Zero', 'On-policy GRPO', None],
    ['ORPO', 'mistral-orpo-beta', 'Offline, reference-free ORPO', '8e-6'],
    ['KTO', 'Eurus-7b-kto', 'Offline KTO', '5e-7'],
    ['KTO', 'Llama-3-Base-8B-SFT-KTO', 'Offline KTO', '5e-7'],
    ['PPO', 'math-shepherd-mistral-7b-rl', 'On-policy PPO', '1e-6'],
    ['SimPO', 'Llama-3-Instruct-8B-SimPO', 'Offline, reference-free SimPO', '1e-6'],
    ['PRIME', 'Eurus-2-7B-PRIME', 'On-policy PRIME', '5e-7'],
]
tex = lambda v: '$%s\\times 10^{%s}$' % tuple(v.split('e')) if v else 'Not disclosed'
check_in_order(T('table_A5_T6.txt'), [x for r in t6 for x in (r[1], tex(r[3]))], 'Table 6')

# Appendix A.12: generation-temperature swap on MedReason, held-out accuracy at step 150 (3 seeds)
a12 = [  # KL, rollout, LR, original, swapped
    ['forward', 'OnPD', '1e-5', '67.0', '66.7'], ['forward', 'OffPD', '1e-5', '68.2', '68.0'],
    ['forward', 'OnPD', '5e-5', '55.7', '63.0'], ['forward', 'OffPD', '5e-5', '62.8', '60.7'],
    ['reverse', 'OnPD', '1e-5', '69.3', '67.5'], ['reverse', 'OnPD', '5e-5', '59.3', '36.0'],
    ['reverse', 'OffPD', '1e-5', '5.7', '27.0'], ['reverse', 'OffPD', '5e-5', '46.0', '60.3'],
]
check_in_order(PAPER[PAPER.index('A.12 Rollout-policy temperature'):], [x for r in a12 for x in ('$%s\\%%$' % r[3], '$%s\\%%$' % r[4])], 'Appendix A.12')

# In-text numbers the Reading tab quotes (each found in order inside its own section)
quotes = {
    'S4.SS2': ['72%', '73%', '71–73%', '35% to 72%', '1.3 percentage points', '11.2–14.0', '85.3–89.6%', '51.9–60.0%'],
    'S5.SS2': ['above 80%', '5.2 percentage points'],
    'S5.SS3': ['$10-15\\%$', '300 RLVR steps'],
    'S6': ['$1.0$', '94–135 tokens', '622 tokens'],
    'A1.SS3': ['$53.1\\%$', '$53.3\\%$', '$59.0\\%$', '$92$', '$93\\%$', '$41.4\\%$', '$33.7$', '$35.9\\%$', '$63$', '$70\\%$'],
    'A1.SS10': ['12 nats', '163k', '37%', '56%', '1.3 and 0.8 percentage points'],
}
heads = {'S4.SS2': '4.2 Results', 'S5.SS2': '5.2 Empirical Validation', 'S5.SS3': '5.3 Are there any other', 'S6': '6 Do these findings',
         'A1.SS3': 'A.3 Training on a mathematical', 'A1.SS10': 'A.10 A Low Forward KL'}
for k, items in quotes.items():
    check_in_order(PAPER[PAPER.index(heads[k]):], items, k)

FIG = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
out = {
    '_doc': 'Written by mk_tables.py. t2, t6, a12: transcribed at printed precision and checked against the extracted text. F1, F3, F5, F6, F26: decoded from the vector figures by decode_figs.py (read from figure).',
    't2': t2, 't6': t6, 'a12': a12, 'F1': FIG['F1'], 'F3': FIG['F3'], 'F5': FIG['F5'], 'F6': FIG['F6'], 'F26': FIG['F26'],
}
json.dump(out, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('mk_tables: tables.json written; every transcribed value found in reading order')
