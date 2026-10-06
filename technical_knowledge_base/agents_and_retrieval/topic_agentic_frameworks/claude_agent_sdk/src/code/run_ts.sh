#!/bin/sh
F=$(cd "$(dirname "$0")" && pwd); A=$(dirname "$F"); L=s8_ts
W=$F/work/$L; rm -rf "$W"; cp -R "$A/task_repo" "$W"; export SDK_LOG=$F/raw/$L.sdk.jsonl; rm -f "$SDK_LOG"
cd "$W"; S=$(date +%s); node "$F/ts/s8_ts.mjs" "$1" 2> "$F/raw/$L.stderr" | tail -3 > "$F/raw/$L.stdout"; RC=$?; E=$(date +%s)
T=$(python3 tests/test_core.py 2>&1 | tail -1)
U=$(diff -q tests/test_core.py "$A/task_repo/tests/test_core.py" >/dev/null && echo true || echo false)
DIFF=$(diff -ru "$A/task_repo" "$W" -x __pycache__ | sed "s#$A/task_repo#a#; s#$W#b#")
python3 - "$F/raw/$L.meta.json" "$L" "$1" "$RC" "$((E-S))" "$T" "$U" "$DIFF" <<'P'
import json,sys,datetime; o,l,a,rc,w,t,u,d=sys.argv[1:9]
json.dump({"label":l,"args":"s8_ts.mjs "+a,"rc":int(rc),"wall_s":int(w),"tests_after":t,"tests_unchanged":u=="true","diff":d,"date":str(datetime.date.today())},open(o,"w"),indent=1)
P
cat "$F/raw/$L.stdout"; echo "tests: $T unchanged: $U wall: $((E-S))s"
