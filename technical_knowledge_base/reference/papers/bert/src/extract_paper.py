"""Extract the arXiv HTML (v2) of BERT to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/1810.04805v2 -o /tmp/bert.html; python3 extract_paper.py /tmp/bert.html"""
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
open('inputs/paper_v2.txt', 'w').write('Source: https://arxiv.org/html/1810.04805v2 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in ['S3.T1', 'S4.T2', 'S4.T3', 'S4.T4', 'S5.T5', 'S5.T6', 'S5.T7', 'A3.T8']:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/1810.04805v2#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
