#!/bin/sh
# Reproduces every output shown in Part 1 (The language) of the C++ page.
# Usage: sh src/ca/run_all.sh  (about a minute; needs the toolchains listed in versions.txt)
. "$(dirname "$0")/lib.sh"
fresh
for s in "$HERE"/steps/*.sh; do . "$s"; done
