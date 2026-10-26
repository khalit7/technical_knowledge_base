"""Extract the arXiv HTML of GRAFT: Gradient Routing Localizes and Removes Unintended Behaviors in RL (2610.17062) to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/2610.17062v1 -o <scratch>/graft_v1.html
       python3 extract_paper.py <scratch>/graft_v1.html v1   (v1 is the only version as of 26 October 2026)"""
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
    x = x.replace('\u2014', '--')  # no em-dashes in saved extracts (writing-style.md)
    x = re.sub(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}', '[email removed]', x)  # no addresses in the repo
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_%s.txt' % v, 'w').write('Source: https://arxiv.org/html/2610.17062%s (extracted by extract_paper.py)\n\n' % v + txt(s[a:b]))
if v == 'v1':
    for tid in re.findall(r'<figure[^>]*id="([SA]\d+\.T\d+)"', s):
        m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
        open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2610.17062v1#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
# anchors this page may link to: sections, tables, figures, equations (S..., A...) and the algorithm (alg1)
ids = [i for i in re.findall(r'id="([^"]+)"', s) if (re.match(r'[SA]\d', i) and not re.search(r'\.p\d|bib', i)) or re.fullmatch(r'alg\d+', i)]
open('inputs/anchors.txt', 'w').write('\n'.join(dict.fromkeys(ids)) + '\n')
