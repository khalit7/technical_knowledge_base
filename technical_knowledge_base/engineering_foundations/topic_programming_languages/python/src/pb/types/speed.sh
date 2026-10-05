#!/bin/bash
# Type-checker speed on a real typed codebase: the rich 15.0.0 package source (Python 3.14 venv with its dependencies).
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/../env.sh
V=$WORK/richvenv; [ -x $V/bin/python ] || { uv venv -q --python $PY314 $V && VIRTUAL_ENV=$V uv pip install -q rich==15.0.0; }
SRC=$V/lib/python3.14/site-packages/rich
FILES=$(find $SRC -name '*.py' | wc -l | tr -d ' '); LINES=$(cat $(find $SRC -name '*.py') | wc -l | tr -d ' ')
cd $WORK; rm -rf mypycache
uvx ty@0.0.84 --version >/dev/null; uvx mypy@2.4.0 --version >/dev/null; uvx --from pyright@1.1.414 pyright --version >/dev/null
TY="uvx ty@0.0.84 check --python $V --no-progress $SRC"
MY="uvx mypy@2.4.0 --python-executable $V/bin/python --no-incremental $SRC"
MYW="uvx mypy@2.4.0 --python-executable $V/bin/python --cache-dir $WORK/mypycache $SRC"
PR="uvx --from pyright@1.1.414 pyright --pythonpath $V/bin/python $SRC"
for c in "$TY" "$MY" "$PR"; do bash -c "$c" > /dev/null 2>&1; done   # warm uvx and the OS file cache
bash -c "$MYW" > /dev/null 2>&1   # fill mypy's cache once
hyperfine -i --warmup 1 --runs 5 --export-json $WORK/tc_hf.json -n ty "$TY" -n "mypy (no cache)" "$MY" -n "mypy (warm cache)" "$MYW" -n pyright "$PR" > $WORK/tc_hf.txt 2>&1
bash -c "$TY" 2>&1 | tail -1 > $WORK/tc_sum_ty.txt; bash -c "$MY" 2>&1 | tail -1 > $WORK/tc_sum_mypy.txt; bash -c "$PR" 2>&1 | tail -1 > $WORK/tc_sum_pyright.txt
python3 - "$WORK" "$FILES" "$LINES" > $HERE/../out/typespeed.json <<'PY'
import json, sys, os, subprocess
W, files, lines = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
r = json.load(open(f"{W}/tc_hf.json"))["results"]
out = {"codebase": "rich 15.0.0 (installed package source)", "files": files, "lines": lines, "loadavg": os.getloadavg(),
       "summary": {k: open(f"{W}/tc_sum_{k}.txt").read().strip() for k in ("ty", "mypy", "pyright")},
       "runs": [{"name": x["command"], "median_s": round(x["median"], 3), "min_s": round(x["min"], 3), "max_s": round(x["max"], 3)} for x in r]}
print(json.dumps(out))
PY
