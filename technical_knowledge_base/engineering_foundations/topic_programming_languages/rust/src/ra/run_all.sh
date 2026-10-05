#!/bin/sh
# Reproduces every output shown in Part 1 (For Python programmers) of the Rust page.
# Usage: sh src/ra/run_all.sh [step-prefix]   (needs the toolchains listed in versions.txt)
. "$(dirname "$0")/lib.sh"
if [ -z "$1" ]; then fresh; else mkdir -p "$W"; cp -R "$HERE/code/." "$W/"; cp "$HERE/../../../src/rosetta/data/chat.jsonl" "$W/"; fi
for s in "$HERE"/steps/${1:-}*.sh; do . "$s"; done
