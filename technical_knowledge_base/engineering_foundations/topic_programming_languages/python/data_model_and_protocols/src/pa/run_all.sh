#!/bin/sh
# Reproduce every output shown on "Python: the data model and protocols" (trimmed copy of the language page's src/pa/run_all.sh, 2026-10-26). Toolchains live in the session scratchpad (see versions.txt);
# point PL at your own copy. Writes outputs/*.txt and outputs/*.json; paths to this folder are shortened to the file name.
set -u
PL=${PL:-${TMPDIR:-/tmp}/pl}
V=$PL/pa/venv/bin                       # CPython 3.14.8 venv (uv-managed)
PY=$V/python
PY313=$PL/py/cpython-3.13.16-macos-aarch64-none/bin/python3.13
cd "$(dirname "$0")"; HERE=$(pwd); CODE=$HERE/code; OUT=$HERE/outputs; mkdir -p "$OUT"
clean() { sed -e "s|$CODE/||g" -e "s|$PL/py/[^/]*/lib/python3\.1[0-9]t*/|<stdlib>/|g" -e "s|$PL/pa/scal/||g" -e "s|$PL|<pl>|g"; }
cd "$CODE"
for f in n3_copy n4_args n5_tuple n6_iter_mutate d1_vec g1_protocol g2_order g3_memory g4_yield_from g5_stream g6_itertools \
         f1_closure f2_decorator f3_retry f4_cache f5_params c1_mro c2_dataclass c3_sizes c4_descriptor c5_classattr c6_method_call \
         e1_chain e2_group e3_hierarchy e4_finally x1_with; do
  echo "run $f"; $PY -u $f.py 2>&1 | clean > "$OUT/$f.txt"
done
$PY313 -u e4_finally.py 2>&1 | clean > "$OUT/e4_finally_313.txt"
$PY313 -u n5_tuple.py 2>&1 | clean > "$OUT/n5_tuple_313.txt"
$PY n7_graph.py > "$OUT/n7_graph.json"
$PY d2_dispatch.py > "$OUT/d2_dispatch.json"
$PY q_drills.py > "$OUT/q_drills.json"
{ $PY --version; $PY313 --version; sw_vers -productVersion | sed 's/^/macOS /'; sysctl -n machdep.cpu.brand_string; uptime | sed 's/.*load/load/'; date -u +%Y-%m-%dT%H:%MZ; } > "$HERE/versions.txt" 2>&1
echo done
