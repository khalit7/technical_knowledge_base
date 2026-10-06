#!/bin/sh
# run.sh LABEL SCRIPT ARGS... : fresh copy of the task repo, run one recording, check tests afterwards.
F=$(cd "$(dirname "$0")" && pwd); A=$(dirname "$F"); L=$1; shift
W=$F/work/$L; rm -rf "$W"; cp -R "$A/task_repo" "$W"
export ROOT_CODE=${ROOT_CODE:?set ROOT_CODE to topic_agentic_frameworks/src/same/code}
export PYTHONPATH=$F PYTHONDONTWRITEBYTECODE=1 SDK_LOG=$F/raw/$L.sdk.jsonl WIRE_LOG=$F/raw/$L.wire.jsonl WIRE_PY=$F/wire.py
export REAL_CLI=$F/env/lib/python3.12/site-packages/claude_agent_sdk/_bundled/claude
rm -f "$SDK_LOG" "$WIRE_LOG"
cd "$W"; S=$(date +%s)
SCR=$1; shift; "$F/env/bin/python" "$F/$SCR" "$@" 2> "$F/raw/$L.stderr" | tail -5 > "$F/raw/$L.stdout"; RC=$?
E=$(date +%s)
T=$(python3 tests/test_core.py 2>&1 | tail -1)
U=$(diff -q tests/test_core.py "$A/task_repo/tests/test_core.py" >/dev/null && echo true || echo false)
DIFF=$(diff -ru "$A/task_repo" "$W" -x __pycache__ -x .claude | sed "s#$A/task_repo#a#; s#$W#b#")
python3 - "$F/raw/$L.meta.json" "$L" "$*" "$RC" "$((E-S))" "$T" "$U" "$DIFF" <<'P'
import json,sys,datetime; o,l,a,rc,w,t,u,d=sys.argv[1:9]
json.dump({"label":l,"args":a,"rc":int(rc),"wall_s":int(w),"tests_after":t,"tests_unchanged":u=="true","diff":d,"date":str(datetime.date.today())},open(o,"w"),indent=1)
P
cat "$F/raw/$L.stdout"; echo "tests: $T unchanged: $U wall: $((E-S))s"
