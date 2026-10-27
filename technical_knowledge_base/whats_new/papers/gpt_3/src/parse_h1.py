"""Parse Table H.1 (every task, every model size, zero/one/few-shot) from the arXiv HTML v4 into inputs/table_h1.json.
usage: python3 parse_h1.py $SCRATCH/gpt3.html"""
import re, sys, html, json
s = open(sys.argv[1]).read()
m = re.search(r'<figure[^>]*id="A8.T1".*?</figure>', s, re.S).group(0)
def cell(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda mm: html.unescape(mm.group(1)), x, flags=re.S)
    x = re.sub(r'<[^>]+>', '', x); return html.unescape(x).strip()
rows = []
for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', m, re.S):
    cs = [cell(c) for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.S)]
    rows.append(cs)
json.dump(rows, open('inputs/table_h1_raw.json', 'w'), indent=0)
for r in rows[:6]: print(r)
print(len(rows))
