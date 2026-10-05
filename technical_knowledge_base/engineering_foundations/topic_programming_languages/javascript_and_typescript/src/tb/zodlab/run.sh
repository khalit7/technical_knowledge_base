#!/bin/bash
# Type-check lab.ts with tsc 7.0.2, run it with node, save outputs/zodlab.json
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PL=${PL:-${TMPDIR:-/tmp}/pl}
W=$PL/tb/work/zodlab; rm -rf $W; mkdir -p $W; cd $W
ln -s $PL/tb/node_modules node_modules; echo '{"type":"module"}' > package.json; cp "$HERE/tsconfig.base.json" tsconfig.json; cp "$HERE/zodlab/lab.ts" .
$PL/tb/node_modules/.bin/tsc --pretty false || exit 1
node lab.ts > "$HERE/outputs/zodlab.json"
