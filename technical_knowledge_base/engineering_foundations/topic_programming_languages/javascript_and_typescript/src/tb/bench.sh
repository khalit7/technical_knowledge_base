#!/bin/bash
# Timings shown in Part 2 (not part of run_all.sh: they take minutes and depend on machine load).
# 1. tsc 7.0.2 vs tsc 6.0.3 type-checking zod 4.6.5's own TypeScript sources (tests and benchmarks removed).
# 2. Start-up of `node file.ts` (type stripping), tsx and bun on a one-line program.
set -u
PL=${PL:-${TMPDIR:-/tmp}/pl}
HERE="$(cd "$(dirname "$0")" && pwd)"
B=$PL/tb/bench; rm -rf $B; mkdir -p $B; cp -R $PL/tb/node_modules/zod/src $B/src; cd $B
find src -name "*.test.ts" -delete; rm -rf src/v3/benchmarks src/v3/tests src/v4/classic/tests src/v4/mini/tests src/v4/core/tests
echo '{"type":"module"}' > package.json
echo '{ "compilerOptions": { "module": "nodenext", "target": "esnext", "strict": true, "noEmit": true, "skipLibCheck": true, "types": [], "allowImportingTsExtensions": true }, "include": ["src"] }' > tsconfig.json
{ echo "zod src: $(find src -name '*.ts' | wc -l | tr -d ' ') files, $(find src -name '*.ts' | xargs cat | wc -l | tr -d ' ') lines"
  echo "load before: $(sysctl -n vm.loadavg)"
  $PL/bin/hyperfine --warmup 2 --runs 10 -N -n "tsc 7.0.2" "$PL/tb/node_modules/.bin/tsc -p ." -n "tsc 6.0.3" "$PL/tb/eslint6/node_modules/.bin/tsc -p ." -n "tsc 7.0.2 --checkers 1" "$PL/tb/node_modules/.bin/tsc -p . --checkers 1"
  echo "load after: $(sysctl -n vm.loadavg)"; } > "$HERE/outputs/tsc_bench.txt" 2>&1
S=$PL/tb/startup; rm -rf $S; mkdir -p $S; cd $S; echo '{"type":"module"}' > package.json
echo 'const n: number = 1; console.log(n);' > hello.ts
{ echo "load before: $(sysctl -n vm.loadavg)"
  $PL/bin/hyperfine --warmup 3 --runs 20 -N -n "node hello.ts (22.22.2, type stripping)" "node hello.ts" -n "tsx hello.ts (4.23.15)" "$PL/tb/node_modules/.bin/tsx hello.ts" -n "bun hello.ts (1.4.2)" "$PL/bin/bun hello.ts"
  echo "load after: $(sysctl -n vm.loadavg)"; } > "$HERE/outputs/startup_bench.txt" 2>&1
