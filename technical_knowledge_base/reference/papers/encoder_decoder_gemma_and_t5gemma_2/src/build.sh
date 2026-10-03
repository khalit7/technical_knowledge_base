#!/bin/sh
# Build ../index.html for the Encoder-Decoder Gemma and T5Gemma 2 page. Adapted from the reference paper page's build.sh
# for a page that covers two papers. Fail-safe: every JS part in its own <script>, tab wiring last, the hidden
# #jsErr box and global error handler before any script.
# Link macros in the HTML parts:
#   {{text|url}}            external link, new tab
#   {{text|n:<notion id>}}  knowledge base page
#   {{text|ax:<anchor>}}    Encoder-Decoder Gemma (arXiv 2504.06225v1) at that anchor
#   {{text|bx:<anchor>}}    T5Gemma 2 (arXiv 2512.14856v2) at that anchor
#   {{text|tab:<tab>[:id]}} another tab of this page (optionally scrolled to an element)
#   [[<anchor>|label]]      "in the paper" margin label, Encoder-Decoder Gemma; [[B:<anchor>|label]] for T5Gemma 2
#   @@CARD@@                the headline card generated from paper.json
set -e
cd "$(dirname "$0")"
python3 recompute.py > /dev/null
python3 mk_paper.py
python3 - <<'PY'
import json, re
P = json.load(open('paper.json'))
AX = {p['key']: 'https://arxiv.org/html/%s%s' % (p['arxiv'], p['arxiv_v']) for p in P['papers']}
HTML = ['00_top.html', '01_css.html', '02_header.html', '03_paper.html', '04_run.html', '05_tables.html', '_gen_more.html']
JS = ['10_js_common.js', '_gen_data.js', '11_js_ui.js', '12_js_adapt.js', '13_js_merged.js', '14_js_cost.js', '15_js_read.js',
      '23_js_toy.js', '24_js_tables.js', '90_js_tabs.js']
rd = lambda f: open('parts/' + f, encoding='utf-8').read()
body = ''.join(rd(f) for f in HTML).replace('@@CARD@@', rd('_gen_card.html'))
A = lambda u, t: '<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (u, t)
def link(m):
    t, u = m.group(1), m.group(2)
    if u.startswith('tab:'):
        x = u[4:].split(':')
        return '<a href="#" data-tab="%s"%s>%s</a>' % (x[0], (' data-to="%s"' % x[1]) if len(x) > 1 else '', t)
    if u.startswith('n:'): u = 'https://app.notion.com/p/' + u[2:]
    elif u.startswith('ax:'): u = AX['A'] + '#' + u[3:]
    elif u.startswith('bx:'): u = AX['B'] + '#' + u[3:]
    elif not u.startswith('http'): raise SystemExit('bad link target ' + u)
    return A(u, t)
body = re.sub(r'\{\{([^|{}]+)\|([^{}]+)\}\}', link, body)
def margin(m):
    k = 'B' if m.group(1) else 'A'
    return '<a class="where" href="%s#%s" target="_blank" rel="noopener noreferrer" title="Where this is in the paper (arXiv HTML)">%s%s</a>' % (AX[k], m.group(2), 'T5Gemma 2: ' if k == 'B' else '', m.group(3))
body = re.sub(r'\[\[(B:)?([A-Za-z0-9.]+)\|([^\]]+)\]\]', margin, body)
out = body + '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>\n'
out += rd('05z_errbox.js.html')
for f in JS:
    out += '<script>/* %s */\n%s\n</script>\n' % (f, rd(f))
out += '</div></body></html>\n'
for bad, msg in (('{{', 'unexpanded link'), ('[[S', 'unexpanded margin label'), ('[[B:', 'unexpanded margin label'), ('\u2014', 'EM DASH FOUND'), ('@@', 'unexpanded placeholder')):
    if bad in out: raise SystemExit(msg + ': ' + out[out.index(bad) - 80:out.index(bad) + 80])
a = out.index('id="t-read"'); b = out.index('id="t-run"')
t = re.sub(r'<script.*?</script>|<style.*?</style>|<details class="more">.*?</details>', '', out[a:b], flags=re.S); t = re.sub(r'<[^>]+>', ' ', t)  # collapsed details are opt-in, not counted
w = len(t.split()); mins = round(w / 230)
fr = out[out.index('id="t-more"'):]
tot = 0
for x in re.findall(r'class="rt">\(([^)]*)\)', fr):
    h = re.search(r'(\d+)h', x); mm = re.search(r'(\d+) ?m(?:in)?\b', x)
    tot += (int(h.group(1)) * 60 if h else 0) + (int(mm.group(1)) if mm else 0)
out = out.replace('RT_MIN', str(mins)).replace('RES_TIME', '%dh %02dm' % (tot // 60, tot % 60))
open('../index.html', 'w', encoding='utf-8').write(out)
print('reading words', w, 'minutes', mins, 'resources %dh %02dm' % (tot // 60, tot % 60), 'bytes', len(out.encode()))
PY
