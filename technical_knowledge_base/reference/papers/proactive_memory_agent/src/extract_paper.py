"""Extract the arXiv HTML (v1) of Proactive Memory Agent (2607.08716) to plain text and its tables to text.
usage: curl -sL https://arxiv.org/html/2607.08716v1 -o /tmp/pma.html; python3 extract_paper.py /tmp/pma.html"""
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
open('inputs/paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2607.08716v1 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in re.findall(r'<figure[^>]*id="(S\d\.T\d+)"', s):
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2607.08716v1#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
