"""Extract the arXiv HTML (v1, the only version) of Context Language Models (2609.37725) to plain text, and its tables to text.
usage: curl -sL https://arxiv.org/html/2609.37725v1 -o $SCRATCH/clm.html; python3 extract_paper.py $SCRATCH/clm.html
(also: grep -o 'id="[SA][0-9A-Za-z.]*"' on the same file gives inputs/anchors.txt, which build.sh checks every ax: link against)"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + m.group(1) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    x = x.replace('\u2014', '--')   # no em-dashes in saved extracts (writing rule)
    x = re.sub(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}', '[email removed]', x)   # privacy rule
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
art = s[a:b]
art = re.sub(r'<section[^>]*id="bib".*?</section>', '', art, flags=re.S)
open('inputs/paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2609.37725v1 (extracted by extract_paper.py; bibliography dropped)\n\n' + txt(art))
tids = sorted(set(re.findall(r'<figure[^>]*class="ltx_table"[^>]*id="([^"]+)"', s)) | set(re.findall(r'<figure[^>]*id="([^"]+)"[^>]*class="ltx_table"', s)))
out = []
for tid in tids:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    out.append('=== ' + tid + '  https://arxiv.org/html/2609.37725v1#' + tid + '\n' + txt(m.group(0)))
open('inputs/tables_v1.txt', 'w').write('\n'.join(out))
print('ok', len(tids), 'tables')
