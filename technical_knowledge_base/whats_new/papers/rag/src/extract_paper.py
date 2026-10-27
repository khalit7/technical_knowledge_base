"""Extract the arXiv HTML (v4) of the RAG paper to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/2005.11401v4 -o rag_v4.html; python3 extract_paper.py rag_v4.html  (run in src/inputs/)"""
import re, sys, html
s = open(sys.argv[1]).read()
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
open('paper_v4.txt', 'w').write('Source: https://arxiv.org/html/2005.11401v4 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
for tid in ['S4.T2', 'S4.T3', 'S4.T5', 'S4.T6', 'A9.T7']:
    m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>\s*</div>\s*</figure>|<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
    open('table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2005.11401v4#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
