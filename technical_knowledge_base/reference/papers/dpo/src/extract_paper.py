"""Extract the arXiv HTML (v3) of DPO to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/2305.18290v3 -o /tmp/dpo.html; python3 extract_paper.py /tmp/dpo.html [v3]"""
import re, sys, html
s = open(sys.argv[1]).read()
v = sys.argv[2] if len(sys.argv) > 2 else 'v3'
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_%s.txt' % v, 'w').write('Source: https://arxiv.org/html/2305.18290%s (extracted by extract_paper.py)\n\n' % v + txt(s[a:b]))
if v == 'v3':
    for tid in re.findall(r'<figure[^>]*id="([SA]\d+\.T\d+)"', s):
        m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
        open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2305.18290v3#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
