"""Build tables.json from the arXiv HTML extracts: the main-text Tables 1, 2, 4 to 13 and 15 (printed values as strings,
with the paper's bold marks), Table 14 (final results against the previous best) and Table 16 (every task, from parse_t16.py).
usage: python3 extract_paper.py <t5.html>; python3 parse_t16.py; python3 mk_tables.py"""
import json, re
M7 = ['GLUE', 'CNNDM', 'SQuAD', 'SGLUE', 'EnDe', 'EnFr', 'EnRo']
def clean(c):
    c = c.strip().replace('$\\bigstar\\,$', '').replace('\\times', '×').replace('{,}', ',')
    c = re.sub(r'\$\s*\^?\s*', '', c).replace('\\%', '%').replace('\\nicefrac', '')
    c = re.sub(r'2\^\{?(\d+)\}?', r'2^\1', c)
    return ' '.join(c.replace('$', '').split())
def cell(c):
    m = re.fullmatch(r'\s*\$\s*\\mathbf\{([0-9.]+)\}\s*\$\s*', c)
    if m: return m.group(1), True
    m = re.fullmatch(r'\s*\$\s*([0-9.]+)\s*\$\s*', c)
    if m: return m.group(1), False
    return None
CAP = {}
out = {}
for t in [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15]:
    s = open('inputs/table_S3_T%d.txt' % t, encoding='utf-8').read().split('\n', 2)[2]
    cap = s[s.index('Table %d:' % t):]
    blocks = [b for b in re.split(r'\n\s*\n', s[:s.index('Table %d:' % t)]) if b.strip()]
    head = [x.strip() for x in blocks[0].split('\t') if x.strip()]
    rows = []
    for b in blocks[1:]:
        cells = [x for x in b.split('\t') if x.strip()]
        vals = [cell(x) for x in cells[-7:]]
        if any(v is None for v in vals): continue
        rows.append({'name': clean(cells[0]), 'labels': [clean(x) for x in cells[1:-7]], 'v': [v[0] for v in vals], 'bold': [v[1] for v in vals],
                     'star': '\\bigstar' in cells[0]})
    out['T%d' % t] = {'anchor': 'S3.T%d' % t, 'head': head, 'caption': ' '.join(cap.split())[:400], 'rows': rows}
# Table 14: five sub-tables of 6 or 7 columns, rows Previous best + five sizes
L = open('inputs/paper_v4.txt', encoding='utf-8').read()
a = L.index('GLUE\t\nCoLA\t\nSST-2'); b = L.index('Table 14:')
blocks = [bl for bl in re.split(r'\n\s*\n', L[a:b]) if bl.strip()]
cols, rows14 = [], {}
i = 0
while i < len(blocks):
    names = [x.strip() for x in blocks[i].split('\t') if x.strip()]
    mets = [x.strip() for x in blocks[i + 1].split('\t') if x.strip()][1:]
    cols += [n + ' ' + m for n, m in zip(names, mets)]
    for j in range(6):
        cells = [x for x in blocks[i + 2 + j].split('\t') if x.strip()]
        nm = cells[0].strip()
        vv = []
        for c in cells[1:]:
            m = re.fullmatch(r'\s*\$\s*(\\mathbf\{)?([0-9.]+)\}?\s*\$\s*([a-g]?)\s*', c)
            vv.append({'v': m.group(2), 'b': bool(m.group(1)), 'src': m.group(3)})
        rows14.setdefault(nm, []).extend(vv)
    i += 8
out['T14'] = {'anchor': 'S3.T14', 'cols': cols, 'rows': rows14,
              'src': {'a': 'Lan et al., 2019 (ALBERT)', 'b': 'Wang et al., 2019c (StructBERT)', 'c': 'Zhu et al., 2019 (FreeLB)', 'd': 'Liu et al., 2019c (RoBERTa)', 'e': 'Edunov et al., 2018 (backtranslation)', 'f': 'Lample and Conneau, 2019 (XLM)', 'g': 'Dong et al., 2019 (UniLM)'}}
out['T16'] = json.load(open('inputs/table16.json'))
out['M7'] = M7
json.dump(out, open('tables.json', 'w'), indent=0, ensure_ascii=False)
for k, v in out.items():
    if k.startswith('T') and 'rows' in v and isinstance(v['rows'], list): print(k, len(v['rows']), [r['name'] for r in v['rows']][:12])
print('T14 cols', len(cols), list(rows14))
