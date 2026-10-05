#!/bin/bash
# Hardware counters without Instruments: macOS's /usr/bin/time -l prints instructions retired and cycles.
# (Not run here: xctrace, the command-line Instruments, hung even for `xctrace version` in this session,
#  and `sample` could not attach; see README.)
. "$(dirname "$0")/env.sh"
$CXX -O2 -o "$B/hot" hot.cpp
for mode in rows cols; do
  /usr/bin/time -l "$B/hot" $mode 2> "$B/time_$mode.txt"
  awk -v m=$mode '/real/{t=$1} /instructions retired/{i=$1} /cycles elapsed/{c=$1} /page reclaims/{pr=$1}
    END{printf "%s: %.2f s, %.0f M instructions, %.0f M cycles, %.2f instructions per cycle, %d page reclaims\n", m, t, i/1e6, c/1e6, i/c, pr}' "$B/time_$mode.txt"
done
