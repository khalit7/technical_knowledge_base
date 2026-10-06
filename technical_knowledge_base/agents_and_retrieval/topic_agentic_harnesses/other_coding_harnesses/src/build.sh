#!/bin/sh
# Assemble ../index.html from parts/.
# HTML: 01_head, 10_header (title and tab bar), 20_read.html then 20_read_*.html (Reading tab), then 3x_tab_*.html (one per tab, in file-name order).
# A part may carry its own <style> (deep tabs keep their CSS scoped under their tab id).
# JS: every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Source links: {{text|cx:path#L1-L2}} (cx codex, gm gemini-cli, oc opencode, ai aider, oh openhands sdk, ms mini-swe-agent) expand to GitHub at the pinned commit.
# Links may be written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab); plain <a> tags pass through.
cd "$(dirname "$0")"
{ cat parts/01_head.html parts/10_header.html parts/20_read.html parts/20_read_*.html
  for f in parts/3*_tab_*.html; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%R=(cx=>"https://github.com/openai/codex/blob/d27764b82f7118f674371e6d6e76271d9d606edb/",gm=>"https://github.com/google-gemini/gemini-cli/blob/b460678f3db508407554afd604cc9d6635becb2a/",oc=>"https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/",ai=>"https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/",oh=>"https://github.com/OpenHands/software-agent-sdk/blob/54daf056bd863bb46f922a2fe9324dd736b37ff6/",ms=>"https://github.com/SWE-agent/mini-swe-agent/blob/a83fcae82d2a08f0ee0c688f9d137b3566c097f8/")}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};$u=~s{^(cx|gm|oc|ai|oh|ms):}{$R{$1}}e;"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
D=$(printf '\342\200\224'); if grep -q "$D" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$D.\{30\}" ../index.html | head; fi
wc -c ../index.html
