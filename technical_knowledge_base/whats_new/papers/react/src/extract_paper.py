"""Extract the arXiv HTML of the ReAct paper to plain text, and its tables to text files.
usage (in src/inputs/): curl -sL https://arxiv.org/html/2210.03629v3 -o react_v3.html; python3 ../extract_paper.py react_v3.html v3
       (and the same for v1, to compare the versions; the HTML files themselves are not kept)"""
import re, sys, html
s = open(sys.argv[1]).read(); v = sys.argv[2]
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    x = x.replace('\u2014', ' -- ')   # the repository keeps no em-dashes, even in extracts
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('paper_%s.txt' % v, 'w').write('Source: https://arxiv.org/html/2210.03629%s (extracted by extract_paper.py)\n\n' % v + txt(s[a:b]))
if v == 'v3':
    for tid in ['S3.T1', 'S3.T2.fig1', 'S4.T4', 'A1.T5', 'A3.T6', 'A4.T10']:
        m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>\s*</div>\s*</figure>|<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
        if not m:
            m = re.search(r'<[a-z]+[^>]*id="' + re.escape(tid) + r'"', s); i = m.start(); m = re.match(r'.{0,6000}', s[i:], re.S)
        open('table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2210.03629v3#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
