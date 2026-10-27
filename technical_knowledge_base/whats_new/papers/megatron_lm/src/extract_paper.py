"""Extract the arXiv HTML (v4) of Megatron-LM to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/1909.08053v4 -o /tmp/meg.html; python3 extract_paper.py /tmp/meg.html"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    x = x.replace('\u2014', ' -- ')  # the knowledge base keeps no em-dashes, even in extracts
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_v4.txt', 'w').write('Source: https://arxiv.org/html/1909.08053v4 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in ['S5.T1', 'S5.T2', 'S5.T3', 'S5.T4', 'S5.T5', 'A1.T6', 'A4.T7', 'A4.T8']:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/1909.08053v4#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
