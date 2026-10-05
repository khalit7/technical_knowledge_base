#!/bin/bash
# Outputs that are not a single snippet run: the npm peer-dependency conflict, runtime start-up timings.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PL=${PL:-${TMPDIR:-/tmp}/pl}
export NPM_CONFIG_USERCONFIG=$PL/ja/empty.npmrc
W=$PL/tb/work/eresolve; rm -rf $W; mkdir -p $W; cd $W; echo '{"name":"demo","private":true}' > package.json
{ echo '$ npm install --save-dev typescript@7.0.2 typescript-eslint@8.71.0'
  npm install --dry-run --cache $PL/npmcache --save-dev typescript@7.0.2 typescript-eslint@8.71.0 2>&1 | grep -v -E "full report|complete log|_logs/|^npm error *$" ; } > "$HERE/outputs/83_eresolve.txt"
