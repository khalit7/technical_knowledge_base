#!/bin/bash
# Rebuild every Rosetta snippet, run it, and capture its exact output (or its
# compiler / type-checker error) into outputs/<lang>/<name>.txt, plus
# outputs/versions.txt. Then regenerate the page data (make_data.py).
#
# Toolchains come from the environment (defaults: whatever is on PATH):
#   PY  (CPython 3.14, GIL build)   PYT (CPython 3.14t, free-threaded)
#   CXX (clang++)  CARGO, RUSTC  (with RUSTUP_HOME / CARGO_HOME if not on PATH)
#   NODE, TSC (TypeScript compiler)  UVX (to run mypy)
# Build products go to $RO_BUILD (default: a temp dir), never into the repo.
set -u
cd "$(dirname "$0")"
HERE=$(pwd)
PY=${PY:-python3.14}; PYT=${PYT:-python3.14t}; CXX=${CXX:-clang++}
CXX23=${CXX23:-}   # a newer clang (LLVM 23 here) for C++23 std::expected and the sanitizers; flags in CXX23_FLAGS
CXX23_FLAGS=${CXX23_FLAGS:-}
CARGO=${CARGO:-cargo}; RUSTC=${RUSTC:-rustc}; NODE=${NODE:-node}; TSC=${TSC:-tsc}; UVX=${UVX:-uvx}
MYPY=${MYPY:-mypy==1.18.2}
RO_BUILD=${RO_BUILD:-$(mktemp -d)}
mkdir -p "$RO_BUILD" outputs/python outputs/cpp outputs/rust outputs/ts
DATA="$HERE/data/chat.jsonl"
LLVM_HOME=$( [ -n "$CXX23" ] && cd "$(dirname "$CXX23")/.." && pwd )
UV=${UV:-uv}
PYHOME=$("$PY" -c 'import sys;print(sys.base_prefix)')

clean() {  # strip machine-specific paths so outputs read the same anywhere
  sed -e "s#file://$RO_BUILD/ts_dist#file:///dist#g" -e "s#$RO_BUILD/ts_dist#dist#g" -e "s#$RO_BUILD#build#g" \
      -e "s#$PYHOME#<python>#g" -e "s#${LLVM_HOME:-/nonexistent}#<llvm>#g" -e "s#$HERE/code/##g" -e "s#$HERE/data/#data/#g" -e "s#$HOME#~#g"
}
# cap <lang> <name> <dir> <shown command> -- <real command...>
cap() {
  local lang=$1 name=$2 dir=$3 shown=$4; shift 5
  local out="outputs/$lang/$name.txt"
  { echo "\$ $shown"; (cd "$dir" && "$@" 2>&1); echo "[exit $?]"; } | clean > "$out"
  echo "  $lang/$name: $(tail -1 "$out")"
}

echo "== count_tokens (must match PROGRAM.md exactly)"
"$CXX" -std=c++20 -O2 -Wall -Wextra -o "$RO_BUILD/count_tokens_cpp" code/cpp/count_tokens.cpp
(cd code/rust && CARGO_TARGET_DIR="$RO_BUILD/rust_target" "$CARGO" build --release --quiet --examples --bins)
RB="$RO_BUILD/rust_target/release"
rm -rf "${RO_BUILD:?}/ts_dist"; (cd code/ts && "$TSC" -p . --outDir "$RO_BUILD/ts_dist") && cp code/ts/package.json "$RO_BUILD/ts_dist/"
TD="$RO_BUILD/ts_dist"
D=../../data/chat.jsonl
cap python count_tokens code/python "python3.14 count_tokens.py chat.jsonl" -- "$PY" count_tokens.py $D
cap cpp count_tokens code/cpp "clang++ -std=c++20 -O2 -o count_tokens count_tokens.cpp && ./count_tokens chat.jsonl" -- "$RO_BUILD/count_tokens_cpp" $D
cap rust count_tokens code/rust "cargo run --release -- chat.jsonl" -- "$RB/count_tokens" $D
cap ts count_tokens code/ts "tsc -p . && node dist/count_tokens.js chat.jsonl" -- "$NODE" "$TD/count_tokens.js" $D
python3 - <<'EOF'
import re
exp = re.search(r"## Exact expected output for `data/chat.jsonl`\n\n```\n(.*?)```", open("PROGRAM.md").read(), re.S).group(1)
for lang in ["python", "cpp", "rust", "ts"]:
    body = open(f"outputs/{lang}/count_tokens.txt").read().split("\n", 1)[1]
    got = body.rsplit("[exit", 1)[0]
    print(f"  {lang}: {'MATCHES PROGRAM.md' if got == exp else 'DIFFERS FROM PROGRAM.md'}")
    assert got == exp, lang
