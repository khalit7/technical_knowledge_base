#!/bin/bash
# Run one TypeScript snippet and write its real output to outputs/<name>.txt
# Usage: run_one.sh code/<name>.ts
# Each snippet runs in a fresh work dir in the scratchpad: package.json {"type":"module"}, the tsconfig.json
# that TypeScript 7's `tsc --init` writes, with types ["node"], noEmit and allowImportingTsExtensions (see tsconfig.base.json).
# Directives (comment lines at the top of a snippet, removed before compiling so line numbers match the page):
#   // run: no | always        no = check only; always = run with node even if tsc fails (default: run if tsc passes)
#   // check: no               do not run tsc
#   // cfg: {"k":v,...}        merged into compilerOptions for this snippet (the page says so)
#   // cmd: <shell command>    replaces the default run step (shown)
#   // file: <name>            file name in the work dir
#   // nm: eslint6             use pl/tb/eslint6/node_modules (TypeScript 6.0.3 + ESLint + typescript-eslint) instead
# Sibling helper files code/<name>__<other> are copied as <other>.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PL=${PL:-${TMPDIR:-/tmp}/pl}
export PATH=$PL/tb/node_modules/.bin:$PL/bin:$PATH
export NPM_CONFIG_USERCONFIG=$PL/ja/empty.npmrc   # the user's ~/.npmrc is never read
src="$1"; base="$(basename "$src")"; name="${base%.*}"
out="$HERE/outputs/$name.txt"
dir(){ sed -n "s|^//[[:space:]]*$1:[[:space:]]*||p" "$HERE/$src" | head -1; }
run="$(dir run)"; check="$(dir check)"; cfg="$(dir cfg)"; cmd="$(dir cmd)"; fname="$(dir file)"; nm="$(dir nm)"; data="$(dir data)"
[ -z "$fname" ] && fname="$(echo "$base" | sed -E "s/^[a-z]?[0-9]+[a-z]?_//")"
W="$PL/tb/work/$name"; rm -rf "$W"; mkdir -p "$W"
if [ "$nm" = eslint6 ]; then ln -s "$PL/tb/eslint6/node_modules" "$W/node_modules"; export PATH=$PL/tb/eslint6/node_modules/.bin:$PATH; else ln -s "$PL/tb/node_modules" "$W/node_modules"; fi
echo '{"type":"module"}' > "$W/package.json"
node -e 'const b=require(process.argv[1]);const x=process.argv[2]?JSON.parse(process.argv[2]):{};Object.assign(b.compilerOptions,x);
for(const k in b.compilerOptions)if(b.compilerOptions[k]===null)delete b.compilerOptions[k];
require("fs").writeFileSync(process.argv[3],JSON.stringify(b,null,2))' "$HERE/tsconfig.base.json" "$cfg" "$W/tsconfig.json"
strip(){ grep -v -E "^//[[:space:]]*(run|check|cfg|cmd|file|nm|data):" "$1"; }
strip "$HERE/$src" > "$W/$fname"
# data: chat links the root page's running-program input (src/rosetta/data/chat.jsonl) into the work dir
[ "$data" = chat ] && ln -s "$HERE/../../../src/rosetta/data/chat.jsonl" "$W/chat.jsonl"
for h in "$HERE/code/${name}__"*; do [ -e "$h" ] && strip "$h" > "$W/$(basename "$h" | sed "s/^${name}__//")"; done
cd "$W"
{
ok=0
if [ "$check" != no ]; then
  echo "\$ npx tsc --pretty false"
  tsc --pretty false 2>&1; ok=$?
  [ $ok != 0 ] && echo "(exit status $ok)"
fi
if [ "$run" = always ] || { [ $ok = 0 ] && [ "$run" != no ]; }; then
  c="${cmd:-node $fname}"
  echo "\$ $c"
  perl -e 'alarm 60; exec @ARGV' bash -c "$c" 2>&1 </dev/null; rc=$?
  [ $rc != 0 ] && echo "(exit status $rc)"
fi
} > "$out.tmp" 2>&1
# hide work-dir paths; trim Node's own internal stack frames
sed -e "s|file://$W/||g" -e "s|$W/||g" -e "s|$W|.|g" -e "s|$PL/tb/eslint6/node_modules|node_modules|g" -e "s|$PL/tb/node_modules|node_modules|g" "$out.tmp" | grep -v -E '^    at .*(node:|node_modules)' > "$out"
rm -f "$out.tmp"
