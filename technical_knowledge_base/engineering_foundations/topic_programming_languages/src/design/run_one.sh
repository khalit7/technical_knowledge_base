#!/bin/bash
# Run one snippet and write its real output to outputs/<axis>/<lang>/<name>.txt
# Usage: run_one.sh code/<axis>/<lang>/<file>
# Directives (comment lines at the top of a snippet, not shown on the page):
#   flags: <extra compiler flags>      (cpp, rs)
#   edition: <year>                    (rs; default 2024)
#   run: no | always                   (no = compile/check only; always = run even if the checker fails, ts)
#   check: ty | mypy                   (py: run a type checker first)
#   post: <pipeline>                   (applied to the program's output, shown in the command line)
#   stdin: <text>                      (fed to the program)
#   file: <name>                       (rename the file in the work dir, e.g. lib.rs)
#   pre: <shell command>               (run first, shown in the output; e.g. build a library)
#   cmd: <shell command>               (replaces the default run step, shown in the output)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PL=/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl
export RUSTUP_HOME=$PL/rust/rustup CARGO_HOME=$PL/rust/cargo UV_CACHE_DIR=$PL/uvcache
export PATH=$PL/dsbin:$PL/rust/cargo/bin:$PL/ts/node_modules/.bin:$PL/bin:$PATH
PY=$PL/py/cpython-3.14.8-macos-aarch64-none/bin/python3.14
CXX=/Library/Developer/CommandLineTools/usr/bin/clang++
SDK=/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk
src="$1"; rel="${src#code/}"; axis="${rel%%/*}"; rest="${rel#*/}"; lang="${rest%%/*}"; base="$(basename "$src")"; name="${base%.*}"
out="$HERE/outputs/$axis/$lang/$name.txt"; mkdir -p "$(dirname "$out")"
dir(){ sed -n "s|^[#/]*[[:space:]]*$1:[[:space:]]*||p" "$HERE/$src" | head -1; }
flags="$(dir flags)"; edition="$(dir edition)"; run="$(dir run)"; check="$(dir check)"; post="$(dir post)"; stdin="$(dir stdin)"; fname="$(dir file)"; pre="$(dir pre)"; cmd="$(dir cmd)"
[ -z "$edition" ] && edition=2024; [ -z "$fname" ] && fname="$base"
W=$(mktemp -d "$PL/../dsw/run.XXXXXX"); W=$(cd "$W" && pwd -P); ln -s "$PL/ds_node/node_modules" "$W/node_modules"
# strip directive lines from the copy that is compiled (line numbers in errors then match the page)
grep -v -E '^(#|//)[[:space:]]*(flags|edition|run|check|post|stdin|file|pre|cmd):' "$HERE/$src" > "$W/$fname"
# sibling helper files (same name prefix + "__") are copied too
for h in "$(dirname "$HERE/$src")/${name}__"*; do [ -e "$h" ] && grep -v -E '^(#|//)[[:space:]]*(flags|edition|run|check|post|stdin|file|pre|cmd):' "$h" > "$W/$(basename "$h" | sed "s/^${name}__//")"; done
cd "$W"
show(){ echo "\$ $1"; }
runp(){ [ -n "$cmd" ] && set -- "$cmd" "$cmd"; # $1 = displayed program command, $2 = real command
  local cmd="$2"; local disp="$1"
  [ -n "$post" ] && { cmd="$cmd 2>&1 | $post"; disp="$disp 2>&1 | $post"; }
  show "$disp"
  if [ -n "$stdin" ]; then printf '%s\n' "$stdin" | bash -c "$cmd" 2>&1; else perl -e 'alarm 60; exec @ARGV' bash -c "$cmd" 2>&1 </dev/null; fi
  local rc=${PIPESTATUS[0]}; [ "$rc" != 0 ] && echo "(exit status $rc)"
}
{
[ -n "$pre" ] && { show "$pre"; bash -c "$pre" 2>&1; }
case "$lang" in
py)
  if [ -n "$check" ]; then
    if [ "$check" = ty ]; then show "ty check $fname"; uvx ty@0.0.84 check --no-progress --color never "$fname" 2>&1 | sed '/^WARN ty is pre-release/d'; fi
    if [ "$check" = mypy ]; then show "mypy --strict $fname"; uvx mypy==2.4.0 --strict --no-color-output --no-error-summary "$fname" 2>&1; fi
  fi
  [ "$run" != no ] && runp "python3.14 $fname" "$PY $fname" ;;
cpp)
  show "clang++ -std=c++23 -Wall ${flags:+$flags }$fname -o prog"
  if $CXX -isysroot $SDK -std=c++23 -Wall $flags -fno-color-diagnostics "$fname" -o prog 2>&1; then [ "$run" != no ] && runp "./prog" "./prog"; else echo "(compile failed)"; fi ;;
rs)
  show "rustc --edition $edition -A unused ${flags:+$flags }$fname"
  if rustc --edition $edition -A unused $flags --color never "$fname" -o prog 2>&1; then [ "$run" != no ] && runp "./prog" "./prog"; else echo "(compile failed)"; fi ;;
js)
  runp "node $fname" "node $fname" ;;
ts)
  show "tsc --strict --noEmit $fname"
  tsc --strict --noEmit --target esnext --module nodenext --pretty false "$fname" 2>&1; ok=$?
  if [ "$run" = always ] || { [ $ok = 0 ] && [ "$run" != no ]; }; then runp "node $fname" "node $fname"; fi ;;
esac
} > "$out.tmp" 2>&1
# hide the work-dir path if any tool printed it
# Node prints its own internal stack frames after the user's: trimmed (lines "    at ... node:...")
sed -e "s|$W/||g" -e "s|$W|.|g" -e "s|$PL/py/[^/]*/|<python>/|g" "$out.tmp" | grep -v -E '^    at .*node:' \
  | sed -E 's/^run_one\.sh: line [0-9]+: +[0-9]+ (Segmentation fault|Bus error|Abort trap)(: [0-9]+)? .*/\1\2/' > "$out"; rm -f "$out.tmp"
cd "$HERE"; rm -rf "$W"