EOF
cap python count_tokens_missing code/python "python3.14 count_tokens.py nope.jsonl" -- "$PY" count_tokens.py nope.jsonl
cap cpp count_tokens_missing code/cpp "./count_tokens nope.jsonl" -- "$RO_BUILD/count_tokens_cpp" nope.jsonl
cap rust count_tokens_missing code/rust "cargo run --release -- nope.jsonl" -- "$RB/count_tokens" nope.jsonl
cap ts count_tokens_missing code/ts "node dist/count_tokens.js nope.jsonl" -- "$NODE" "$TD/count_tokens.js" nope.jsonl

echo "== focused tasks"
for t in errors message closure generic threads memory; do
  cap python $t code/python "python3.14 $t.py chat.jsonl" -- "$PY" $t.py $D
  cap rust $t code/rust "cargo run --release --example $t -- chat.jsonl" -- "$RB/examples/$t" $D
  "$CXX" -std=c++20 -O2 -Wall -Wextra -o "$RO_BUILD/$t" code/cpp/$t.cpp
  cap cpp $t code/cpp "clang++ -std=c++20 -O2 -o $t $t.cpp && ./$t chat.jsonl" -- "$RO_BUILD/$t" $D
done
for t in errors message closure generic threads; do
  cap ts $t code/ts "node dist/$t.js chat.jsonl" -- "$NODE" "$TD/$t.js" $D
done
cap ts memory code/ts "node --allow-natives-syntax memory.js" -- sh -c "\"$NODE\" --allow-natives-syntax memory.js | grep -E '^DebugPrint|elements kind'"
cap python memory_numpy code/python "uv run --with numpy memory_numpy.py" -- "$UV" run -q --no-project --python "$PY" --with numpy memory_numpy.py
cap python threads_ft code/python "python3.14t threads.py chat.jsonl   # free-threaded build" -- "$PYT" threads.py $D
cap cpp expected code/cpp "clang++ -std=c++2b -c expected.cpp   # Apple clang 14" -- "$CXX" -std=c++2b -c expected.cpp -o /dev/null
$CXX23 -std=c++23 $CXX23_FLAGS -O2 -o "$RO_BUILD/expected23" code/cpp/expected.cpp
cap cpp expected23 code/cpp "clang++ -std=c++23 expected.cpp && ./expected   # LLVM clang 23" -- "$RO_BUILD/expected23"

echo "== deliberate mistakes"
for t in typo missing dangling race; do
  cap python m_$t code/python/mistakes "python3.14 $t.py" -- "$PY" $t.py
done
cap python m_race_ft code/python/mistakes "python3.14t race.py   # free-threaded build" -- "$PYT" race.py
for t in typo missing; do
  cap python m_${t}_mypy code/python/mistakes "mypy --strict $t.py" -- "$UVX" -q --python "$PY" "$MYPY" --strict --no-error-summary $t.py
done
for t in typo missing dangling moved race race_fixed order; do
  if [ $t = race_fixed ]; then
    "$RUSTC" --edition 2024 -O -o "$RO_BUILD/race_fixed" code/rust/mistakes/race_fixed.rs
    cap rust m_$t code/rust/mistakes "rustc --edition 2024 -O $t.rs && ./$t" -- "$RO_BUILD/race_fixed"
  else
    cap rust m_$t code/rust/mistakes "rustc --edition 2024 $t.rs" -- "$RUSTC" --edition 2024 -o "$RO_BUILD/m_$t" $t.rs
  fi
