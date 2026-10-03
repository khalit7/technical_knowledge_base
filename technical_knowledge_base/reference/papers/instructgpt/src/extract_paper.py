"""Extract the arXiv HTML (v1) of InstructGPT to plain text and its tables to text files in inputs/.
usage: curl -sL https://arxiv.org/html/2203.02155v1 -o /tmp/igpt.html; python3 extract_paper.py /tmp/igpt.html"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'<(h\d)[^>]*>', lambda m: '\n', x)
    x = re.sub(r'<section[^>]*id="([^"]+)"[^>]*>', lambda m: '\n[#' + m.group(1) + ']\n', x)
    x = re.sub(r'<figure[^>]*id="([^"]+)"[^>]*>', lambda m: '\n[#' + m.group(1) + ']\n', x)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2203.02155v1 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
tids = re.findall(r'<figure id="([^"]+)" class="ltx_table"', s)
def block(tid):  # the whole <figure>, nested figures included
    i = s.index('<figure id="%s"' % tid); d = 0
    for m in re.finditer(r'<(/?)figure\b', s[i:]):
        d += -1 if m.group(1) else 1
        if d == 0: return s[i:i + m.end() + 1]
for tid in tids:
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2203.02155v1#' + tid + '\n\n' + txt(block(tid)))
print('ok', tids)
