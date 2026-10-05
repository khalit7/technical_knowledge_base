#!/bin/bash
# Reproduce every output shown in Part 2 (TypeScript). Writes outputs/*.txt, then the page data file.
cd "$(dirname "$0")"
for f in code/*.ts drill/*.ts; do [ -e "$f" ] || continue; case "$f" in *__*) continue;; esac; ./run_one.sh "$f"; done
[ -x ./extra.sh ] && ./extra.sh
./zodlab/run.sh
node gen_narrow.mjs > /dev/null
node gen_data.mjs
