#!/bin/sh
# Reproduce every output this page shows from code/ (threads and the GIL, asyncio). Copied from the language page's
# src/pa/run_all.sh (2026-10-26) and trimmed to this page. Toolchains live in a scratch folder (see versions.txt);
# point PL at your own copy. Writes outputs/*.txt and outputs/*.json; paths to this folder are shortened to the file name.
set -u
PL=${PL:-${TMPDIR:-/tmp}/pl}
V=$PL/pa/venv/bin                       # CPython 3.14.8 venv
PY=$V/python
PYT=$PL/py/cpython-3.14.8+freethreaded-macos-aarch64-none/bin/python3.14t
cd "$(dirname "$0")"; HERE=$(pwd); CODE=$HERE/code; OUT=$HERE/outputs; mkdir -p "$OUT"
clean() { sed -e "s|$CODE/||g" -e "s|$PL/py/[^/]*/lib/python3\.1[0-9]t*/|<stdlib>/|g" -e "s|$PL|<pl>|g"; }
cd "$CODE"
for f in a1_coro a3_fanout a4_cancel a5_stream a6_debug k1_gil; do
  echo "run $f"; $PY -u $f.py 2>&1 | clean > "$OUT/$f.txt"
done
$PYT -u k1_gil.py 2>&1 | clean > "$OUT/k1_gil_314t.txt"
$PY a2_trace.py "$OUT/a2_trace.json" | clean > "$OUT/a2_trace.txt"
$PY q_drills.py > "$OUT/q_drills.json"
echo done
