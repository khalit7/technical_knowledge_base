"""Extract the arXiv HTML of Bitune (2405.14862) to plain text, list its anchors, and dump every table to text.
usage: curl -sL https://arxiv.org/html/2405.14862v2 -o /tmp/bitune_v2.html; python3 extract_paper.py /tmp/bitune_v2.html v2"""
import re, sys, html
s = open(sys.argv[1]).read(); ver = sys.argv[2]
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
a = s.index('<article'); b = s.index('</article>')
open('inputs/paper_' + ver + '.txt', 'w').write('Source: https://arxiv.org/html/2405.14862' + ver + ' (extracted by extract_paper.py)\n\n' + txt(s[a:b]))
ids = re.findall(r'id="((?:S|A|Sx)\d[\w.]*)"', s)
open('inputs/anchors_' + ver + '.txt', 'w').write('\n'.join(i for i in ids if re.match(r'^(S\d+(\.SS\d+)?(\.SSS\d+)?|.*\.T\d+|.*\.F\d+|.*\.E\d+|A\d+(\.SS\d+)?)$', i)) + '\n')
print('ok', len(ids))
