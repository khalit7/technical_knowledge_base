#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/ (the parent topic's slot scheme, parts listed explicitly).
# HTML: 01_head, 10_header (title and tab bar), 20_read_a/b/c (Reading), 31_tab_vec (Word vectors), 39_tab_more (Further reading).
# JS: 21_js_rd_common.js and 99_js_tabs.js are the explainer-page skill templates (never autoplay; storage key sq-tab).
# JS: 21_js_data.js (written by export_data.py) and every other *.js in file-name order, each in its own <script>, 99_js_tabs.js last.
# Links may be written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab); plain <a> tags pass through.
cd "$(dirname "$0")"
python3 export_data.py || exit 1
{ cat parts/01_head.html parts/10_header.html parts/20_read_a.html parts/20_read_b.html parts/20_read_c.html parts/31_tab_vec.html parts/39_tab_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</div></body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
D=$(printf '\342\200\224'); if grep -q "$D" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$D.\{30\}" ../index.html | head; fi
wc -c ../index.html
# Reading time: measured by html_utils/audit_pages.mjs (230 words a minute, closed details apart) and written here by hand after each rebuild;
# the best-resources total is summed from the Further reading list.
RT_CORE=19; RT_DET=5
RT_CORE=$RT_CORE RT_DET=$RT_DET python3 - <<'PY'
import re,os
s=open('../index.html').read()
tot=0
for x in re.findall(r'class="rt">\(([^)]*)\)',s[s.index('id="more-best"'):s.index('id="more-end-best"')]):
    h=re.search(r'(\d+)h',x);mm=re.search(r'(\d+) ?m(?:in)?\b',x)
    tot+=(int(h.group(1))*60 if h else 0)+(int(mm.group(1)) if mm else 0)
res='%dh %02dm'%(tot//60,tot%60)
s=s.replace('RT_CORE',os.environ['RT_CORE']).replace('RT_DET',os.environ['RT_DET']).replace('RES_TIME',res)
open('../index.html','w').write(s)
print('reading',os.environ['RT_CORE'],'min plus',os.environ['RT_DET'],'closed; resources',res)
PY
