#!/bin/sh
# Reproduce every output shown on "JavaScript: values, objects, functions and modules for Python programmers". Copied from the
# language page's src/ja/run_all.sh (2026-10-26) and trimmed to this page's examples (b1 to h2, the f_mod modules, n1 to n3, the
# 22 drills). No rosetta data is used, so nothing walks up to the topic root. Toolchains live outside the repo (see versions.txt);
# point PL at your own copy. Recorded runtime: Node 24.21.0 (LTS); Node 22 and 26 are only used to list differences.
set -u
PL=${PL:-${TMPDIR:-/tmp}/pl}
NODE24=$PL/ja/node-v24.21.0-darwin-arm64/bin/node; NODE26=$PL/ja/node-v26.10.0-darwin-arm64/bin/node
NODE22=${NODE22:-$HOME/.nvm/versions/node/v22.22.2/bin/node}
export PATH=$PL/ja/node-v24.21.0-darwin-arm64/bin:$PATH NO_COLOR=1
cd "$(dirname "$0")"; HERE=$(pwd); CODE=$HERE/code; OUT=$HERE/outputs; WORK=$PL/ja/work; mkdir -p "$OUT" "$WORK"
clean() { sed -e "s|file://$CODE/||g" -e "s|$CODE/||g" -e "s|$WORK|<work>|g" -e "s|$PL|<pl>|g" \
              -e '/^ *at .*(node:/d' -e '/^ *at async node:/d' -e '/^ *at node:/d'; }
cd "$CODE"
SIMPLE="b1_numbers b2_bigint b3_strings b4_nullish b5_truthy b6_equality b7_scope c1_objects c2_arrays c3_destructure c4_copy
 d1_functions d2_closures d3_this e1_classes e1b_private e2_prototype e3_dunders e4_proxy g1_errors g2_uncaught h1_iter h2_generators n2_shapes_bench"
for f in $SIMPLE; do echo "run $f"; { $NODE24 $f.mjs 2>&1; c=$?; [ $c -ne 0 ] && echo "[exit code $c]"; } | clean > "$OUT/$f.txt"; done
$NODE24 --allow-natives-syntax n1_shapes.mjs 2>&1 | clean > "$OUT/n1_shapes.txt"
$NODE24 --trace-opt --trace-deopt n3_deopt.mjs | grep -E "JSFunction add|^now|^[0-9]" | sed -E -e 's/ ?0x[0-9a-f]+ ?/ /g' -e 's/ \(sfi = [^)]*\)//g' \
  -e 's/, ConcurrencyMode::k[A-Za-z]+//' -e 's/, mode: ConcurrencyMode::k[A-Za-z]+//' -e 's/ - took .*\]/]/' -e 's/(reason: [^)]*\)): begin\..*/\1]/' -e 's/<JSFunction add>/add/' -e 's/  +/ /g' > "$OUT/n3_deopt.txt"
sh f_mod.sh 2>&1 | clean > "$OUT/f_mod.txt"
for f in q/*.mjs; do b=$(basename $f .mjs); $NODE24 $f > "$OUT/q_$b.txt" 2>&1; done
# the same deterministic examples on Node 22 and Node 26: any difference is listed
# (node_versions_diff.txt as recorded on 2026-10-05 covers the language page's wider set: 38 examples, 6 loop programs, 22 drills)
: > "$OUT/node_versions_diff.here.txt"
for f in $SIMPLE q/*.mjs; do case $f in n2*|g2*|e1b*) continue;; esac
  g=${f%.mjs}; [ -f "$g.mjs" ] && g=$g.mjs || g=$f
  for N in $NODE22 $NODE26; do $NODE24 $g 2>&1 | clean > "$WORK/a.txt"; $N $g 2>&1 | clean > "$WORK/b.txt"
    cmp -s "$WORK/a.txt" "$WORK/b.txt" || echo "$g differs on $($N -v)" >> "$OUT/node_versions_diff.here.txt"; done; done
echo done
