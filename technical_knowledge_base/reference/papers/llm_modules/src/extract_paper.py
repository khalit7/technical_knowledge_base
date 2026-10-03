"""Extract the arXiv HTML (v7) of LLM Modules to plain text and its tables to TSV.
usage: curl -sL https://arxiv.org/html/2502.08213v1 -o /tmp/lm.html; python3 extract_paper.py /tmp/aiayn.html"""
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
open('paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2502.08213v1 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in ["S5.T1"]:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2502.08213v1#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
