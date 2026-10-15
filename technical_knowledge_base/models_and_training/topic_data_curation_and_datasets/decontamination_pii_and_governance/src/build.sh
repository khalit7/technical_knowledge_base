#!/bin/sh
# Assemble ../index.html from parts/ (pattern of the root's src/build.sh and the sibling pretraining_corpora, 2026-10-14).
# HTML: 01_head, 10_header (title and tab bar), 20_read_*.html (Reading tab, in file-name order), then 3x_tab_*.html (one per tab).
# JS: data/dg_data.json as window.DG, then every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js last.
# Prose numbers are written @@key@@ and filled from data/facts.json (made by build_data.py from the recorded runs);
# a fact whose run is pending stays unfilled and is reported.
# Links may be written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab); plain <a> tags pass through.
cd "$(dirname "$0")"
{ cat parts/01_head.html parts/10_header.html
  for f in parts/20_read_*.html; do cat "$f"; done
  for f in parts/3*_tab_*.html; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  printf '<script>/* data/dg_data.json */\nwindow.DG='; cat data/dg_data.json; printf ';\n</script>\n'
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</div></body></html>'; } | perl -CSD -MJSON::PP -pe '
BEGIN{local $/;open(my $fh,"<","data/facts.json") or die;$F=JSON::PP->new->utf8(0)->decode(<$fh>);}
s/\@\@([a-z0-9_]+)\@\@/exists $F->{$1}?$F->{$1}:"\@\@$1\@\@"/ge;
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '@@[a-z0-9_]*@@' ../index.html; then echo "UNFILLED FACT"; grep -o '@@[a-z0-9_]*@@' ../index.html | sort | uniq -c; fi
if perl -CSD -ne 'exit 1 if /\x{2014}/' ../index.html; then :; else echo "EM DASH FOUND"; fi
wc -c ../index.html
