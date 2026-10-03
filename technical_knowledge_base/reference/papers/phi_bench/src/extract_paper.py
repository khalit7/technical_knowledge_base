"""Extract the arXiv HTML of Phi-Bench (2609.10226) to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/2609.10226 -o /tmp/phi_html.html; python3 extract_paper.py /tmp/phi_html.html"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper.txt', 'w').write('Source: https://arxiv.org/html/2609.10226 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
anchors = []
for m in re.finditer(r'<(section|figure)[^>]*id="((?:S|A)[^"]*?)"[^>]*>', s):
    tid = m.group(2)
    if m.group(1) == 'figure' or tid.count('.') <= 2:
        anchors.append(tid)
for m in re.finditer(r'<figure[^>]*id="([^"]*\.T\d+)".*?</figure>', s, re.S):
    tid = m.group(1)
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2609.10226#' + tid + '\n\n' + txt(m.group(0)))
open('inputs/anchors.txt', 'w').write('\n'.join(anchors) + '\n')
print('ok', len(anchors))
