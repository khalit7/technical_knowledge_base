"""Transcribe the paper's tables from the arXiv HTML v4 into tables.json, cell by cell, printed text kept.
usage: python3 mk_tables.py $SCRATCH/gpt3.html
Each table: {"id": arXiv anchor, "name": the paper's name, "caption": ..., "rows": [[cell, ...], ...]}."""
import re, sys, html, json
s = open(sys.argv[1]).read()
def cell(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: html.unescape(m.group(1)), x, flags=re.S)
    x = re.sub(r'<sup[^>]*>(.*?)</sup>', r'^\1', x, flags=re.S)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x).replace('\\to', '→').replace('\\times', '×').replace('\n', ' ')
    return re.sub(r'\s+', ' ', x).strip()
NAMES = {'S2.T1': 'Table 2.1', 'S2.T2': 'Table 2.2', 'A3.T1': 'Table C.1', 'A4.T1': 'Table D.1', 'A5.T1': 'Table E.1', 'A5.T2': 'Table E.2', 'A8.T1': 'Table H.1'}
out = {}
for tid in ['S2.T1', 'S2.T2'] + ['S3.T%d' % i for i in range(1, 13)] + ['A3.T1', 'A4.T1', 'A5.T1', 'A5.T2', 'A8.T1']:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S).group(0)
    cap = re.search(r'<figcaption[^>]*>(.*?)</figcaption>', m, re.S)
    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', m, re.S):
        cs = [cell(c) for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.S)]
        if any(cs): rows.append(cs)
    name = NAMES.get(tid) or 'Table 3.' + tid.split('T')[1]
    out[tid] = {'id': tid, 'name': name, 'caption': cell(cap.group(1)) if cap else '', 'rows': rows}
json.dump(out, open('tables.json', 'w'), indent=0, ensure_ascii=False)
for k, v in out.items(): print(k, v['name'], len(v['rows']), v['rows'][0][:6])
