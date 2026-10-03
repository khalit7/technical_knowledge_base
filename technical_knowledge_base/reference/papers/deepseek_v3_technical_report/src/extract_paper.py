"""Extract the arXiv HTML of the DeepSeek-V3 Technical Report to plain text and its tables to text files.
usage: curl -sL https://arxiv.org/html/2412.19437v2 -o v2.html; curl -sL https://arxiv.org/html/2412.19437v1 -o v1.html
       python3 extract_paper.py v2.html v1.html   (writes into inputs/)"""
import re, sys, html, os
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
os.makedirs('inputs', exist_ok=True)
for path, ver in zip(sys.argv[1:], ['v2', 'v1']):
    s = open(path).read()
    a = s.index('<article'); b = s.index('</article>')
    body = txt(s[a:b])
    open(f'inputs/paper_{ver}.txt', 'w').write(f'Source: https://arxiv.org/html/2412.19437{ver} (extracted by extract_paper.py)\n\n' + body)
    if ver == 'v2':
        ids = sorted(set(re.findall(r'id="((?:S|A)\d+(?:\.(?:SS|SSS|T|F|E|Ex|p)\d+)*)"', s)))
        open('inputs/anchors_v2.txt', 'w').write('\n'.join(i for i in ids if '.p' not in i and '.Ex' not in i) + '\n')
        for tid in re.findall(r'<figure[^>]*id="([^"]*\.T\d+)"', s):
            m = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S)
            open('inputs/table_' + tid.replace('.', '_') + '.txt', 'w').write('Source: https://arxiv.org/html/2412.19437v2#' + tid + '\n\n' + txt(m.group(0)))
print('ok')
