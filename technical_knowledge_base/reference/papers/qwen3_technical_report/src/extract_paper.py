"""Extract the arXiv HTML of the Qwen3 Technical Report (only v1 exists) to plain text, tables and anchors.
usage: curl -sL https://arxiv.org/html/2505.09388v1 -o q3.html; python3 extract_paper.py q3.html"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'<(section|figure)[^>]*id="([^"]*)"[^>]*>', lambda m: '\n[#' + m.group(2) + '] ', x)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2505.09388v1 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
tids = sorted(set(re.findall(r'<figure[^>]*id="((?:S|A)\d+\.(?:SS\d+\.)?T\d+)"', s)))
for tid in tids:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2505.09388v1#' + tid + '\n\n' + txt(m.group(0)))
anc = sorted(set(re.findall(r'id="((?:S|A)\d+[A-Za-z0-9.]*)"', s)))
anc = [x for x in anc if not re.search(r'\.p\d|\.i\d|\.m\d|\.g\d|\.\d|\.st|\.sf', x)]
open('inputs/anchors_v1.txt', 'w').write('\n'.join(anc) + '\n')
print('ok', len(tids), 'tables', len(anc), 'anchors')
