#!/bin/bash
# Reproduce every number on the Benchmark tab.
#   PL=<toolchain dir> WORK=<scratch dir> bash run_bench.sh
# PL holds the toolchains installed for this page (see README.md: rustup with RUSTUP_HOME/CARGO_HOME
# in PL/rust, uv-installed CPython 3.13 / 3.14 / 3.14t in PL/py, hyperfine and bun in PL/bin,
# typescript in PL/ts/node_modules). WORK receives the 39 MB input, builds and logs; nothing large
# is written into the repository. Raw results land in results/; summarize.py turns them into
# results/summary.json and ../parts/32_js_bm_data.js; check_numbers.py checks the page against them.
# Takes about 15 minutes on an M1 Pro.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
RO="$(cd "$HERE/../rosetta" && pwd)"          # the Rosetta tab's program (PROGRAM.md, code/)
PL="${PL:?set PL to the toolchain dir}"
WORK="${WORK:?set WORK to a scratch dir}"
RES="$HERE/results"
mkdir -p "$WORK/data" "$WORK/build" "$RES"
export RUSTUP_HOME="$PL/rust/rustup" CARGO_HOME="$PL/rust/cargo"
export PATH="$PL/rust/cargo/bin:$PL/bin:$PATH"
export UV_PYTHON_INSTALL_DIR="$PL/py" UV_CACHE_DIR="$PL/uvcache" UV_PYTHON_INSTALL_BIN=0
LLVM="${LLVM:-$PL/llvm}"   # LLVM clang 23 besides Apple clang 14. It compiles against the macOS SDK's libc++
# (the same standard library as Apple clang), so the two C++ builds differ only in the compiler. (Linking LLVM's own
# libc++ 23 made every program that destroys a std::ifstream abort at exit on this macOS, so that was not used.)
SDK="$(xcrun --show-sdk-path)"
F23="-isysroot $SDK -nostdinc++ -isystem $SDK/usr/include/c++/v1"
CXX23="$LLVM/bin/clang++"
HF="$PL/bin/hyperfine"; BUN="$PL/bin/bun"; TSC="$PL/ts/node_modules/.bin/tsc"
PY313="$(uv python find 3.13)"; PY314B="$(uv python find 3.14)"; PY314T="$(uv python find 3.14t)"
DATA="$WORK/data/chat200k.jsonl"; EMPTY="$WORK/data/empty.jsonl"; : > "$EMPTY"
log(){ echo "[$(date +%H:%M:%S)] $*"; }

log "input"
[ -s "$DATA" ] || python3 "$RO/data/gen_chat.py" --lines 200000 --seed 7 > "$DATA"
shasum -a 256 "$DATA" | cut -d' ' -f1 > "$RES/input_sha256.txt"

log "python 3.14 venv with the binding tools"
VENV="$WORK/venv314"
[ -x "$VENV/bin/python" ] || uv venv -q -p "$PY314B" "$VENV"
uv pip install -q -p "$VENV/bin/python" maturin pybind11 nanobind
PY314="$VENV/bin/python"

