#!/bin/sh
# Reproduces every output shown on "C++: ownership, moves and object lifetimes" (copied from Part 1 of the C++ page, trimmed).
# Usage: PL=<a scratch folder> sh src/ca/run_all.sh  (about 30 seconds; needs the toolchain listed in versions.txt)
. "$(dirname "$0")/lib.sh"
fresh
for s in "$HERE"/steps/*.sh; do . "$s"; done
