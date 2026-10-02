"""Extract the arXiv HTML (v2) of LDM to plain text and its tables to text.
usage: curl -sL https://arxiv.org/html/2112.10752v2 -o /tmp/ddpm.html; python3 extract_paper.py /tmp/ddpm.html  (run from src/inputs)"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + m.group(1) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('paper_v2.txt', 'w').write('Source: https://arxiv.org/html/2112.10752v2 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in ['S4.T1','S4.T2','S4.T3','S4.T4','S4.T5','S4.T6','S4.T7','A4.T8','A4.T9','A4.T10','A4.T11','A5.T12','A5.T13','A5.T14','A5.T15','A5.T16','A5.T17','A6.T18']:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2112.10752v2#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