log "environment"
{
  echo "date $(date -u +%Y-%m-%dT%H:%MZ)"
  echo "hw.model $(sysctl -n hw.model)"
  echo "cpu $(sysctl -n machdep.cpu.brand_string)"
  echo "cores $(sysctl -n hw.ncpu) (performance $(sysctl -n hw.perflevel0.physicalcpu), efficiency $(sysctl -n hw.perflevel1.physicalcpu))"
  echo "loadavg_at_start $(sysctl -n vm.loadavg)"
  echo "memory_bytes $(sysctl -n hw.memsize)"
  echo "os $(sw_vers -productName) $(sw_vers -productVersion) ($(sw_vers -buildVersion))"
  echo "python313 $($PY313 -c 'import sys;print(sys.version.split()[0])')"
  echo "python314 $($PY314 -c 'import sys;print(sys.version.split()[0])')"
  echo "python314t $($PY314T -c 'import sys;print(sys.version.split()[0], "gil_enabled=%s" % sys._is_gil_enabled())')"
  echo "python314_config $($PY314 -c "import sysconfig;a=sysconfig.get_config_var('CONFIG_ARGS');print(' '.join(x.strip(\"'\") for x in a.split() if any(k in x for k in ('tail-call','optimizations','lto','jit'))))")"
  echo "clang $(clang++ --version | head -1)"
  echo "clang23 $($CXX23 --version | head -1 | cut -d'(' -f1)"
  echo "simdjson 3.13.0"
  echo "rustc $(rustc --version)"
  echo "rustc_llvm $(rustc --version --verbose | grep LLVM | cut -d' ' -f3)"
  echo "cargo $(cargo --version)"
  echo "node $(node --version) (v8 $(node -p process.versions.v8))"
  echo "bun $($BUN --version)"
  echo "tsc $($TSC --version)"
  echo "hyperfine $($HF --version)"
  echo "uv $(uv --version)"
  echo "pyo3 $(grep -A1 'name = "pyo3"$' "$HERE/ext_rust/Cargo.lock" | tail -1 | cut -d'"' -f2)"
  echo "serde_json $(grep -A1 'name = "serde_json"$' "$HERE/ext_rust/Cargo.lock" | tail -1 | cut -d'"' -f2)"
  echo "maturin $($VENV/bin/maturin --version | cut -d' ' -f2)"
  echo "pybind11 $($PY314 -c 'import pybind11;print(pybind11.__version__)')"
  echo "nanobind $($PY314 -c 'import nanobind;print(nanobind.__version__)')"
} > "$RES/env.txt"
cat "$RES/env.txt"

log "builds, timed (compile times)"
B="$WORK/build"; mkdir -p "$B/ext" "$WORK/simdjson"
for f in simdjson.h simdjson.cpp; do [ -s "$WORK/simdjson/$f" ] || curl -sfL -o "$WORK/simdjson/$f" "https://raw.githubusercontent.com/simdjson/simdjson/v3.13.0/singleheader/$f"; done
"$HF" -N --runs 5 --warmup 1 --export-json "$RES/compile_cpp.json" \
  -n "clang++ -O2" "clang++ -std=c++20 -O2 -o $B/cpp_O2 $RO/code/cpp/count_tokens.cpp" \
  -n "clang++ -O3" "clang++ -std=c++20 -O3 -o $B/cpp_O3 $RO/code/cpp/count_tokens.cpp" \
  -n "LLVM clang++ 23 -O2" "$CXX23 -std=c++20 -O2 -o $B/cpp23_O2 $RO/code/cpp/count_tokens.cpp $F23" >/dev/null
"$HF" -N --runs 3 --export-json "$RES/compile_simdjson.json" \
  -n "clang++ -O2, simdjson variant (compiles simdjson.cpp too)" "clang++ -std=c++20 -O2 -I$WORK/simdjson -o $B/cpp_simdjson $HERE/cpp_simdjson/count_tokens_simdjson.cpp $WORK/simdjson/simdjson.cpp" >/dev/null
export CARGO_TARGET_DIR="$B/rust_target"
( cd "$RO/code/rust" && cargo fetch -q )
"$HF" --runs 3 --export-json "$RES/compile_rust.json" \
  --prepare "cd $RO/code/rust && cargo clean -q" -n "cargo build --release (clean, with serde)" "cd $RO/code/rust && cargo build --release -q" \
  --prepare "touch $RO/code/rust/src/main.rs" -n "cargo build --release (after editing main.rs)" "cd $RO/code/rust && cargo build --release -q" >/dev/null
cp "$B/rust_target/release/count_tokens" "$B/rust_release"
"$HF" -N --runs 3 --warmup 1 --export-json "$RES/compile_ts.json" \
  -n "tsc (type-check and emit)" "$TSC -p $RO/code/ts/tsconfig.json --outDir $B/ts_dist" >/dev/null
unset CARGO_TARGET_DIR
( cd "$HERE/ext_rust" && CARGO_TARGET_DIR="$B/ext_rust_target" VIRTUAL_ENV="$VENV" \
  "$HF" --runs 2 --export-json "$RES/compile_pyo3.json" \
  --prepare "cargo clean -q" -n "maturin build --release (clean, with pyo3)" "$VENV/bin/maturin build --release -q -i $PY314 -o $B/wheels" >/dev/null )
uv pip install -q -p "$PY314" --force-reinstall "$B"/wheels/ct_rs-*.whl
"$HF" --runs 3 --export-json "$RES/compile_cppext.json" \
  -n "pybind11 + nanobind extensions (clang++ -O3, both)" "PY=$PY314 OUT=$B/ext RO=$RO/code/cpp bash $HERE/ext_cpp/build.sh" >/dev/null

log "correctness: every variant must print the expected output"
EXP="$RES/expected_200k.txt"
PPY="env PYTHONPATH=$HERE/py:$B/ext"
declare -a IDS CMDS
add(){ IDS+=("$1"); CMDS+=("$2"); }
add py313_loop  "$PY313 $RO/code/python/count_tokens.py"
add py314_loop  "$PY314 $RO/code/python/count_tokens.py"
add py314t_loop "$PY314T $RO/code/python/count_tokens.py"
add py313_re    "$PPY $PY313 $HERE/py/count_re.py"
add py314_re    "$PPY $PY314 $HERE/py/count_re.py"
add py314_thr1  "$PPY $PY314 $HERE/py/count_threads.py @ 1"
add py314_thr4  "$PPY $PY314 $HERE/py/count_threads.py @ 4"
add py314t_thr1 "$PPY $PY314T $HERE/py/count_threads.py @ 1"
add py314t_thr4 "$PPY $PY314T $HERE/py/count_threads.py @ 4"
add py314t_thr8 "$PPY $PY314T $HERE/py/count_threads.py @ 8"
add cpp_O2      "$B/cpp_O2"
add cpp_O3      "$B/cpp_O3"
add cpp23_O2    "$B/cpp23_O2"
add cpp_simdjson "$B/cpp_simdjson"
add rust        "$B/rust_release"
add node_js     "node $B/ts_dist/count_tokens.js"
add node_ts     "node $RO/code/ts/count_tokens.ts"
add bun_ts      "$BUN $RO/code/ts/count_tokens.ts"
for k in rs pb nb; do
  add py${k}_percall "$PPY $PY314 $HERE/py/count_ext.py $k percall"
  add py${k}_batch   "$PPY $PY314 $HERE/py/count_ext.py $k batch"
  add py${k}_file    "$PPY $PY314 $HERE/py/count_ext.py $k file"
done
add pyrs_file4 "$PPY $PY314 $HERE/py/count_ext.py rs file @ 4"
cmd_for(){ local c="$2"; if [[ "$c" == *"@"* ]]; then echo "${c/@/$1}"; else echo "$c $1"; fi; }
for i in "${!IDS[@]}"; do
  out=$(eval "$(cmd_for "$DATA" "${CMDS[$i]}")") || { echo "FAILED (exit $?): ${IDS[$i]}"; exit 1; }
  if [ "$out" != "$(cat "$EXP")" ]; then echo "WRONG OUTPUT: ${IDS[$i]}"; exit 1; fi
done
printf '%s\n' "${IDS[@]}" > "$RES/variants_ok.txt"
for i in "${!IDS[@]}"; do echo "${IDS[$i]}	$(cmd_for '<input>' "${CMDS[$i]}" | sed "s#$WORK#\$WORK#g; s#$PL#\$PL#g; s#$HERE#src/bench#g; s#$RO#src/rosetta#g")"; done > "$RES/commands.tsv"

log "wall time on the 200,000-line file (warm: 2 warmup runs, then 7 timed)"
args=(); for i in "${!IDS[@]}"; do args+=(-n "${IDS[$i]}" "$(cmd_for "$DATA" "${CMDS[$i]}")"); done
"$HF" -N --warmup 2 --runs 7 --export-json "$RES/time_200k.json" "${args[@]}" > "$WORK/time_200k.log"

log "startup: the same programs on an empty file (warm)"
args=(); for i in "${!IDS[@]}"; do case "${IDS[$i]}" in *thr4|*thr8|*thr1|pyrs_file4|*percall|*batch) continue;; esac
  args+=(-n "${IDS[$i]}" "$(cmd_for "$EMPTY" "${CMDS[$i]}")"); done
args+=(-n "python3.14 -c pass" "$PY314 -c pass" -n "node -e 0" "node -e 0" -n "bun -e 0" "$BUN -e 0")
"$HF" -N --warmup 3 --runs 20 --export-json "$RES/startup.json" "${args[@]}" > "$WORK/startup.log"

log "cold start: Python with an empty bytecode cache (every imported module recompiled)"
PC="$WORK/pycache_cold"
"$HF" -N --runs 10 --export-json "$RES/startup_cold.json" \
  --prepare "rm -rf $PC" -n "py314_loop cold (no bytecode cache)" "env PYTHONPYCACHEPREFIX=$PC $PY314 $RO/code/python/count_tokens.py $EMPTY" \
  --prepare "true" -n "py314_loop warm" "env PYTHONPYCACHEPREFIX=$PC $PY314 $RO/code/python/count_tokens.py $EMPTY" \
  --prepare "rm -rf $WORK/nodecache" -n "node_ts cold (empty compile cache)" "env NODE_COMPILE_CACHE=$WORK/nodecache node $RO/code/ts/count_tokens.ts $EMPTY" \
  --prepare "true" -n "node_ts warm (compile cache filled)" "env NODE_COMPILE_CACHE=$WORK/nodecache node $RO/code/ts/count_tokens.ts $EMPTY" > "$WORK/cold.log"

log "peak memory (/usr/bin/time -l, 3 runs each)"
: > "$RES/memory.tsv"
for i in "${!IDS[@]}"; do for r in 1 2 3; do
  eval "/usr/bin/time -l $(cmd_for "$DATA" "${CMDS[$i]}") > /dev/null 2> $WORK/mem.txt"
  rss=$(grep 'maximum resident set size' "$WORK/mem.txt" | awk '{print $1}')
  fp=$(grep 'peak memory footprint' "$WORK/mem.txt" | awk '{print $1}')
  echo "${IDS[$i]}	$r	$rss	$fp" >> "$RES/memory.tsv"
done; done

log "crossing cost and stage breakdown (in-process)"
env PYTHONPATH="$HERE/py:$B/ext" "$PY314" "$HERE/py/crossing.py" "$DATA" > "$RES/crossing.json"
"$PY314" "$HERE/py/breakdown.py" "$DATA" > "$RES/breakdown_314.json"
"$PY313" "$HERE/py/breakdown.py" "$DATA" > "$RES/breakdown_313.json"

log "the token loop compiled: Apple clang vs rustc"
CXX23="$CXX23" F23="$F23" bash "$HERE/loop_probe.sh" "$B" > "$RES/loop_probe.txt"

log "sizes and lines of code"
{
  echo "cpp_O2_bytes $(stat -f %z "$B/cpp_O2")"
  echo "cpp_O3_bytes $(stat -f %z "$B/cpp_O3")"
  echo "cpp23_O2_bytes $(stat -f %z "$B/cpp23_O2")"
  echo "cpp_simdjson_bytes $(stat -f %z "$B/cpp_simdjson")"
  echo "rust_release_bytes $(stat -f %z "$B/rust_release")"
  echo "ts_dist_js_bytes $(stat -f %z "$B/ts_dist/count_tokens.js")"
  echo "node_binary_bytes $(stat -f %z "$(command -v node)")"
  echo "bun_binary_bytes $(stat -f %z "$BUN")"
  echo "python314_install_bytes $(du -sk "$(dirname "$(dirname "$PY314B")")/" | awk '{print $1*1024}')"
  echo "python314_libpython_bytes $(stat -f %z "$(dirname "$(dirname "$PY314B")")"/lib/libpython3.14.dylib)"
  echo "ct_rs_ext_bytes $(stat -f %z "$(ls "$VENV"/lib/python3.14/site-packages/ct_rs/*.so | head -1)")"
  echo "ct_pb_ext_bytes $(stat -f %z "$B"/ext/ct_pb*.so)"
  echo "ct_nb_ext_bytes $(stat -f %z "$B"/ext/ct_nb*.so)"
} > "$RES/sizes.txt"
python3 "$HERE/loc.py" "$RO/code" "$HERE" > "$RES/loc.json"

log "summarize"
python3 "$HERE/summarize.py"
python3 "$HERE/check_numbers.py"
log "done"
