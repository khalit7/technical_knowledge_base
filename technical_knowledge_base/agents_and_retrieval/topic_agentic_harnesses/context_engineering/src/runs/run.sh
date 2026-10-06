#!/bin/sh
# run.sh NAME MSGS MODEL [extra args]; workdir w_NAME
cd "$(dirname "$0")"
N=$1; M=$2; MOD=$3; shift 3
exec python3 drive.py "$PWD/w_$N" "raw/$N.jsonl" "$M" --model "$MOD" --permission-mode acceptEdits --tools "Read,Edit,Write,Bash,Grep,Glob" --allowedTools "Bash(python3:*)" "Bash(python:*)" "Bash(ls:*)" "Bash(cat:*)" "$@" > "raw/$N.log" 2>&1
