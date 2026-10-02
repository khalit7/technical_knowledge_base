"""Extract the arXiv HTML (v1) of CLIP to plain text, its tables to TSV-like text, and its anchor ids.
usage: curl -sL https://arxiv.org/html/2103.00020v1 -o $SCRATCH/clip.html; python3 extract_paper.py $SCRATCH/clip.html"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x).replace('\u2014', ' -- ')  # the repository allows no em-dashes, even in extracts
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2103.00020v1 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
ids = sorted(set(re.findall(r'id="((?:S|A|Sx)\d[^"]*)"', s)))
open('inputs/anchors.txt', 'w').write('\n'.join(ids) + '\n')
for tid in re.findall(r'<figure[^>]*id="((?:S|A)\d+\.T\d+)"', s):
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2103.00020v1#' + tid + '\n\n' + txt(m.group(0)))
print('ok', len(ids))
