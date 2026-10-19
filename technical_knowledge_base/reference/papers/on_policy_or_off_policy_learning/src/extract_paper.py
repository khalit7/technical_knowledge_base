"""Extract the arXiv HTML of On-Policy or Off-Policy Learning? (distillation dynamics) (2609.35259) to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/2609.35259v1 -o SCRATCH/opd_v1.html   (only v1 exists, checked 2026-10-19)
       python3 extract_paper.py SCRATCH/opd_v1.html v1"""
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
    x = x.replace('\u2014', '--')   # no em-dashes in saved extracts
    x = re.sub(r'\S+@\S+', '[email removed]', x)   # no emails in the repo
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_%s.txt' % v, 'w').write('Source: https://arxiv.org/html/2609.35259%s (extracted by extract_paper.py)\n\n' % v + txt(s[a:b]))
if v == 'v1':
    for tid in re.findall(r'<figure[^>]*id="([SA]\d+\.T\d+)"', s):
        m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
        open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2609.35259v1#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
