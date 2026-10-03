"""Extract the arXiv HTML (v1, the only version) of Latent Context Language Models (2606.09659) to plain text, and its tables to text.
usage: curl -sL https://arxiv.org/html/2606.09659v1 -o /tmp/lclm.html; python3 extract_paper.py /tmp/lclm.html"""
import re, sys, html
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + m.group(1) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
art = s[a:b]
art = re.sub(r'<section[^>]*id="bib".*?</section>', '', art, flags=re.S)
open('inputs/paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2606.09659v1 (extracted by extract_paper.py; bibliography dropped)\n\n' + txt(art))
tids = sorted(set(re.findall(r'<figure[^>]*class="ltx_table"[^>]*id="([^"]+)"', s)) | set(re.findall(r'<figure[^>]*id="([^"]+)"[^>]*class="ltx_table"', s)))
out = []
for tid in tids:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    out.append('=== ' + tid + '  https://arxiv.org/html/2606.09659v1#' + tid + '\n' + txt(m.group(0)))
open('inputs/tables_v1.txt', 'w').write('\n'.join(out))
print('ok', len(tids), 'tables')
