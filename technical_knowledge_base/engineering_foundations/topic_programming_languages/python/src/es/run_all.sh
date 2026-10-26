#!/bin/sh
# Reproduce every output shown on "Python: the essentials". PY is any CPython 3.14.8 (the recorded runs used it on an
# Apple M1 Pro: n1 and n2 on 2026-10-05 for the language page, h1_hero and the drills rerun on 2026-10-26).
set -u
PY=${PY:-python3.14}
cd "$(dirname "$0")"; HERE=$(pwd); OUT=$HERE/outputs; mkdir -p "$OUT"
cd code
for f in n1_alias n2_identity h1_hero; do echo "run $f"; $PY -u $f.py > "$OUT/$f.txt" 2>&1; done
$PY q_drills.py > "$OUT/q_drills.json"
echo done
