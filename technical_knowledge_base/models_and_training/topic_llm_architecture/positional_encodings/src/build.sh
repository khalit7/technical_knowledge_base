#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/.
# HTML: 01_head, 10_header (title and tab bar), 20_read_*.html (Reading tab, byte order), then 3x_tab_*.html (one group per tab).
# JS: every *.js in parts/ in byte order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Links: {{text|url}}, {{text|n:<notion id>}}, {{text|#t-tab}}.
# Data parts (2x_js_pe_0data.js) are written by export_data.py from recorded outputs; it runs recompute.py first.
cd "$(dirname "$0")"
python3 export_data.py || exit 1
{ cat parts/01_head.html parts/10_header.html
  for f in $(ls parts/20_read_*.html | LC_ALL=C sort); do cat "$f"; done
  for f in $(ls parts/3*_tab_*.html | LC_ALL=C sort); do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in $(ls parts/*.js | LC_ALL=C sort); do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
D=$(printf '\342\200\224'); if grep -q "$D" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$D.\{30\}" ../index.html | head; fi
# Reading time: 230 words a minute over the visible text of the Reading tab and of the two lab tabs; closed <details> counted apart
python3 - <<'PY'
import re
s = open('../index.html').read()
def words(a, b):
    t = s[s.index('id="%s"' % a):s.index('id="%s"' % b)]
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', t, flags=re.S)
    det = ' '.join(re.findall(r'<details.*?</details>', t, flags=re.S))
    det = re.sub(r'<summary.*?</summary>', '', det, flags=re.S)
    body = re.sub(r'<details.*?</details>', ' ', t, flags=re.S)
    cnt = lambda x: len(re.sub(r'<[^>]+>', ' ', x).split())
    return cnt(body), cnt(det)
r, rd = words('t-read', 't-past'); p, pd = words('t-past', 't-spec'); q, qd = words('t-spec', 't-more')
m = lambda w: max(1, round(w / 230))
s = s.replace('RT_READ', str(m(r))).replace('RT_DET', str(m(rd + pd + qd))).replace('RT_LABS', str(m(p + q)))
open('../index.html', 'w').write(s)
print('reading words', r, 'min', m(r), '| details words', rd + pd + qd, 'min', m(rd + pd + qd), '| lab tabs words', p + q, 'min', m(p + q))
PY
wc -c ../index.html
