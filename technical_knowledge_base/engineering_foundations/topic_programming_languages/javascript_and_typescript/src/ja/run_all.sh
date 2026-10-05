#!/bin/sh
# Reproduce every output shown in Part 1 (JavaScript and its runtime). Toolchains live in the session scratchpad
# (see versions.txt); point PL at your own copy. Writes outputs/*.txt and *.json. Recorded runtime: Node 24.21.0 (LTS).
set -u
PL=${PL:-/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl}
NODE24=$PL/ja/node-v24.21.0-darwin-arm64/bin/node; NODE26=$PL/ja/node-v26.10.0-darwin-arm64/bin/node
NODE22=${NODE22:-/Users/khalid/.nvm/versions/node/v22.22.2/bin/node}
export PATH=$PL/ja/node-v24.21.0-darwin-arm64/bin:$PL/ja/pnpm/bin:$PL/ja/deno:$PL/bin:$PATH
export npm_config_cache=$PL/ja/npmcache npm_config_userconfig=$PL/ja/empty.npmrc XDG_DATA_HOME=$PL/ja/xdg XDG_CACHE_HOME=$PL/ja/xdgcache
export BUN_INSTALL_CACHE_DIR=$PL/ja/buncache DENO_DIR=$PL/ja/denodir NO_COLOR=1
cd "$(dirname "$0")"; HERE=$(pwd); CODE=$HERE/code; OUT=$HERE/outputs; WORK=$PL/ja/work; mkdir -p "$OUT" "$WORK"
export CODE WORK NODE22 NODE24 NODE26 PY=$PL/pa/venv/bin/python ROSETTA=$HERE/../../../src/rosetta/data
ROS=$(cd "$ROSETTA" && pwd)
clean() { sed -e "s|file://$CODE/||g" -e "s|$CODE/||g" -e "s|$ROS/|<rosetta>/|g" -e "s|$WORK|<work>|g" -e "s|$PL|<pl>|g" -e "s|/private/tmp/[^ ]*/scratchpad/pl/ja/work|<work>|g" \
              -e '/^ *at .*(node:/d' -e '/^ *at async node:/d' -e '/^ *at node:/d'; }
cd "$CODE"
SIMPLE="a1_hello b1_numbers b2_bigint b3_strings b4_nullish b5_truthy b6_equality b7_scope c1_objects c2_arrays c3_destructure c4_copy
 d1_functions d2_closures d3_this e1_classes e1b_private e2_prototype e3_dunders g1_errors g2_uncaught h1_iter h2_generators
 e4_proxy x2_pollution i1_callbacks i2_promises i3_order i5_combinators i6_abort i7_unhandled i8_foreach i9_limit j2_async_gen k1_fs k5_fetch k6_workers n2_shapes_bench"
for f in $SIMPLE; do echo "run $f"; { $NODE24 $f.mjs 2>&1; c=$?; [ $c -ne 0 ] && echo "[exit code $c]"; } | clean > "$OUT/$f.txt"; done
{ $NODE24 k2_process.mjs chat.jsonl -k 3 --verbose 2>&1; echo "[exit code $?]"; } | clean > "$OUT/k2_process.txt"
{ $NODE24 k3_count_tokens.mjs "$ROS/chat.jsonl"; $NODE24 k3_count_tokens.mjs nope.jsonl 2>&1; echo "[exit code $?]"; } | clean > "$OUT/k3_count_tokens.txt"
$NODE24 --allow-natives-syntax n1_shapes.mjs 2>&1 | clean > "$OUT/n1_shapes.txt"
$NODE24 --trace-opt --trace-deopt n3_deopt.mjs | grep -E "JSFunction add|^now|^[0-9]" | sed -E -e 's/ ?0x[0-9a-f]+ ?/ /g' -e 's/ \(sfi = [^)]*\)//g' \
  -e 's/, ConcurrencyMode::k[A-Za-z]+//' -e 's/, mode: ConcurrencyMode::k[A-Za-z]+//' -e 's/ - took .*\]/]/' -e 's/(reason: [^)]*\)): begin\..*/\1]/' -e 's/<JSFunction add>/add/' -e 's/  +/ /g' > "$OUT/n3_deopt.txt"
$NODE24 i4_trace.mjs "$OUT/i4_trace.json" | clean > "$OUT/i4_trace.txt"
$NODE24 j1_sse.mjs "$OUT/j1_sse.json" | clean > "$OUT/j1_sse.txt"
sh f_mod.sh 2>&1 | clean > "$OUT/f_mod.txt"
{ echo '$ node x1_temporal.mjs   # Node 24.21.0'; $NODE24 x1_temporal.mjs; echo '$ node x1_temporal.mjs   # Node 26.10.0'; $NODE26 x1_temporal.mjs; } > "$OUT/x1_temporal.txt" 2>&1
# event-loop stepper snippets: record, then check the order is the same in 20 runs
: > "$OUT/loop_det.txt"
for f in loop/*; do b=$(basename $f); $NODE24 $f > "$OUT/loop_$b.txt" 2>&1; same=0
  for k in $(seq 20); do $NODE24 $f 2>&1 | cmp -s - "$OUT/loop_$b.txt" && same=$((same+1)); done
  echo "$b: $same of 20 runs gave the recorded order" >> "$OUT/loop_det.txt"; done
for f in q/*.mjs; do b=$(basename $f .mjs); $NODE24 $f > "$OUT/q_$b.txt" 2>&1; done
# the same deterministic examples on Node 22 and Node 26: any difference is listed
: > "$OUT/node_versions_diff.txt"
for f in $SIMPLE loop/* q/*.mjs; do case $f in i5*|i8*|i9*|k6*|n2*|a1*|g2*|i7*|e1b*) continue;; esac
  g=${f%.mjs}; [ -f "$g.mjs" ] && g=$g.mjs || g=$f
  for N in $NODE22 $NODE26; do $NODE24 $g 2>&1 | clean > "$WORK/a.txt"; $N $g 2>&1 | clean > "$WORK/b.txt"
    cmp -s "$WORK/a.txt" "$WORK/b.txt" || echo "$g differs on $($N -v)" >> "$OUT/node_versions_diff.txt"; done; done
echo "checked $(echo $SIMPLE | wc -w | tr -d ' ') examples, $(ls loop | wc -l | tr -d ' ') loop snippets, $(ls q | wc -l | tr -d ' ') drills on node $($NODE22 -v) and $($NODE26 -v) against $($NODE24 -v)" >> "$OUT/node_versions_diff.txt"
# packages, runtimes, start-up, memory (slow; timings depend on load)
sh l1_npm.sh 2>&1 | clean > "$OUT/l1_npm.txt"
sh l2_pnpm.sh 2>&1 | clean > "$OUT/l2_pnpm.txt"
sh m1_runtimes.sh 2>&1 | clean > "$OUT/m1_runtimes.txt"
sh m2_startup.sh 2>&1 | clean > "$OUT/m2_startup.txt"
sh m3_memory.sh 2>&1 | clean > "$OUT/m3_memory.txt"
{ for N in $NODE22 $NODE24 $NODE26; do echo "node $($N -v) (V8 $($N -p process.versions.v8))"; done; bun --version | sed 's/^/bun /'
  deno --version | head -1; echo "npm $(npm -v)"; echo "pnpm $(pnpm -v)"; hyperfine --version; $PY --version
  sw_vers -productVersion | sed 's/^/macOS /'; sysctl -n machdep.cpu.brand_string; uptime | sed 's/.*load/load/'; date -u +%Y-%m-%dT%H:%MZ; } > "$HERE/versions.txt" 2>&1
echo done
