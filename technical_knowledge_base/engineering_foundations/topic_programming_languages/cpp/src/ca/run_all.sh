#!/bin/sh
# Reproduces every output shown on "C++: the essentials" (the hero, the build, undefined behaviour, the standards).
# Usage: sh src/ca/run_all.sh  (about a minute; needs the toolchains listed in versions.txt)
#        ONLY=hero sh src/ca/run_all.sh  runs only the step files whose name contains "hero"
. "$(dirname "$0")/lib.sh"
fresh
for s in "$HERE"/steps/*${ONLY}*.sh; do . "$s"; done
