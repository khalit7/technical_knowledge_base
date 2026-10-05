#!/bin/sh
# Stop only the processes start.sh started.
: "${KEYDIR:?}"; [ -f "$KEYDIR/pids" ] && kill $(cat "$KEYDIR/pids") 2>/dev/null; rm -f "$KEYDIR/pids"
