#!/bin/sh
# Reproduce the typing outputs this page shows (copied from the Python essentials page's src/pa/run_all.sh, trimmed to t1_types).
# Toolchains live in a scratch folder (see versions.txt); point PL at your own copy.
set -u
PL=${PL:-${TMPDIR:-/tmp}/pl}
V=$PL/pa/venv/bin                       # CPython 3.14.8 venv with mypy 2.4.0 and ty 0.0.84
PY=$V/python
cd "$(dirname "$0")"; HERE=$(pwd); CODE=$HERE/code; OUT=$HERE/outputs; mkdir -p "$OUT"
clean() { sed -e "s|$CODE/||g" -e "s|$PL/py/[^/]*/lib/python3\.1[0-9]t*/|<stdlib>/|g" -e "s|$PL|<pl>|g"; }
cd "$CODE"
$PY -u t1_types.py 2>&1 | clean > "$OUT/t1_types.txt"
( cd "$CODE" && $V/mypy --python-version 3.14 t1_types.py ) 2>&1 | clean > "$OUT/t1_mypy.txt"
( cd "$CODE" && $V/ty check --output-format concise --python $PY t1_types.py ) 2>&1 | clean > "$OUT/t1_ty.txt"
echo done
