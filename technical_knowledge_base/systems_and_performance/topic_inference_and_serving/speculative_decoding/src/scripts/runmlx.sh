#!/bin/sh
# usage: INF=<scratch inf dir> OUT=<raw runs dir> runmlx.sh <name> <script.py> args...
# Runs one MLX job under the shared bench lock (refreshed every 10 min), recording the load average before and after.
name=$1; shift
$INF/lock.sh acquire bench sd 7200 || exit 1
( while true; do sleep 600; $INF/lock.sh touch bench sd >/dev/null; done ) & tp=$!
echo "load_before $(sysctl -n vm.loadavg)" > $OUT/$name.log
$INF/mlxenv/bin/python "$@" >> $OUT/$name.log 2>&1
echo "load_after $(sysctl -n vm.loadavg)" >> $OUT/$name.log
kill $tp; $INF/lock.sh release bench sd; sleep 12
