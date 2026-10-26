#!/bin/sh
# Reproduce every output shown on "JavaScript and TypeScript: the essentials". Toolchains live in a scratch folder
# (see versions.txt); point PL at your own copy. Writes outputs/*.txt. Recorded runtime: Node 24.21.0 (LTS).
# The examples of the four child pages are rerun by each child's own src/ja (or tb, tl) run script.
set -u
PL=${PL:-${TMPDIR:-/tmp}/pl}
NODE24=$PL/ja/node-v24.21.0-darwin-arm64/bin/node; NODE26=$PL/ja/node-v26.10.0-darwin-arm64/bin/node
NODE22=${NODE22:-$HOME/.nvm/versions/node/v22.22.2/bin/node}
export PATH=$PL/ja/node-v24.21.0-darwin-arm64/bin:$PL/ja/pnpm/bin:$PL/ja/deno:$PL/bin:$PATH
export npm_config_cache=$PL/ja/npmcache npm_config_userconfig=$PL/ja/empty.npmrc XDG_DATA_HOME=$PL/ja/xdg XDG_CACHE_HOME=$PL/ja/xdgcache
export BUN_INSTALL_CACHE_DIR=$PL/ja/buncache DENO_DIR=$PL/ja/denodir NO_COLOR=1
cd "$(dirname "$0")"; HERE=$(pwd); CODE=$HERE/code; OUT=$HERE/outputs; WORK=$PL/ja/work; mkdir -p "$OUT" "$WORK"
# the shared running example lives in the topic root's src/rosetta/data: walk up to topic_programming_languages
R=$HERE; while [ "$(basename "$R")" != topic_programming_languages ] && [ "$R" != / ]; do R=$(dirname "$R"); done
export CODE WORK NODE22 NODE24 NODE26 PY=$PL/pa/venv/bin/python ROSETTA=$R/src/rosetta/data
ROS=$(cd "$ROSETTA" && pwd)
clean() { sed -e "s|file://$CODE/||g" -e "s|$CODE/||g" -e "s|$ROS/|<rosetta>/|g" -e "s|$WORK|<work>|g" -e "s|$PL|<pl>|g" \
              -e '/^ *at .*(node:/d' -e '/^ *at async node:/d' -e '/^ *at node:/d'; }
cd "$CODE"
SIMPLE="a1_hello x2_pollution k1_fs k5_fetch k6_workers"
for f in $SIMPLE; do echo "run $f"; { $NODE24 $f.mjs 2>&1; c=$?; [ $c -ne 0 ] && echo "[exit code $c]"; } | clean > "$OUT/$f.txt"; done
{ $NODE24 k2_process.mjs chat.jsonl -k 3 --verbose 2>&1; echo "[exit code $?]"; } | clean > "$OUT/k2_process.txt"
{ $NODE24 k3_count_tokens.mjs "$ROS/chat.jsonl"; $NODE24 k3_count_tokens.mjs nope.jsonl 2>&1; echo "[exit code $?]"; } | clean > "$OUT/k3_count_tokens.txt"
{ echo '$ node x1_temporal.mjs   # Node 24.21.0'; $NODE24 x1_temporal.mjs; echo '$ node x1_temporal.mjs   # Node 26.10.0'; $NODE26 x1_temporal.mjs; } > "$OUT/x1_temporal.txt" 2>&1
# the deterministic examples on Node 22 and Node 26: any difference is listed
: > "$OUT/node_versions_diff.txt"
for g in x2_pollution.mjs k1_fs.mjs k5_fetch.mjs; do
  for N in $NODE22 $NODE26; do $NODE24 $g 2>&1 | clean > "$WORK/a.txt"; $N $g 2>&1 | clean > "$WORK/b.txt"
    cmp -s "$WORK/a.txt" "$WORK/b.txt" || echo "$g differs on $($N -v)" >> "$OUT/node_versions_diff.txt"; done; done
echo "checked 3 examples on node $($NODE22 -v) and $($NODE26 -v) against $($NODE24 -v)" >> "$OUT/node_versions_diff.txt"
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
