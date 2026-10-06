#!/bin/sh
# How each recording was made (Claude Code 2.1.290, 6 Oct 2026). Never run inside the repository.
# usage: SCRATCH=/some/scratch/dir TASK_REPO=/path/to/textstats sh run.sh LABEL MODEL SETUP(none|setups/x.sh) PROMPTFILE [extra claude flags]
# Copies the task repository to $SCRATCH/runs/LABEL/work, runs the setup script inside it, then claude -p with the
# fixed flags below; raw stream to $SCRATCH/raw/LABEL.jsonl and the arrival time of each line to LABEL.times.
# Then: python3 redact.py $SCRATCH/raw $SCRATCH/runs recordings && python3 extract.py && sh build.sh && python3 check_page.py
# Extra flags per run are listed in runs.json ("flags"). KEEP_SESSION=1 keeps the session (resume1/resume2);
# STDIN_FILE=prompts/stream_in.jsonl feeds stream-json input (run "stream").
set -e
SRC=$(cd "$(dirname "$0")" && pwd)
L=$1; M=$2; SETUP=$3; PF=$SRC/prompts/$4; shift 4
D=$SCRATCH/runs/$L; mkdir -p "$SCRATCH/raw" "$D"; rm -rf "$D/work"; cp -R "$TASK_REPO" "$D/work"
[ "$SETUP" != none ] && (cd "$D/work" && sh "$SRC/$SETUP")
cd "$D/work"
NSP="--no-session-persistence"; [ -n "$KEEP_SESSION" ] && NSP=""
if [ -n "$STDIN_FILE" ]; then IN=$SRC/$STDIN_FILE; else IN=/dev/null; set -- "$(cat "$PF")" "$@"; fi
# with STDIN_FILE the prompt comes from stdin, otherwise it is the first argument after -p
claude -p "$@" --output-format stream-json --verbose --include-partial-messages $NSP --setting-sources project --strict-mcp-config \
  --model "$M" --append-system-prompt "Never use the em-dash character." < "$IN" 2> "$D/stderr.txt" \
  | python3 -c 'import sys,time
t0=time.time();f=open(sys.argv[1],"w");g=open(sys.argv[2],"w")
for l in sys.stdin: f.write(l);f.flush();g.write("%.3f\n"%(time.time()-t0));g.flush()' "$SCRATCH/raw/$L.jsonl" "$SCRATCH/raw/$L.times"
python3 tests/test_core.py > "$D/post_tests.txt" 2>&1 || true
diff -ru "$TASK_REPO" "$D/work" -x __pycache__ -x .claude > "$D/diff.txt" || true
