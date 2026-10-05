#!/bin/sh
# Reproduce every output shown in Part 1 (In depth). Toolchains live in the session scratchpad (see versions.txt);
# point PL at your own copy. Writes outputs/*.txt and outputs/*.json; paths to this folder are shortened to the file name.
set -u
PL=${PL:-/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl}
V=$PL/pa/venv/bin                       # CPython 3.14.8 venv with numpy, mypy, ty, py-spy, scalene
PY=$V/python
PY313=$PL/py/cpython-3.13.16-macos-aarch64-none/bin/python3.13
PYT=$PL/py/cpython-3.14.8+freethreaded-macos-aarch64-none/bin/python3.14t
cd "$(dirname "$0")"; HERE=$(pwd); CODE=$HERE/code; OUT=$HERE/outputs; mkdir -p "$OUT"
clean() { sed -e "s|$CODE/||g" -e "s|$PL/py/[^/]*/lib/python3\.1[0-9]t*/|<stdlib>/|g" -e "s|$PL/pa/scal/||g" -e "s|$PL|<pl>|g"; }
cd "$CODE"
for f in n1_alias n2_identity n3_copy n4_args n5_tuple n6_iter_mutate d1_vec g1_protocol g2_order g3_memory \
         g4_yield_from g5_stream g6_itertools f1_closure f2_decorator f3_retry f4_cache f5_params c1_mro c2_dataclass \
         c3_sizes c4_descriptor c5_classattr c6_method_call e1_chain e2_group e3_hierarchy e4_finally x1_with a1_coro a3_fanout \
         a4_cancel a5_stream a6_debug i1_dis i2_refcount i3_sizes p1_profile p2_numpy t1_types k1_gil; do
  echo "run $f"; $PY -u $f.py 2>&1 | clean > "$OUT/$f.txt"
done
$PY313 -u e4_finally.py 2>&1 | clean > "$OUT/e4_finally_313.txt"
$PY313 -u n5_tuple.py 2>&1 | clean > "$OUT/n5_tuple_313.txt"
$PYT -u k1_gil.py 2>&1 | clean > "$OUT/k1_gil_314t.txt"
$PY n7_graph.py > "$OUT/n7_graph.json"
$PY d2_dispatch.py > "$OUT/d2_dispatch.json"
$PY a2_trace.py "$OUT/a2_trace.json" | clean > "$OUT/a2_trace.txt"
$PY q_drills.py > "$OUT/q_drills.json"
( cd "$CODE" && $V/mypy --python-version 3.14 t1_types.py ) 2>&1 | clean > "$OUT/t1_mypy.txt"
( cd "$CODE" && $V/ty check --output-format concise --python $PY t1_types.py ) 2>&1 | clean > "$OUT/t1_ty.txt"
$V/py-spy record -o /dev/null --format raw -- $PY p1_slow.py 2>&1 | clean > "$OUT/p1_pyspy.txt"
mkdir -p $PL/pa/scal && cp p1_slow.py $PL/pa/scal/ && ( cd $PL/pa/scal && $V/scalene run --cpu-only -o prof.json p1_slow.py >/dev/null 2>&1 \
  && COLUMNS=100 $V/scalene view --cli -r prof.json 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -A8 "Function summaries" ) | clean > "$OUT/p1_scalene.txt"
{ $PY --version; $PY313 --version; $PYT -VV | head -1; $PY -c "import numpy; print('numpy', numpy.__version__)"; $V/mypy --version; $V/ty --version
  $V/py-spy --version; $V/scalene --version; sw_vers -productVersion | sed 's/^/macOS /'; sysctl -n machdep.cpu.brand_string; uptime | sed 's/.*load/load/'; date -u +%Y-%m-%dT%H:%MZ; } > "$HERE/versions.txt" 2>&1
echo done
