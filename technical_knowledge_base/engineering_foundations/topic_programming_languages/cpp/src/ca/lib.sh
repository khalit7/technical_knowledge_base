# Helpers for run_all.sh. rec NAME DIR 'COMMAND' runs COMMAND in $W/DIR and records
# "$ COMMAND" plus its combined stdout/stderr (and a non-zero exit code) in out/NAME.txt.
# Work happens in a copy of code/ under the scratch folder, so builds never touch the repo.
PL=${PL:-/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl}
HERE=$(cd "$(dirname "$0")" && pwd)
W=$PL/ca/work
OUT=$HERE/out
# Compiler wrappers: clang++ = Apple clang 17 + macOS 26 SDK; clang++-23 = LLVM clang 23.1.2 (see versions.txt)
mkdir -p "$PL/ca/bin"
SDK=/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk
printf '#!/bin/sh\nexec /Library/Developer/CommandLineTools/usr/bin/clang++ -isysroot %s -fno-color-diagnostics "$@"\n' "$SDK" > "$PL/ca/bin/clang++"
printf '#!/bin/sh\nexec %s/llvm/bin/clang++ -isysroot %s -fno-color-diagnostics "$@"\n' "$PL" "$SDK" > "$PL/ca/bin/clang++-23"
chmod +x "$PL/ca/bin/clang++" "$PL/ca/bin/clang++-23"
ln -sf "$PL/uvtools/bin/cmake" "$PL/ca/bin/cmake"; ln -sf "$PL/uvtools/bin/ninja" "$PL/ca/bin/ninja"
ln -sf "$PL/dsbin/python3.14" "$PL/ca/bin/python3.14"
export PATH=$PL/ca/bin:$PATH
export LC_ALL=C
mkdir -p "$OUT"
fresh() { rm -rf "$W"; mkdir -p "$W"; cp -R "$HERE/code/." "$W/"; }
clean_paths() { sed -e "s#$W/##g" -e "s#$W#.#g" -e "s#$PL/ca/bin/##g" -e "s#$PL/llvm#<llvm>#g" -e "s#$PL/[^ ]*/bin/##g" -e "s#/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk#<sdk>#g" -e "s#/Library/Developer/CommandLineTools/usr/bin/##g"; }
rec() {
  name=$1; dir=$2; cmd=$3
  ( cd "$W/$dir" && { printf '$ %s\n' "$cmd"; sh -c "$cmd" 2>&1; rc=$?; [ $rc -ne 0 ] && printf '[exit code %s]\n' "$rc"; true; } ) | clean_paths > "$OUT/$name.txt"
  echo "recorded $name ($(wc -l < "$OUT/$name.txt") lines)"
}
# rec without the command line (for long multi-step recordings)
recq() {
  name=$1; dir=$2; cmd=$3
  ( cd "$W/$dir" && { sh -c "$cmd" 2>&1; rc=$?; [ $rc -ne 0 ] && printf '[exit code %s]\n' "$rc"; true; } ) | clean_paths > "$OUT/$name.txt"
  echo "recorded $name ($(wc -l < "$OUT/$name.txt") lines)"
}
