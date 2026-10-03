"""Extract the arXiv HTML of Ettin (Seq vs Seq) to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/2507.11412v2 -o /tmp/e2.html; curl -sL https://arxiv.org/html/2507.11412v1 -o /tmp/e1.html
       python3 extract_paper.py /tmp/e2.html v2; python3 extract_paper.py /tmp/e1.html v1"""
import re, sys, html
s = open(sys.argv[1]).read(); v = sys.argv[2]
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_%s.txt' % v, 'w').write('Source: https://arxiv.org/html/2507.11412%s (extracted by extract_paper.py)\n\n' % v + txt(s[a:b]))
if v == 'v2':
    for tid in re.findall(r'<figure[^>]*id="((?:S|A)\d+\.T\d+)"', s):
        m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
        open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2507.11412v2#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
