"""Extract the arXiv HTML (v2) of ViT (An Image is Worth 16x16 Words) to plain text and its tables to TSV.
usage: curl -sL https://arxiv.org/html/2010.11929v2 -o $SCRATCH/vit.html; python3 extract_paper.py $SCRATCH/vit.html"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x).replace('—', ' -- ')  # the repository allows no em-dashes, even in extracts
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_v2.txt', 'w').write('Source: https://arxiv.org/html/2010.11929v2 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in ['S4.T1', 'S4.T2', 'A2.T3', 'A2.T4', 'A3.T5', 'A3.T6', 'A4.T7', 'A4.T8']:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2010.11929v2#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
