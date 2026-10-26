#!/bin/sh
# Reproduce every output shown on "JavaScript: the event loop, promises and streams". Copied from the language page's
# src/ja/run_all.sh (2026-10-26) and trimmed to this page's examples (i1 to i9, j1, j2, the six stepper programs).
# Toolchains live outside the repo (see versions.txt); point PL at your own copy. Writes outputs/*.txt and *.json.
# Recorded runtime: Node 24.21.0 (LTS); Node 22 and 26 are only used to list differences.
set -u
PL=${PL:-${TMPDIR:-/tmp}/pl}
NODE24=$PL/ja/node-v24.21.0-darwin-arm64/bin/node; NODE26=$PL/ja/node-v26.10.0-darwin-arm64/bin/node
NODE22=${NODE22:-$HOME/.nvm/versions/node/v22.22.2/bin/node}
export NO_COLOR=1
cd "$(dirname "$0")"; HERE=$(pwd); CODE=$HERE/code; OUT=$HERE/outputs; WORK=$PL/ja/work; mkdir -p "$OUT" "$WORK"
clean() { sed -e "s|file://$CODE/||g" -e "s|$CODE/||g" -e "s|$WORK|<work>|g" -e "s|$PL|<pl>|g" \
              -e '/^ *at .*(node:/d' -e '/^ *at async node:/d' -e '/^ *at node:/d'; }
cd "$CODE"
SIMPLE="i1_callbacks i2_promises i3_order i5_combinators i6_abort i7_unhandled i8_foreach i9_limit j2_async_gen"
for f in $SIMPLE; do echo "run $f"; { $NODE24 $f.mjs 2>&1; c=$?; [ $c -ne 0 ] && echo "[exit code $c]"; } | clean > "$OUT/$f.txt"; done
$NODE24 i4_trace.mjs "$OUT/i4_trace.json" | clean > "$OUT/i4_trace.txt"
$NODE24 j1_sse.mjs "$OUT/j1_sse.json" | clean > "$OUT/j1_sse.txt"
# event-loop stepper programs: record, then check the order is the same in 20 runs
: > "$OUT/loop_det.txt"
for f in loop/*; do b=$(basename $f); $NODE24 $f > "$OUT/loop_$b.txt" 2>&1; same=0
  for k in $(seq 20); do $NODE24 $f 2>&1 | cmp -s - "$OUT/loop_$b.txt" && same=$((same+1)); done
  echo "$b: $same of 20 runs gave the recorded order" >> "$OUT/loop_det.txt"; done
# the same deterministic examples on Node 22 and Node 26: any difference is listed
# (node_versions_diff.txt as recorded on 2026-10-05 covers the language page's wider set: 38 examples, 6 loop programs, 22 drills)
: > "$OUT/node_versions_diff.here.txt"
for f in $SIMPLE loop/*; do case $f in i5*|i8*|i9*|i7*) continue;; esac
  g=${f%.mjs}; [ -f "$g.mjs" ] && g=$g.mjs || g=$f
  for N in $NODE22 $NODE26; do $NODE24 $g 2>&1 | clean > "$WORK/a.txt"; $N $g 2>&1 | clean > "$WORK/b.txt"
    cmp -s "$WORK/a.txt" "$WORK/b.txt" || echo "$g differs on $($N -v)" >> "$OUT/node_versions_diff.here.txt"; done; done
echo done
