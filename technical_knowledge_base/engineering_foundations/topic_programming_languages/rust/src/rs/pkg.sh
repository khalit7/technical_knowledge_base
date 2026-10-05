#!/bin/zsh
# Packaging measurements: build both binaries from scratch under each profile, record wall time,
# file size and linked libraries. Writes JSON to stdout. Called by run_all.sh pkg.
set -u
HERE=${0:A:h}; . $HERE/code/env.sh
cd $HERE/code/tok
print -n '{"load_before":'"$(sysctl -n vm.loadavg | awk '{print $2}')"',"profiles":['
first=1
for prof in dev release release-strip release-lto release-small; do
  TD=$P/rs/tgt_pkg/$prof; rm -rf $TD
  s=$(perl -MTime::HiRes=time -e 'print time')
  CARGO_TARGET_DIR=$TD cargo build --profile $prof --bins >&2 2>&1
  e=$(perl -MTime::HiRes=time -e 'print time')
  dir=$prof; [[ $prof == dev ]] && dir=debug
  a=$(stat -f %z $TD/$dir/tokcount); b=$(stat -f %z $TD/$dir/tokserve)
  [[ $first == 1 ]] || print -n ','; first=0
  print -n "{\"profile\":\"$prof\",\"build_s\":$(printf %.1f $((e-s))),\"tokcount_bytes\":$a,\"tokserve_bytes\":$b,\"load\":$(sysctl -n vm.loadavg | awk '{print $2}')}"
done
print -n '],"otool_tokserve":'
otool -L $P/rs/tgt_pkg/release/release/tokserve | tail -n +2 | sed 's/^[[:space:]]*//' | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read().splitlines()))'
print '}'
