"""Transcribe the tables that carry the argument from the arXiv HTML extracts in inputs/ into tables.json,
keeping the printed precision (strings) and adding parsed numbers in points where a row has them.

  python3 mk_tables.py        (build.sh runs it first; inputs come from extract_paper.py)

Tables: 1 (preregistered tests of the account), 3 and 4 (every matched-compute contrast), 8 (where the filter
helps), 11 (tokens to reach outcome-only accuracy), 13 (equal tokens against equal training time),
14 (where the training time goes), 15 (equal training time past the budget).
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, 'inputs')


def clean(s):
    s = s.replace('\t', ' ')
    s = re.sub(r'\\text\{([^}]*)\}', r'\1', s)
    s = s.replace('{=}', '=').replace('{<}', '<').replace('{,}', ',').replace('\\,', ' ').replace('{\\times}', '×').replace('\\times', '×')
    s = re.sub(r'10\^\{([^}]*)\}', lambda m: '10^' + m.group(1), s)
    s = re.sub(r'\^\{?\\?star\}?', '*', s)
    s = s.replace('p^*', 'p*').replace('{k{=}', '{k=').replace('$-$', '−')
    s = re.sub(r'k\{?=\}?', 'k=', s)
    s = s.replace('\\leq', '≤')
    s = s.replace('$', '').replace('{', '').replace('}', '').replace('\\', '')
    s = s.replace('-', '−').replace('−', '-')  # one minus sign in the data; the page prints its own
    return re.sub(r'\s+', ' ', s).strip()


def lines(name, after):
    t = open(os.path.join(IN, name), encoding='utf-8').read()
    L = [clean(x) for x in t.split('\n') if clean(x)]
    return L[L.index(after) + 1:] if after else L  # the first line equal to the last header cell


NUM = r'[+-]?\d*\.?\d+'


def ci(s):
    """'-0.143 [-0.160,-0.127]' -> (-14.3, -16.0, -12.7) in points; values without an interval give (v, None, None)."""
    m = re.match(r'(%s)\s*(?:\[(%s|n\.r\.),\s*(%s|n\.r\.)\])?' % (NUM, NUM, NUM), s)
    if not m: return None
    f = lambda x: None if x is None or x == 'n.r.' else round(float(x) * 100, 3)
    return [f(m.group(1)), f(m.group(2)), f(m.group(3))]


def t34(name):
    L = lines(name, 'Test')
    rows, block, i = [], '', 0
    scale = re.compile(r'^-?0\.\d+\+0\.\d+$')
    while i < len(L):
        if i + 1 < len(L) and scale.match(L[i + 1]):
            block = L[i]; i += 2; continue
        if L[i].startswith('At outcome-only GRPO'):  # a sub-block header printed without its own scale line
            block = L[i]; i += 1; continue
        if L[i].startswith('Source:') or L[i].startswith('Table '):
            break
        r = L[i:i + 5]
        if len(r) < 5: break
        rows.append({'block': block, 'method': r[0], 'model': r[1], 'n': r[2], 'delta': r[3], 'test': r[4], 'pts': ci(r[3])})
        i += 5
    return rows


def grid(name, after, k):
    L = lines(name, after)
    return [L[i:i + k] for i in range(0, len(L) - k + 1, k)]


T = {}
T['table3'] = t34('table_A3_T3.txt')
T['table4'] = t34('table_A3_T4.txt')
T['table13'] = [{'config': r[0], 'base': r[1], 'n': r[2], 'tokens': r[3], 'time': r[4], 'hours': r[5], 'tok_pts': ci(r[3]), 'time_pts': ci(r[4])}
                for r in grid('table_A4_T13.txt', 'Hours to B (configuration / base)', 6)]
T['table14'] = [{'config': r[0], 'select': int(r[1].replace(',', '')), 'generate': int(r[2].replace(',', '')), 'credit': int(r[3].replace(',', '')),
                 'update': int(r[4].replace(',', '')), 'total': int(r[5].replace(',', ''))} for r in grid('table_A4_T14.txt', 'Total', 6)]
T['table8'] = [{'setting': r[0], 'n': int(r[1]), 'cand': r[2], 'rew_filter': r[3], 'rew_outcome': r[4], 'iter0': r[5], 'start': r[6], 'delta': r[7],
                'cand_v': float(r[2].split(' ')[0]), 'pts': ci(r[7])} for r in grid('table_A3_T8.txt', 'filter - outcome', 8)]
T['table1'] = [{'setting': r[0], 'cand': r[1], 'pred': r[2], 'result': r[3]} for r in grid('table_S4_T1.txt', 'Result', 4)]
L11 = lines('table_A3_T11.txt', 'training time')
T['table11'] = [{'setting': L11[i], 'target': L11[i + 1], 'tokens': L11[i + 2], 'time': L11[i + 3]} for i in range(0, len(L11) - 3, 4) if not L11[i].startswith('n.r.:')]
L15 = lines('table_A6_T15.txt', 'to B')
t15 = [{'config': 'Outcome-only GRPO', 'hours': L15[4]}]
for i in range(5, len(L15) - 7, 8):
    r = L15[i:i + 8]
    t15.append({'config': r[0], 'tc': r[1], 'holm': r[2], 'tost': r[3], 'lower': r[4], 'tokens': r[5], 'earlier': r[6], 'hours': r[7], 'pts': ci(r[1])})
T['table15'] = t15

if __name__ == '__main__':
    json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
    print({k: len(v) for k, v in T.items()})
