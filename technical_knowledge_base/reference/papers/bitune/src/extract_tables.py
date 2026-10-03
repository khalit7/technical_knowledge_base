"""Dump every table of the arXiv HTML (v2) row by row, cells as printed, to inputs/tables_raw.json.
usage: python3 extract_tables.py /tmp/bitune_v2.html"""
import re, sys, html, json
s = open(sys.argv[1]).read()
def cell(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: html.unescape(m.group(1)), x, flags=re.S)
    x = re.sub(r'<[^>]+>', '', x); x = html.unescape(x)
    return re.sub(r'\s+', ' ', x).strip()
out = {}
def block(start):
    depth, i = 0, start
    for t in re.finditer(r'<(/?)figure\b', s[start:]):
        depth += -1 if t.group(1) else 1
        if depth == 0: return s[start:start + t.start()]
for m in re.finditer(r'<figure id="([^"]+)" class="ltx_table"', s):
    tid = m.group(1); body = block(m.start())
    rows = []
    for r in re.findall(r'<tr[^>]*>(.*?)</tr>', body, re.S):
        rows.append([cell(c) for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, re.S)])
    cap = re.search(r'<figcaption[^>]*>(.*?)</figcaption>', body, re.S)
    out[tid] = {'caption': cell(cap.group(1)) if cap else '', 'rows': rows}
json.dump(out, open('inputs/tables_raw.json', 'w'), indent=0, ensure_ascii=False)
print(len(out), list(out))
