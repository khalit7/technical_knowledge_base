# Helpers for run_all.sh. rec NAME DIR 'COMMAND' runs COMMAND in $W/DIR and records
# "$ COMMAND" plus its combined stdout/stderr (and a non-zero exit code) in out/NAME.txt.
# Work happens in a copy of code/ under the scratch folder, so builds never touch the repo.
PL=${PL:-${TMPDIR:-/tmp}/pl}
HERE=$(cd "$(dirname "$0")" && pwd)
W=$PL/ra/work
OUT=$HERE/out
export RUSTUP_HOME=$PL/rust/rustup CARGO_HOME=$PL/rust/cargo
export CARGO_TARGET_DIR=$PL/ra/target CARGO_TERM_COLOR=never CARGO_TERM_PROGRESS_WHEN=never
mkdir -p "$PL/ra/bin"
ln -sf "$PL/dsbin/python3.14" "$PL/ra/bin/python3.14" 2>/dev/null
export PATH=$PL/ra/bin:$PL/rust/cargo/bin:$PATH
export LC_ALL=C
mkdir -p "$OUT"
fresh() { rm -rf "$W"; mkdir -p "$W"; cp -R "$HERE/code/." "$W/"; cp "$HERE/../../../src/rosetta/data/chat.jsonl" "$W/"; }
clean_paths() { sed -e "s#$W/##g" -e "s#$W#.#g" -e "s#$PL/ra/target#target#g" -e "s#$PL/rust/rustup/toolchains/[^/]*/lib/rustlib/src/rust/#<rust-src>/#g" -e "s#$PL/rust/cargo/registry/src/[^/]*/#<registry>/#g" -e "s#$PL/rust/[^ ]*/bin/##g" -e "s#$PL/ra/bin/##g" -e "s#$PL#<pl>#g" -e '/^ *Blocking waiting for file lock/d' -e 's/ in [0-9.]*m\{0,1\}s$/ in <time>/' ; }
rec() {
  name=$1; dir=$2; cmd=$3
  ( cd "$W/$dir" && { printf '$ %s\n' "$cmd"; sh -c "$cmd" 2>&1; rc=$?; [ $rc -ne 0 ] && printf '[exit code %s]\n' "$rc"; true; } ) | clean_paths > "$OUT/$name.txt"
  echo "recorded $name ($(wc -l < "$OUT/$name.txt") lines)"
}
recq() {
  name=$1; dir=$2; cmd=$3
  ( cd "$W/$dir" && { sh -c "$cmd" 2>&1; rc=$?; [ $rc -ne 0 ] && printf '[exit code %s]\n' "$rc"; true; } ) | clean_paths > "$OUT/$name.txt"
  echo "recorded $name ($(wc -l < "$OUT/$name.txt") lines)"
}
# rustc on one file: run a program, or show the compiler's errors
run() { rec "$1" "$2" "rustc --edition 2024 $3.rs && ./$3${4:+ $4}"; }
fail() { rec "$1" "$2" "rustc --edition 2024 $3.rs"; }
