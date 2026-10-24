#!/bin/sh
# Start the lab: keys, four servers and three recording taps. PIDs go to $KEYDIR/pids (stop.sh kills only those).
# Usage: KEYDIR=<scratch dir> PY=<python with pyjwt, cryptography, mcp 2.3.0> sh start.sh WIRELOG
cd "$(dirname "$0")"
: "${KEYDIR:?set KEYDIR to a scratch directory}"; : "${PY:?set PY}"; export KEYDIR
mkdir -p "$KEYDIR"; LOG=${1:-$KEYDIR/wire.jsonl}; : > "$LOG"; : > "$KEYDIR/cimd_fetches.log"
$PY keys.py
: > "$KEYDIR/pids"
for s in as_server.py upstream.py cimd_host.py mcp_server.py; do $PY $s > "$KEYDIR/${s%.py}.log" 2>&1 & echo $! >> "$KEYDIR/pids"; done
$PY tap.py 30611 30601 as "$LOG" & echo $! >> "$KEYDIR/pids"
$PY tap.py 30612 30602 mcp "$LOG" & echo $! >> "$KEYDIR/pids"
$PY tap.py 30614 30604 upstream "$LOG" & echo $! >> "$KEYDIR/pids"
sleep 3
