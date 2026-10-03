"""Extract the arXiv HTML of Learn What's Left (SA-MRPO) (2608.16072) to plain text and its tables to text files.
usage: for v in v1 v2 v1; do curl -sL https://arxiv.org/html/2608.16072$v -o /tmp/dsm_$v.html; done
       python3 extract_paper.py /tmp/dsm_v1.html v1   (and v1, v2 for the version diff)"""
import re, sys, html
s = open(sys.argv[1]).read()
v = sys.argv[2] if len(sys.argv) > 2 else 'v1'
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + m.group(1) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_%s.txt' % v, 'w').write('Source: https://arxiv.org/html/2608.16072%s (extracted by extract_paper.py)\n\n' % v + txt(s[a:b]))
if v == 'v1':
    for tid in re.findall(r'<figure[^>]*id="([SA]\d+\.T\d+)"', s):
        m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
        open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2608.16072v1#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
