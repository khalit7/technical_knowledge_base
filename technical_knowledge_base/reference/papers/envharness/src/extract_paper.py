"""Extract the arXiv HTML (v1) of EnvHarness to plain text, its tables to text, and its anchor list.
usage: curl -sL https://arxiv.org/html/2608.19880v1 -o $SCRATCH/eh.html; python3 extract_paper.py $SCRATCH/eh.html  (writes into inputs/)"""
import re, sys, html, os
s = open(sys.argv[1]).read()
os.makedirs('inputs', exist_ok=True)
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2608.19880v1 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
ids = re.findall(r'id="((?:S|A|Sx)[0-9A-Za-z.]+)"', s)
open('inputs/anchors.txt', 'w').write('\n'.join(dict.fromkeys(ids)) + '\n')
tabs = [i for i in dict.fromkeys(ids) if re.search(r'\.T\d+$', i)]
out = []
for tid in tabs:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    if m: out.append('=== ' + tid + '  https://arxiv.org/html/2608.19880v1#' + tid + '\n' + txt(m.group(0)))
open('inputs/tables_v1.txt', 'w').write('\n\n'.join(out))
print('ok', len(tabs), 'tables')
