#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/. Copy this file to <page folder>/src/build.sh; it needs no edits for the standard layout.
# What to change for a new page: nothing here unless the layout differs. Set the <title> in parts/01_head.html,
# the storage key in parts/99_js_tabs.js, and add a tex2mathml pass (below, commented) only if the page has LaTeX.
# HTML order: 01_head, 10_header (title and tab bar), 20_read.html if present, then 20_read_*.html (Reading tab, byte order:
#   name the first part 20_read_a.html and the closing part 20_read_z.html), then 3*_tab_*.html (one group per tab, file-name order).
# A part may carry its own <style>; a tab's CSS is scoped under its tab id (#t-<tab> ...).
# JS: every *.js in parts/ in file-name order, each in its own <script> so one failing part cannot stop the others;
#   99_js_tabs.js (the tab wiring) last. The hidden #jsErr box and the error handler (05z_errbox.js.html) come before the scripts.
# Links: {{text|url}} becomes an external link (new tab); url may be n:<notion id> (a Notion page) or #t-<tab> (switches tab).
#   Plain <a> tags pass through untouched.
# Never put a literal backslash-n through echo here; keep such snippets in part files and cat them.
cd "$(dirname "$0")" || exit 1
P=parts
reads=$(ls $P/20_read_*.html 2>/dev/null | LC_ALL=C sort)
tabs=$(ls $P/3*_tab_*.html 2>/dev/null | LC_ALL=C sort)
js=$(ls $P/*.js 2>/dev/null | LC_ALL=C sort)
{ cat $P/01_head.html $P/10_header.html
  [ -f $P/20_read.html ] && cat $P/20_read.html
  for f in $reads; do cat "$f"; done
  for f in $tabs; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat $P/05z_errbox.js.html
  for f in $js; do [ "$(basename "$f")" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename "$f") */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat $P/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
# LaTeX pages only: convert \( \) and \[ \] to MathML at build time (fails loudly on a bad formula).
# R=$(git rev-parse --show-toplevel); node "$R/html_utils/tex2mathml.mjs" < ../index.html > ../index.tmp && mv ../index.tmp ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
ED=$(printf '\342\200\224')  # the em-dash character, written as bytes so this file contains none
if grep -q "$ED" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$ED.\{30\}" ../index.html | head; fi
wc -c ../index.html
