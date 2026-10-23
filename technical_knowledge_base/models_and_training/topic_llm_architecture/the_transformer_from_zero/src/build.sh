#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/.
# Data first: make_page_data.py writes parts/22_js_tz_0data.js and page_text.json from the recorded outputs in src/.
# HTML: 01_head, 10_header (title and tab bar), 20_read_*.html (Reading tab: 20_read_a first), then 3x_tab_*.html, 39_tab_more.
# JS: every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Links {{text|url}} (n:<notion id>, #t-<tab>, or https://...); then fill.py resolves [[...]] placeholders (facts, code refs).
cd "$(dirname "$0")"
python3 make_page_data.py || exit 1
python3 journey/journey_data.py || exit 1   # the Token's journey extract (journey/out/journey.json) to parts/34_js_tj_0data.js
{ cat parts/01_head.html parts/10_header.html parts/20_read_*.html
  for f in parts/3*_tab_*.html; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
python3 fill.py ../index.html $FILL_FLAGS || exit 1
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
D=$(printf '\342\200\224'); if grep -q "$D" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$D.\{30\}" ../index.html | head; fi
wc -c ../index.html
# Reading time (230 words per minute over the Reading tab's visible text) and the best-resources total
python3 - <<'PY'
import re
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-build"')
r=re.sub(r'<script.*?</script>|<style.*?</style>','',s[a:b],flags=re.S)
det=' '.join(re.findall(r'<details.*?</details>',r,flags=re.S));r=re.sub(r'<details.*?</details>',' ',r,flags=re.S)
t=re.sub(r'<[^>]+>',' ',r);dw=len(re.sub(r'<[^>]+>',' ',det).split())
w=len(t.split());m=round(w/230);dm=round(dw/230)
tot=0
for x in re.findall(r'class="rt">\(([^)]*)\)',s[s.index('id="more-best"'):s.index('id="more-end-best"')]):
    h=re.search(r'(\d+)h',x);mm=re.search(r'(\d+) ?m(?:in)?\b',x)
    tot+=(int(h.group(1))*60 if h else 0)+(int(mm.group(1)) if mm else 0)
res='%dh %02dm'%(tot//60,tot%60)
s=s.replace('RT_MIN',str(m)).replace('RT_DET',str(dm)).replace('RES_TIME',res)
open('../index.html','w').write(s)
print('reading words',w,'minutes',m,'details words',dw,'minutes',dm,'resources',res)
PY
