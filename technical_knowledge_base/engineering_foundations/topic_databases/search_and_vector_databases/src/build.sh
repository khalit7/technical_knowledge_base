#!/bin/sh
# Assemble ../index.html from parts/ (same scheme as the root Topic: databases and the sibling pages).
# HTML: 01_head, 10_header (title and tab bar), 20_read_*.html (Reading tab), then 3x_tab_*.html (one per tab, in file-name order).
# JS: every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Links may be written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab); plain <a> tags pass through.
# Measured numbers in the prose are written @@key@@ and filled from facts.json (written by build_data.py from inputs/).
cd "$(dirname "$0")"
python3 build_data.py || exit 1
{ cat parts/01_head.html parts/10_header.html parts/20_read_*.html
  for f in parts/3*_tab_*.html; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</div></body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
python3 - <<'PY'
import re, json, html
s = open('../index.html').read(); f = json.load(open('facts.json'))
missing = sorted(set(k for k in re.findall(r'@@([a-z0-9_]+)@@', s) if k not in f))
if missing: print('MISSING FACTS', missing)
s = re.sub(r'@@([a-z0-9_]+)@@', lambda m: html.escape(str(f.get(m.group(1), '@@' + m.group(1) + '@@')), quote=False), s)
a = s.index('id="t-read"'); b = s.index('id="t-ann"')
t = re.sub(r'<script.*?</script>|<style.*?</style>', '', s[a:b], flags=re.S); t = re.sub(r'<[^>]+>', ' ', t)
w = len(t.split()); m = round(w / 230)
s = s.replace('RT_MIN', str(m)).replace('RT_WORDS', f'{w:,}')
open('../index.html', 'w').write(s)
print('reading words', w, 'minutes', m)
PY
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; grep -n -o '.\{30\}—.\{30\}' ../index.html | head; fi
wc -c ../index.html
