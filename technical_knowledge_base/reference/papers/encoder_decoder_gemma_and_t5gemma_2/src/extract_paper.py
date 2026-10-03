"""Extract the arXiv HTML of both papers to plain text, and each table to its own text file.
usage: curl -sL https://arxiv.org/html/2504.06225v1 -o a.html; curl -sL https://arxiv.org/html/2512.14856v2 -o b.html
       python3 extract_paper.py a.html b.html   (writes inputs/)"""
import re, sys, html, os
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x)
    x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
for path, tag, ver in ((sys.argv[1], 'edgemma', '2504.06225v1'), (sys.argv[2], 't5gemma2', '2512.14856v2')):
    s = open(path).read()
    a = s.index('<article'); b = s.index('</article>')
    open('inputs/%s_%s.txt' % (tag, ver), 'w').write('Source: https://arxiv.org/html/%s (extracted by extract_paper.py)\n\n' % ver + txt(s[a:b]))
    ids = re.findall(r'<figure[^>]*class="ltx_table"[^>]*id="([^"]+)"', s) + re.findall(r'<figure[^>]*id="([^"]+)"[^>]*class="ltx_table"', s)
    with open('inputs/%s_tables.txt' % tag, 'w') as f:
        for tid in dict.fromkeys(ids):
            a0 = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'"', s).start()
            depth, j = 0, a0
            for t in re.finditer(r'<figure\b|</figure>', s[a0:]):  # the whole figure, nested sub-tables included
                depth += 1 if t.group(0) == '<figure' else -1
                if depth == 0: j = a0 + t.end(); break
            f.write('=== %s  https://arxiv.org/html/%s#%s\n%s\n' % (tid, ver, tid, txt(s[a0:j])))
    print(tag, 'tables', list(dict.fromkeys(ids)))
