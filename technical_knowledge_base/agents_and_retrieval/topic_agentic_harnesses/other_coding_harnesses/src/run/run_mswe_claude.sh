#!/bin/sh
# run_mswe_claude.sh NAME BOUNDARY(none|mswea) : mini-swe-agent textbased + Claude Haiku via claude_shim.py on 8191
H=$(cd "$(dirname "$0")" && pwd); N=$1; B=$2
rm -f $H/runs/shimlogs/$N.jsonl
python3 $H/claude_shim.py 8191 haiku $H/runs/shimlogs/$N.jsonl $B > $H/runs/shimlogs/$N.log 2>&1 & SP=$!
sleep 2
STEP_LIMIT=${STEP_LIMIT:-20} $H/env/mswe/bin/python $H/run_mswe.py $N mini_textbased http://127.0.0.1:8191/v1 haiku
kill $SP
cp $H/runs/shimlogs/$N.jsonl $H/runs/$N/shim.jsonl
