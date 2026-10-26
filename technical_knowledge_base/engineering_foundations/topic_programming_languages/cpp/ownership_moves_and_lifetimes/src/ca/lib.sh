# Helpers for run_all.sh. rec NAME DIR 'COMMAND' runs COMMAND in $W/DIR and records
# "$ COMMAND" plus its combined stdout/stderr (and a non-zero exit code) in out/NAME.txt.
# Work happens in a copy of code/ under the scratch folder, so builds never touch the repo.
PL=${PL:-${TMPDIR:-/tmp}/pl}
HERE=$(cd "$(dirname "$0")" && pwd)
W=$PL/ca/work
OUT=$HERE/out
# Compiler wrapper: clang++ = Apple clang 17 + macOS 26 SDK (see versions.txt); python3.14 from PATH for copy.py
mkdir -p "$PL/ca/bin"
SDK=/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk
printf '#!/bin/sh\nexec /Library/Developer/CommandLineTools/usr/bin/clang++ -isysroot %s -fno-color-diagnostics "$@"\n' "$SDK" > "$PL/ca/bin/clang++"
chmod +x "$PL/ca/bin/clang++"
ln -sf "$(command -v python3.14)" "$PL/ca/bin/python3.14"
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
