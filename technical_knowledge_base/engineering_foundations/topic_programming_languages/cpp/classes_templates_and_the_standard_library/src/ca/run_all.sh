#!/bin/sh
# Reproduces every output shown on "C++: classes, templates and the standard library" (programs copied from Part 1 of the C++ page, plus dispatch.cpp and exc_cost.cpp).
# Usage: PL=<a scratch folder> sh src/ca/run_all.sh  (about a minute; needs the toolchains listed in versions.txt)
. "$(dirname "$0")/lib.sh"
fresh
for s in "$HERE"/steps/*.sh; do . "$s"; done
