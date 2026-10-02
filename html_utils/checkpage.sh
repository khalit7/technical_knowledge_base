#!/bin/sh
# usage: sh html_utils/checkpage.sh <page folder>
# Opens every tab of <page folder>/index.html in light at 920 px and dark at 390 px, checks for text cut off at 390 px (clipcheck.mjs), prints failures,
# then one summary line. A page is publishable only with fail=0, emdash 0 and errbox 1.
# Screenshots land in <page folder>/.shots/ (gitignored) for you to look at.
H=$(cd "$(dirname "$0")" && pwd)
d="$1"; f="$d/index.html"; [ -f "$f" ] || { echo "no $f"; exit 1; }
mkdir -p "$d/.shots"; fail=0
for t in $(grep -oh 'data-t="t-[a-z0-9-]*"' "$f" | grep -o 't-[a-z0-9-]*' | sort -u); do
  for m in "light 920" "dark 390"; do
    set -- $m
    r=$(node "$H/tabshot.mjs" "$f" "$t" "$1" "$2" "$d/.shots/$t-$1-$2.png" 2>&1 | tail -1)
    case "$r" in *"errors [] sideways false"*) ;; *) echo "FAIL $t $m: $r"; fail=1;; esac
  done
done
# text cut off at phone width (no scrollbar shows it, so the screenshots alone miss it)
c=$(node "$H/clipcheck.mjs" "$f" dark 390 2>&1); clip=$(echo "$c" | grep -o 'clipped [0-9]*' | awk '{s+=$2} END{print s+0}')
[ "$clip" = 0 ] || { echo "$c" | grep -v 'clipped 0$' | sed 's/^/CLIP /'; fail=1; }
echo "$d: tabs $(grep -oh 'data-t="t-[a-z0-9-]*"' "$f" | sort -u | wc -l | tr -d ' '), bytes $(wc -c <"$f" | tr -d ' '), emdash $(grep -c '—' "$f"), errbox $(grep -c 'id="jsErr"' "$f"), scripts $(grep -o '<script' "$f" | wc -l | tr -d ' '), clipped $clip, fail=$fail"
[ $fail = 0 ]
