"""Extract the arXiv HTML (v3) of ZeRO to plain text and its tables to text files in inputs/.
The knowledge base allows no em-dashes, so the paper's em-dashes are written as " -- ".
usage: curl -sL https://arxiv.org/html/2609.14306v1 -o /tmp/moe.html; python3 extract_paper.py /tmp/zero.html"""
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
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2609.14306v1 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in ['S2.T1','S3.T2','S3.T3','S3.T4','A1.T5','A2.T6','A2.T7','A2.T8','A2.T9','A3.T10','A3.T11','A4.T12','A4.T13','A5.T14']:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2609.14306v1#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
