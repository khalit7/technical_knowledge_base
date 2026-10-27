"""Parse every table of the arXiv HTML v2 into rows of cells [text, bold, colspan], for transcribing tables.json.
usage: python3 parse_tables.py <ldm.html>   -> inputs/tables_parsed.json"""
import html, json, re, sys
from html.parser import HTMLParser
s = open(sys.argv[1]).read()

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack = []; self.rows = []; self.cell = None; self.math = 0
    def handle_starttag(self, tag, a):
        a = dict(a); c = a.get('class', '') or ''
        kind = 'tr' if re.search(r'\bltx_tr\b', c) or tag == 'tr' else ('td' if re.search(r'\bltx_td\b', c) or tag in ('td', 'th') else None)
        self.stack.append((tag, kind, 'ltx_font_bold' in c))
        if kind == 'tr': self.rows.append([])
        if kind == 'td' and self.rows:
            m = re.search(r'ltx_colspan_(\d+)', c)
            self.cell = ['', False, int(m.group(1)) if m else 1]; self.rows[-1].append(self.cell)
        if tag == 'math':
            self.math += 1
            if self.cell is not None: self.cell[0] += ' ' + a.get('alttext', '') + ' '
        if self.cell is not None and 'ltx_font_bold' in c: self.cell[1] = True
    def handle_endtag(self, tag):
        while self.stack:
            t, k, b = self.stack.pop()
            if k == 'td': self.cell = None
            if t == 'math': self.math -= 1
            if t == tag: break
    def handle_data(self, d):
        if self.cell is not None and not self.math: self.cell[0] += d

out = {}
for m in re.finditer(r'<figure id="([^"]+)" class="ltx_table[^"]*"', s):
    tid = m.group(1)
    i = m.start(); depth = 0; j = i
    for t in re.finditer(r'<(/?)figure\b', s[i:]):
        depth += -1 if t.group(1) else 1
        if depth == 0: j = i + t.end(); break
    blk = s[i:j]
    p = P(); p.feed(blk)
    rows = [[[re.sub(r'\s+', ' ', html.unescape(c[0])).strip(), c[1], c[2]] for c in r] for r in p.rows if r]
    cap = re.search(r'<figcaption[^>]*>(.*?)</figcaption>', blk, re.S)
    ct = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda x: x.group(1), cap.group(1), flags=re.S) if cap else ''
    out[tid] = {'caption': re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', ct))).strip(), 'rows': rows}
json.dump(out, open('inputs/tables_parsed.json', 'w'), indent=0, ensure_ascii=False)
print(list(out))
