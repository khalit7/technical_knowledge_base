"""Transcribe the paper's tables from the arXiv HTML extracts in inputs/ into tables.json (no retyping).
Values stay strings as printed ("n/a", "n/c", "-"); recompute.py and the page parse them.
usage: python3 mk_tables.py   (after extract_paper.py)"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, 'inputs')
TEX = [(r'$\textbf{\penalty\ ARC}_{\textbf{\penalty\ C}}$', 'ARC-C'), (r'$\textbf{\penalty\ MMLU}_{\textbf{\penalty\ PRO}}$', 'MMLU-Pro'),
       (r'FLOP $\times 10^{23}$', 'FLOP (1e23)'), (r'\sans', ''), ('$', '')]


def clean(s):
    s = s.strip()
    for a, b in TEX: s = s.replace(a, b)
    if '\\text{{{FT' in s:  # Web^{FT_7}_{FW_2} written as nested \\text{} groups: flatten to "Web FT7 FW2"
        s = re.sub(r'[{}^_]', ' ', s.replace('\\text', ''))
        s = re.sub(r'FT\s+7', 'FT7', re.sub(r'FW\s+(\d)', r'FW\1', s))
    return re.sub(r'\s+', ' ', s).strip()


def blocks(name):
    t = open(os.path.join(IN, name)).read().split('\n', 2)[2]
    return [[clean(x) for x in b.split('\n') if x.strip()] for b in t.split('\n\n') if b.strip()]


def caption(bl):
    for b in bl:
        if b and re.match(r'Table \d+:', b[0]): return ' '.join(b)
    return ''


def simple(name, anchor, ncols):
    """Header block, then rows of ncols cells; one-cell blocks are group labels."""
    bl = blocks(name); cap = caption(bl)
    body = [b for b in bl if not re.match(r'Table \d+:', b[0])]
    head = None; rows = []; grp = ''
    for b in body:
        if head is None and len(b) == ncols: head = b; continue
        if len(b) == 1: grp = b[0]; continue
        if len(b) == ncols: rows.append({'g': grp, 'c': b})
    return {'anchor': anchor, 'caption': cap, 'head': head, 'rows': rows}


T = {'_doc': 'Tables of 2 OLMo 2 Furious (arXiv 2501.00656v3), transcribed by mk_tables.py from the arXiv HTML extracts. '
             'Strings as printed. Anchors are the arXiv HTML ids.'}

T['t1'] = simple('table_S2_T1.txt', 'S2.T1', 4); T['t1']['head'] = [''] + T['t1']['head'] if T['t1']['head'] and len(T['t1']['head']) == 3 else T['t1']['head']
bl = blocks('table_S2_T1.txt'); T['t1']['head'] = [''] + bl[0]; T['t1']['rows'] = [{'g': '', 'c': b} for b in bl[1:] if len(b) == 4]
T['t2'] = simple('table_S2_T2.txt', 'S2.T2', 4)
bl = blocks('table_S2_T3.txt')
t3 = [{'g': '', 'c': b} for b in bl[1:] if len(b) == 4]
flat = [x for b in bl for x in b]
i = flat.index('LR Schedule (Cosine)'); j = flat.index('LR Schedule Truncation')
t3 += [{'g': '', 'c': flat[i:i + 4]}, {'g': '', 'c': flat[j:j + 4]}]
T['t3'] = {'anchor': 'S2.T3', 'caption': caption(bl), 'head': [''] + bl[0], 'rows': t3}

def mix(name, anchor):
    bl = blocks(name); out = []; grp = ''; pend = []
    for b in bl[1:]:
        if re.match(r'Table \d+:', b[0]): break
        if len(b) == 1 and ('✦' in b[0]): grp = b[0]; continue
        cells = pend + b
        if len(cells) >= 6 and re.match(r'^[\d.]+[TBMK]$', cells[-4] or ''):
            out.append({'g': grp, 'c': [' '.join(cells[:-5]).replace('\\text{FineWeb}\\geqslant ', 'FineWeb >= '), cells[-5], cells[-4], cells[-3], cells[-2], cells[-1]]}); pend = []
        elif len(cells) >= 5 and re.match(r'^[\d.]+[TBMK]$', cells[-4] or '') and 'total' in ' '.join(cells[:-4]).lower():
            out.append({'g': grp, 'c': [' '.join(cells[:-4]), '', cells[-4], cells[-3], cells[-2], cells[-1]]}); pend = []
        else: pend = cells
    return {'anchor': anchor, 'caption': caption(bl), 'head': bl[0], 'rows': out}
T['t4'] = mix('table_S2_T4.txt', 'S2.T4')
T['t5'] = mix('table_S2_T5.txt', 'S2.T5')
T['t6'] = simple('table_S2_T6.txt', 'S2.T6', 13)
T['t7'] = simple('table_S2_T7.txt', 'S2.T7', 13)
T['t8'] = simple('table_S4_T8.txt', 'S4.T8', 4)
T['t9'] = simple('table_S4_T9.txt', 'S4.T9', 12)
T['t9']['head'] = blocks('table_S4_T9.txt')[1]

# Table 10: candidate mid-training mixes (source rows: name lines, then 7 values)
bl = blocks('table_S4_T10.txt'); rows = []; cat = ''; pend = []
for b in bl[3:]:
    if re.match(r'Table \d+:', b[0]): break
    if len(b) == 1 and b[0] in ('WEB', 'INST', 'CODE', 'REFERENCE', 'MATH'): continue  # rowspan labels sit mid-group; assigned by source below
    cells = pend + b
    vals = [c for c in cells if re.match(r'^(-|[\d.]+)$', c)]
    if len(vals) >= 7:
        name = ' '.join(c for c in cells if c not in vals[-7:])
        if 'DCLM from pretrain' in name: name = 'DCLM from pretrain'
        g = ('WEB' if name.startswith('DCLM') else 'INST' if name.startswith(('Flan', 'Stack Exchange')) else 'CODE' if name.startswith(('Starcoder', 'CodeSearchNet'))
             else 'MATH' if name.startswith(('OpenWebMath', 'GSM8k', 'Mathpile', 'AutoMathText')) else 'REFERENCE')
        rows.append({'g': g, 'c': [name.replace('\\text{FineWeb}\\geqslant ', 'FineWeb >= ')] + vals[-7:]}); pend = []
    else: pend = cells
T['t10'] = {'anchor': 'S4.T10', 'caption': caption(bl), 'head': ['Source', 'PT Mix', 'Web FT7', 'Web FT7 FW3', 'Web FT7 FW2', 'Web FT7 FW2 + Math', 'Web FT7 FW2 + Ins', 'Web FT7 FW2 + Math + Ins'], 'rows': rows}
T['t11'] = simple('table_S4_T11.txt', 'S4.T11', 5)

bl = blocks('table_S4_T12.txt'); rows = []; exp = ''
for b in bl:
    if len(b) == 1: exp = b[0]; continue
    if len(b) == 5 and b[0] != 'Mix': rows.append({'g': exp, 'c': b})
T['t12'] = {'anchor': 'S4.T12', 'caption': caption(bl), 'head': ['Mix', 'Web ratio', 'Tokens', 'MMLU (avg)', 'GSM*'], 'rows': rows}

bl = blocks('table_S4_T13.txt')
T['t13'] = {'anchor': 'S4.T13', 'caption': caption(bl), 'head': ['Source', 'Tokens', '50B Source %', '50B Mix %', '100B Source %', '100B Mix %', '300B Source %', '300B Mix %'],
            'rows': [{'g': '', 'c': b} for b in bl[2:] if len(b) == 8]}

bl = blocks('table_S4_T14.txt'); rows = []; last = None
for b in bl[1:]:
    if re.match(r'Table \d+:', b[0]): break
    if b[0] == 'best single': last = b[1:]
    elif len(b) == 6: rows.append({'g': '', 'c': [b[0]] + last + b[2:]})
T['t14'] = {'anchor': 'S4.T14', 'caption': caption(bl), 'head': ['Mix', 'Best single OLMES', 'OLMES-Gen', 'MMLU', 'GSM*', 'Soup OLMES', 'OLMES-Gen', 'MMLU', 'GSM*'], 'rows': rows}

T['t16'] = simple('table_S5_T16.txt', 'S5.T16', 12)
bl = blocks('table_S5_T16.txt'); T['t16']['head'] = ['Model'] + bl[0]; T['t16']['rows'] = [{'g': '', 'c': b} for b in bl[1:] if len(b) == 12]
T['t17'] = simple('table_S5_T17.txt', 'S5.T17', 4)

bl = blocks('table_S5_T18.txt'); flat = [x for b in bl if not re.match(r'Table \d+:', b[0]) for x in b]
pairs = []; i = 0
while i < len(flat) - 1:
    if flat[i] == 'Hyperparameter': i += 2; continue
    pairs.append([flat[i], flat[i + 1]]); i += 2
T['t18'] = {'anchor': 'S5.T18', 'caption': caption(bl), 'head': ['Hyperparameter', 'RLVR value'], 'rows': [{'g': '', 'c': p} for p in pairs]}

bl = blocks('table_S6_T19.txt')
T['t19'] = {'anchor': 'S6.T19', 'caption': caption(bl), 'head': ['Model', 'Total GPU power (MWh)', 'PUE', 'Carbon intensity (kg CO2/kWh)', 'Carbon emissions (tCO2eq)', 'WUE (L/kWh)', 'Total water (kL)'],
            'rows': [{'g': '', 'c': b} for b in bl if len(b) == 7]}
T['t22'] = simple('table_A2_T22.txt', 'A2.T22', 13)
T['t23'] = simple('table_A2_T23.txt', 'A2.T23', 12)
T['t24'] = simple('table_A3_T24.txt', 'A3.T24', 7)
bl = blocks('table_A4_T27.txt'); rows = []
for b in bl[1:]:
    if re.match(r'Table \d+:', b[0]): break
    if len(b) < 2: continue
    rows.append({'g': '', 'c': [b[0], b[1], '✓' if len(b) > 2 and 'check' in b[2] else '', '✓' if (len(b) > 3 and 'check' in b[3]) or (len(b) == 3 and 'check' in b[2] and b[0] == 'WildChat IF') else '']})
for r in rows:  # WildChat IF is ticked only in the 13B column (one tick, rendered in the second check cell)
    if r['c'][0] == 'WildChat IF': r['c'][2], r['c'][3] = '', '✓'
T['t27'] = {'anchor': 'A4.T27', 'caption': caption(bl), 'head': ['Dataset', 'Counts', '7B DPO', '13B DPO'], 'rows': rows}

json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
for k, v in T.items():
    if k.startswith('_'): continue
    print(k, v['anchor'], len(v['rows']), 'rows; head', v['head'][:5] if v['head'] else None, '; first', v['rows'][0]['c'][:4] if v['rows'] else None)
