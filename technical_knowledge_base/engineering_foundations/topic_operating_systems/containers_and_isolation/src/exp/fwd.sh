#!/bin/bash
# A launcher shell that forwards SIGTERM to the job and waits for it (the fix when you need a shell as PID 1).
python3 /exp/stopjob.py & child=$!
trap 'kill -TERM "$child"' TERM
wait "$child"; wait "$child"; exit $?
