"""Extract the arXiv HTML (v1) of Constitutional AI to plain text (inputs/paper_v1.txt) and list its anchors.
usage: curl -sL https://arxiv.org/html/2212.08073v1 -o /tmp/cai.html; python3 extract_paper.py /tmp/cai.html"""
import re, sys, html, os
s = open(sys.argv[1]).read()
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'<(h\d|section|figure)[^>]*id="([^"]+)"[^>]*>', lambda m: '\n[#%s] ' % m.group(2), x)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
os.makedirs('inputs', exist_ok=True)
open('inputs/paper_v1.txt', 'w').write('Source: https://arxiv.org/html/2212.08073v1 (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
print('ok')
