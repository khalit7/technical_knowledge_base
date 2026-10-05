#!/bin/bash
# Build race.cpp with ThreadSanitizer (LLVM clang 23.1.2) and run it; print the report's first lines.
. "$(dirname "$0")/env.sh"
$CXXSAN -O1 -g -fsanitize=thread race.cpp -o "$B/race_tsan"
perl -e 'alarm 30; exec @ARGV' "$B/race_tsan" 2>&1 | sed -e "s#$B/##g" -e 's/(race_tsan:arm64+0x[0-9a-f]*)//' -e 's/ (0x[0-9a-f]*)//' | head -24
