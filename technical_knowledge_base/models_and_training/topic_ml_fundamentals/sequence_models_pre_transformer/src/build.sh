#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/ (the parent topic's slot scheme, parts listed explicitly: shell glob order is locale-dependent).
# HTML: 01_head (closes <head>), 02_split (the split layout), 10_header (title and tab bar), 20_read_a/b/c (Reading), 31_tab_vec (Word vectors), 39_tab_more (Further reading).
# 02_split.html, 25_js_s3.js (renderer v2), 21_js_rd_common.js and 99_js_tabs.js are the explainer-page skill templates, copied unchanged (storage key sq-tab).
# JS: 21_js_data.js (written by export_data.py), the engines and 2D visuals, then 25_js_s3.js, then the 3D scenes 3x_js_sc_*.js, 99_js_tabs.js last; each in its own <script>.
# Links may be written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab); plain <a> tags pass through.
cd "$(dirname "$0")"
python3 export_data.py || exit 1
{ cat parts/01_head.html parts/02_split.html parts/10_header.html parts/20_read_a.html parts/20_read_b.html parts/20_read_c.html parts/31_tab_vec.html parts/39_tab_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in 21_js_data.js 21_js_rd_common.js 22_js_cells.js 23_js_mem.js 24_js_memres.js 25_js_s2s.js 27_js_s2sres.js 28_js_wavecfg.js 29_js_rdnums.js 31_js_vec.js 32_js_hero.js 33_js_grad.js \
           25_js_s3.js 34_js_sc_rnn.js 35_js_sc_lstm.js 36_js_sc_s2s.js 37_js_sc_wave.js 99_js_tabs.js; do echo "<script>/* $f */"; cat "parts/$f"; echo '</script>'; done
  echo '</div></body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
ED=$(printf '\342\200\224')  # the em-dash character, written as bytes so this file contains none
if grep -q "$ED" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$ED.\{30\}" ../index.html | head; fi
wc -c ../index.html
# Reading time: measured by html_utils/audit_pages.mjs (230 words a minute, closed details apart) and written here by hand after each rebuild;
# the best-resources total is summed from the Further reading list.
RT_CORE=24; RT_DET=5
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
