"""Extract the arXiv HTML (v1) of Training Compute-Optimal Large Language Models to plain text and its tables to text.
usage: curl -sL https://arxiv.org/html/2203.15556v1 -o <scratch>/ch.html; cd inputs; python3 ../extract_paper.py <scratch>/ch.html"""
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
open('paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2203.15556v1 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in ['S1.T1', 'S3.T2', 'S3.T3', 'S4.T4', 'S4.T5', 'S4.T6', 'S4.T7', 'S4.T8', 'S4.T9', 'S4.T10', 'A1.T1', 'A3.T2', 'A4.T3', 'A6.T4', 'A8.T5', 'A8.T6', 'A8.T7', 'A10.T9']:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2203.15556v1#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
