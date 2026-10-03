"""Extract the arXiv HTML (v2) of Mamba to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/2312.00752v2 -o /tmp/mamba.html; python3 extract_paper.py /tmp/mamba.html"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_v2.txt', 'w').write('Source: https://arxiv.org/html/2312.00752v2 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
n = 0
for m in re.finditer(r'<figure id="([^"]+)" class="ltx_table".*?</figure>', s, re.S):
    tid = m.group(1)
    if tid.count('.') > 1: continue
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2312.00752v2#' + tid + '\n\n' + txt(m.group(0)))
    n += 1
print('ok', n, 'tables')
