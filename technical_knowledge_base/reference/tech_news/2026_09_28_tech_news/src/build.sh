#!/bin/sh
# Build ../index.html for one tech-news issue.
# 1. mk_items.py parses live.md (the verbatim Notion fetch) into data/items.json.
# 2. mk_issue.py merges it with data/annotations.json into parts/03_issue.html and parts/11_data.js,
#    including the visual parts parts/v_<name>.html where annotations say "viz_after".
# 3. The parts are concatenated: head and CSS, header (with the week strip), the issue, Further reading,
#    the hidden error box, then each script in its own <script>, tabs last.
# Links in any part are written {{text|url}}; url may be n:<notion id>. They expand to target="_blank" links.
set -e
cd "$(dirname "$0")"
# Scripts, each in its own <script>; the tab wiring last.
JS="parts/10_js_common.js parts/10b_js_anim.js parts/11_data.js parts/11b_js_jump.js parts/12_js_strip.js parts/13_js_price.js parts/14_js_sci.js parts/15_js_share.js parts/16_js_jit.js parts/17_js_quant.js parts/18_js_fusion.js parts/19_js_ord.js parts/90_js_tabs.js"
python3 mk_items.py
python3 mk_issue.py
{ cat parts/00_top.html parts/01_css.html parts/01b_css.html parts/02_header.html parts/03_issue.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in $JS; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; exit 1; fi
if grep -q "$(printf '\342\200\224')" ../index.html; then echo "EM DASH FOUND"; exit 1; fi
wc -c ../index.html
# Reading time (230 words per minute over the issue tab's visible text) and the resources total
python3 - <<'PY'
import re
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-more"')
t=re.sub(r'<script.*?</script>|<style.*?</style>','',s[a:b],flags=re.S);t=re.sub(r'<[^>]+>',' ',t)
w=len(t.split());m=round(w/230)
fr=s[s.index('<h3>Best resources</h3>'):]
tot=0
for x in re.findall(r'class="rt">\(([^)]*)\)',fr):
    h=re.search(r'(\d+)h',x);mm=re.search(r'(\d+) ?m(?:in)?\b',x)
    tot+=(int(h.group(1))*60 if h else 0)+(int(mm.group(1)) if mm else 0)
res='%dh %02dm'%(tot//60,tot%60)
s=s.replace('RT_MIN',str(m)).replace('RES_TIME',res)
open('../index.html','w').write(s)
print('reading words',w,'minutes',m,'resources',res)
PY