done
cap cpp m_typo code/cpp/mistakes "clang++ -std=c++20 typo.cpp" -- "$CXX" -std=c++20 -c typo.cpp -o /dev/null
cap cpp m_order code/cpp/mistakes "clang++ -std=c++20 order.cpp" -- "$CXX" -std=c++20 -c order.cpp -o /dev/null
"$CXX" -std=c++20 -O1 -o "$RO_BUILD/missing" code/cpp/mistakes/missing.cpp
cap cpp m_missing code/cpp/mistakes "clang++ -std=c++20 missing.cpp && ./missing" -- "$RO_BUILD/missing"
"$CXX" -std=c++20 -O1 -o "$RO_BUILD/dangling" code/cpp/mistakes/dangling.cpp 2>/dev/null
cap cpp m_dangling code/cpp/mistakes "clang++ -std=c++20 -O1 -Wall dangling.cpp && ./dangling | cat -v   # compiles, no warning" -- sh -c "\"$CXX\" -std=c++20 -O1 -Wall -o \"$RO_BUILD/dangling\" dangling.cpp && \"$RO_BUILD/dangling\" | cat -v"
$CXX23 -std=c++20 $CXX23_FLAGS -O1 -g -fsanitize=address -o "$RO_BUILD/dangling_asan" code/cpp/mistakes/dangling.cpp
cap cpp m_dangling_asan code/cpp/mistakes "clang++ -std=c++20 -O1 -g -fsanitize=address dangling.cpp && ./dangling   # LLVM clang 23; library frames filtered out" -- sh -c "\"$RO_BUILD/dangling_asan\" 2>&1 | grep -v 'std::__1' | head -30"
"$CXX" -std=c++20 -O1 -o "$RO_BUILD/race" code/cpp/mistakes/race.cpp
cap cpp m_race code/cpp/mistakes "clang++ -std=c++20 -O1 race.cpp && ./race   # compiles, no warning" -- "$RO_BUILD/race"
$CXX23 -std=c++20 $CXX23_FLAGS -O1 -g -fsanitize=thread -o "$RO_BUILD/race_tsan" code/cpp/mistakes/race.cpp
cap cpp m_race_tsan code/cpp/mistakes "clang++ -std=c++20 -O1 -g -fsanitize=thread race.cpp && ./race   # LLVM clang 23; library frames filtered out" -- sh -c "\"$RO_BUILD/race_tsan\" 2>&1 | grep -v 'std::__1' | sed -e 's/tid=[0-9]*/tid=N/'"
for t in typo missing dangling; do
  cap ts m_$t code/ts/mistakes "tsc --strict --noEmit --lib es2023 $t.ts" -- "$TSC" --ignoreConfig --strict --noEmit --target es2023 --lib es2023 --types node $t.ts
done
cap ts m_dangling_run code/ts/mistakes "node dangling.ts   # Node 22 strips the types and runs it" -- "$NODE" --no-warnings dangling.ts

echo "== versions"
{
  echo "captured: $(date -u +%Y-%m-%dT%H:%MZ)"
  echo "machine: $(uname -sm), $(sysctl -n machdep.cpu.brand_string 2>/dev/null)"
  echo "python: $("$PY" -VV | head -1)"
  echo "python (free-threaded): $("$PYT" -VV | head -1)"
  echo "mypy: $("$UVX" --python "$PY" "$MYPY" --version)"
  echo "c++: $("$CXX" --version | head -1)"
  echo "c++ (C++23 and sanitizers): $($CXX23 --version | head -1)"
  echo "rustc: $("$RUSTC" --version)"
  echo "cargo: $("$CARGO" --version)"
  echo "serde_json: $(grep -A1 'name = "serde_json"' code/rust/Cargo.lock | tail -1 | cut -d'"' -f2)"
  echo "numpy: $("$UV" run -q --no-project --python "$PY" --with numpy python -c 'import numpy;print(numpy.__version__)')"
  echo "node: $("$NODE" --version)"
  echo "typescript: $("$TSC" --version)"
  echo "@types/node: $(node -p "require('./code/ts/node_modules/@types/node/package.json').version" 2>/dev/null)"
} > outputs/versions.txt
cat outputs/versions.txt
python3 make_data.py
