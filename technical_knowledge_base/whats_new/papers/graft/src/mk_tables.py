"""Transcribe the paper's tables from the saved arXiv HTML extracts (inputs/table_*.txt) into tables.json.

Parsing the extracts (not retyping) keeps the printed precision. Table 1 (the object_qa example) and
Tables 5 and 6 (the toy environments in words) are shown as text on the page, not here.
  python3 mk_tables.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(HERE, 'inputs', f)).read()


def cells(txt):
    body = txt.split('\n', 2)[2]
    return [c.strip() for c in re.split(r'\t|\n', body) if c.strip()]


def pm(s):
    m = re.fullmatch(r'(-?[\d.]+)(?: \$\\pm\$ ([\d.]+))?', s)
    return (float(m.group(1)), float(m.group(2)) if m.group(2) else None) if m else None


def rows_after(cs, labels, ncol):
    out = []
    for lab in labels:
        i = cs.index(lab)
        vals = [pm(x) for x in cs[i + 1:i + 1 + ncol]]
        assert all(vals), (lab, cs[i + 1:i + 1 + ncol])
        out.append({'n': lab, 'v': [v[0] for v in vals], 'e': [v[1] for v in vals]})
    return out


T = {}
cs = cells(rd('table_A4_T2.txt'))
T['t2'] = {'n': 'Table 2', 'at': 'A4.T2', 'title': "GRAFT's forget adapter on two coding environments it was not trained on (Qwen3-8B, Countdown-trained)",
           'cols': ['Hack rate, HumanEval', 'Hack rate, LeetCode-Hackable', 'Task perf., HumanEval', 'Task perf., LeetCode-Hackable'],
           'err': 'one standard deviation over eight seeds (base model evaluated once)',
           'rows': rows_after(cs, ['Base model', 'GRAFT (pre-ablation)', 'GRAFT (deployment configuration)'], 4)}
cs = cells(rd('table_A4_T3.txt'))
labs = ['Base model', 'GRAFT (pre-ablation)', 'GRAFT (deployment configuration)', 'No intervention', 'Reward penalty', 'Inoculation prompting',
        'Preventative steering', 'Anchor environment only', 'GRAFT w/o routing']
he = cs.index('Two-file (original) -- HumanEval'); lc = cs.index('Two-file (original) -- LeetCode')
T['t3'] = {'n': 'Table 3', 'at': 'A4.T3', 'title': 'Every method on the two transfer environments, by kind of hack (%)',
           'cols': ['Task perf.', 'Hard-coding', 'Trivially-passing tests', 'Replaced tests', 'Deleted tests', 'Other'],
           'err': 'one standard error over seeds (8 GRAFT, 3 per baseline; base evaluated once)',
           'HumanEval': rows_after(cs[he:lc], labs, 6), 'LeetCode': rows_after(cs[lc:], labs, 6)}
cs = cells(rd('table_A4_T4.txt'))
T['t4'] = {'n': 'Table 4', 'at': 'A4.T4', 'title': 'GRAFT with and without anchor updates on Countdown-Code (%)', 'cols': ['Task perf.', 'Hack rate'],
           'err': 'standard error over seeds (3 without anchoring, 8 GRAFT; base evaluated once)',
           'rows': rows_after(cs, ['GRAFT w/o anchoring', 'GRAFT (ours)', 'Base model'], 2)}
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1)
print('tables.json:', ', '.join(v['n'] for v in T.values()))
