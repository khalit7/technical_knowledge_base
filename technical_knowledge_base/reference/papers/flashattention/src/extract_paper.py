"""Extract the arXiv HTML (v2) of FlashAttention to plain text and its tables to text files in inputs/.
The knowledge base allows no em-dashes, so the paper's em-dashes are written as " -- ".
usage: curl -sL https://arxiv.org/html/2205.14135v2 -o fa.html; python3 extract_paper.py fa.html"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    x = x.replace('\u2014', ' -- ')
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_v2.txt', 'w').write('Source: https://arxiv.org/html/2205.14135v2 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
tids = sorted(set(re.findall(r'<figure[^>]*id="((?:S|A)\d+\.T\d+)"', s)))
for tid in tids:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2205.14135v2#' + tid + '\n\n' + txt(m.group(0)))
print('ok', tids)
