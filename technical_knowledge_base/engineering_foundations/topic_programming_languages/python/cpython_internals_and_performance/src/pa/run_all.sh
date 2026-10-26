#!/bin/sh
# Reproduce every Part-1 output this page shows (bytecode, reference counts, object sizes, profiling, NumPy, two drills).
# Copied from the language page's src/pa/run_all.sh (2026-10-26) and trimmed to this page. Toolchains live in a scratch
# folder (see versions.txt); point PL at your own copy. Writes outputs/*.txt and outputs/*.json; paths are shortened.
set -u
PL=${PL:-${TMPDIR:-/tmp}/pl}
V=$PL/pa/venv/bin                       # CPython 3.14.8 venv with numpy, py-spy, scalene
PY=$V/python
cd "$(dirname "$0")"; HERE=$(pwd); CODE=$HERE/code; OUT=$HERE/outputs; mkdir -p "$OUT"
clean() { sed -e "s|$CODE/||g" -e "s|$PL/py/[^/]*/lib/python3\.1[0-9]t*/|<stdlib>/|g" -e "s|$PL/pa/scal/||g" -e "s|$PL|<pl>|g"; }
cd "$CODE"
for f in i1_dis i2_refcount i3_sizes p1_profile p2_numpy; do
  echo "run $f"; $PY -u $f.py 2>&1 | clean > "$OUT/$f.txt"
done
$PY q_drills.py > "$OUT/q_drills.json"
$V/py-spy record -o /dev/null --format raw -- $PY p1_slow.py 2>&1 | clean > "$OUT/p1_pyspy.txt"
mkdir -p $PL/pa/scal && cp p1_slow.py $PL/pa/scal/ && ( cd $PL/pa/scal && $V/scalene run --cpu-only -o prof.json p1_slow.py >/dev/null 2>&1 \
  && COLUMNS=100 $V/scalene view --cli -r prof.json 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -A8 "Function summaries" ) | clean > "$OUT/p1_scalene.txt"
{ $PY --version; $PY -c "import numpy; print('numpy', numpy.__version__)"
  $V/py-spy --version; $V/scalene --version; sw_vers -productVersion | sed 's/^/macOS /'; sysctl -n machdep.cpu.brand_string; uptime | sed 's/.*load/load/'; date -u +%Y-%m-%dT%H:%MZ; } > "$HERE/versions.txt" 2>&1
echo done
