"""Extract the arXiv HTML (v3) of Switch Transformers to plain text and its tables to TSV.
usage: curl -sL https://arxiv.org/html/2101.03961v3 -o /tmp/switch.html; python3 extract_paper.py /tmp/switch.html"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    x = x.replace('\u2014', '--')  # the repository allows no em-dashes, even in extracts
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_v3.txt', 'w').write('Source: https://arxiv.org/html/2101.03961v3 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in ['S2.T1','S2.T2','S2.T3','S2.T4','S4.T5','S4.T6','S4.T7','S4.T8','S5.T9','A1.T10','A3.T11','S5.tab1']:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2101.03961v3#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
