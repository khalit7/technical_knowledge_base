"""Extract the arXiv HTML (v2) of LoRA to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/2305.14314v1 -o /tmp/qlora.html; (cd inputs && python3 ../extract_paper.py /tmp/qlora.html)"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + m.group(1) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x).replace('\u2014', ' -- ')
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2305.14314v1 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in re.findall(r'<figure[^>]*id="((?:S|A)\d+\.T\d+)"', s):
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2305.14314v1#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
