#!/bin/bash
# Reproduce every output shown in Part 2 (Speeding up Python) of the Rust page.
# Toolchains live in the session scratchpad (see versions.txt); point PL at your own copy.
# About 10 minutes on an M1 Pro. Writes outputs/*.txt and outputs/*.json; long paths are shortened.
set -u
PL=${PL:-/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl}
. "$PL/tools_research/env.sh"; export UV_PYTHON_INSTALL_BIN=0
HERE=$(cd "$(dirname "$0")" && pwd); EXT=$HERE/ext; CODE=$HERE/code; OUT=$HERE/outputs; mkdir -p "$OUT"
ROOT=$(cd "$HERE/../../.." && pwd)                       # topic_programming_languages/
W=$PL/rb; mkdir -p "$W"; cd "$W"
V=$W/venv314/bin; VT=$W/venv314t/bin; PY=$V/python; PYT=$VT/python; MAT=$V/maturin
clean() { sed -e "s|$PL/rust/cargo/registry/src/index.crates.io-[0-9a-f]*/|<registry>/|g" -e "s|$HERE/||g" -e "s|$ROOT/||g" -e "s|$PL|<pl>|g" \
  -e "s|/var/folders/[^ ]*/T/\.tmp[A-Za-z0-9]*|<tmp>|g" -e "s|/rustc/[0-9a-f]*/|<rustc>/|g"; }
export CHAT=$W/chat200k.jsonl PYTHONPATH=$CODE
# input: the root's benchmark log (38,792,775 bytes, sha256 in the root's bench/results/input_sha256.txt)
[ -f "$CHAT" ] || python3 "$ROOT/src/rosetta/data/gen_chat.py" --lines 200000 --seed 7 > "$CHAT"
# venvs: CPython 3.14.8 (GIL) and 3.14.8t (free-threaded)
[ -x $PY ] || { uv venv -q --python $PL/py/cpython-3.14.8-macos-aarch64-none/bin/python3.14 venv314; uv pip install -q --python $PY numpy pytest maturin==1.15.0 mypy cython numba setuptools; }
[ -x $PYT ] || { uv venv -q --python $PL/py/cpython-3.14.8+freethreaded-macos-aarch64-none/bin/python3.14t venv314t; uv pip install -q --python $PYT numpy pytest; }

echo "build"
( cd "$EXT" && rm -rf $W/target_clean && /usr/bin/time -p env CARGO_TARGET_DIR=$W/target_clean VIRTUAL_ENV=$W/venv314 $MAT develop --release 2>&1 ) | grep -v "^ *Compiling\|^ *Downloaded\|^ *Downloading" | clean > "$OUT/b1_develop.txt"
( cd "$EXT" && CARGO_TARGET_DIR=$W/target VIRTUAL_ENV=$W/venv314 $MAT develop --release -q >/dev/null 2>&1 )
( cd "$EXT" && CARGO_TARGET_DIR=$W/target_t VIRTUAL_ENV=$W/venv314t $MAT develop --release -q >/dev/null 2>&1 )
( cd "$CODE/gilused" && CARGO_TARGET_DIR=$W/target_gu VIRTUAL_ENV=$W/venv314t $MAT develop --release -q >/dev/null 2>&1 )
( cd "$CODE/send_err" && CARGO_TARGET_DIR=$W/target_se PYO3_PYTHON=$PY cargo build --release 2>&1 ) | grep -v "^ *Compiling\|Updating\|Locking\|Download" | clean > "$OUT/b2_send_err.txt"
rm -rf $W/dist $W/dist_abi3 $W/dist_abi3t $W/stubs_auto
( cd "$EXT" && CARGO_TARGET_DIR=$W/target $MAT build --release -i $PY -o $W/dist 2>&1 ) | grep -v "^ *Compiling" | clean > "$OUT/b3_wheel.txt"
( cd $W/dist && unzip -l *.whl && rm -rf x && mkdir x && cd x && unzip -q ../*.whl && otool -L tokrs/*.so ) 2>&1 | clean > "$OUT/b4_wheel_files.txt"
( cd "$EXT" && CARGO_TARGET_DIR=$W/target_abi3 $MAT build --release --features pyo3/abi3-py310 -i $PY -o $W/dist_abi3 2>&1 ) | grep -v "^ *Compiling" | clean > "$OUT/b5_abi3.txt"
WA=$(ls $W/dist_abi3/*.whl)
{ for v in 3.12.15 3.13.16 3.14.8; do d=abi_$v; [ -d $d ] || uv venv -q --python $PL/py/cpython-$v-macos-aarch64-none/bin/python${v%.*} $d
    uv pip install -q --python $d/bin/python --reinstall-package tokrs "$WA" numpy
    $d/bin/python -c "import tokrs,sys,os;print('Python', sys.version.split()[0], 'loads', os.path.basename(tokrs.tokrs.__file__), '->', tokrs.count_tokens('x86_64 café'))"; done
  [ -d abi_314t ] || uv venv -q --python $PL/py/cpython-3.14.8+freethreaded-macos-aarch64-none/bin/python3.14t abi_314t
  echo "\$ uv pip install (3.14t) $(basename $WA)"; uv pip install --python abi_314t/bin/python "$WA" 2>&1; } 2>&1 | clean > "$OUT/b6_abi3_install.txt"
( cd "$EXT" && CARGO_TARGET_DIR=$W/target_abi3t $MAT build --release --features pyo3/abi3t-py315 -i $PL/py/cpython-3.15.0rc3+freethreaded-macos-aarch64-none/bin/python3.15t -o $W/dist_abi3t 2>&1 ) | grep -v "^ *Compiling" | clean > "$OUT/b7_abi3t.txt"
WT=$(ls $W/dist_abi3t/*.whl)
{ for v in "3.15.0rc3+freethreaded:python3.15t:abit_315t" "3.15.0rc3:python3.15:abit_315"; do IFS=: read ver exe d <<< "$v"
    [ -d $d ] || uv venv -q --python $PL/py/cpython-$ver-macos-aarch64-none/bin/$exe $d
    uv pip install -q --python $d/bin/python --no-deps --reinstall-package tokrs "$WT"
    $d/bin/python -c "import tokrs,sys,os;print('Python', sys.version.split()[0], 'GIL enabled:', sys._is_gil_enabled(), 'loads', os.path.basename(tokrs.tokrs.__file__), '->', tokrs.count_tokens('x86_64 café'))"; done; } 2>&1 | clean > "$OUT/b8_abi3t_install.txt"
( cd "$EXT" && CARGO_TARGET_DIR=$W/target_inspect $MAT generate-stubs -q -i $PY --features pyo3/experimental-inspect -o $W/stubs_auto >/dev/null 2>&1 ); cp $W/stubs_auto/tokrs/__init__.pyi "$OUT/b9_stubs_auto.pyi"
( cd "$EXT" && $MAT generate-ci github 2>/dev/null ) > "$OUT/b10_ci.yml"

echo "run"
cd "$CODE"
for f in c1_first c2_types c4_numpy c5_errors c6_class; do $PY -u $f.py 2>&1 | clean > "$OUT/$f.txt"; done
$PYT -u c10_ft.py 2>&1 | clean > "$OUT/c10_ft.txt"
{ $PYT -u c13_ft_borrow.py; $PY -u c13_ft_borrow.py; } 2>&1 | clean > "$OUT/c13_ft_borrow.txt"
# the same wheel with its stub file and py.typed marker deleted, to see what mypy knows without them
[ -d $W/nostub ] || uv venv -q --python $PY $W/nostub; uv pip install -q --python $W/nostub/bin/python --reinstall-package tokrs "$WA" numpy
rm -f $W/nostub/lib/python3.14/site-packages/tokrs/__init__.pyi $W/nostub/lib/python3.14/site-packages/tokrs/py.typed
$V/mypy --strict --python-executable $W/nostub/bin/python c11_typed.py 2>&1 | clean > "$OUT/c11_mypy_nostub.txt"
$V/mypy --strict c11_typed.py 2>&1 | clean > "$OUT/c11_mypy.txt"
$PL/pa/venv/bin/ty check --output-format concise --python $PY c11_typed.py 2>&1 | clean > "$OUT/c11_ty.txt"
( cd "$EXT" && $PY -m pytest -q -p no:cacheprovider tests 2>&1 ) | clean > "$OUT/c12_pytest.txt"
( cd "$EXT" && $PYT -m pytest -q -p no:cacheprovider tests 2>&1 ) | clean > "$OUT/c12_pytest_314t.txt"
{ echo "load before: $(uptime | sed 's/.*load/load/')"; $PY -u c3_convert.py "$OUT/c3_convert.json"; echo "load after: $(uptime | sed 's/.*load/load/')"; } 2>&1 | clean > "$OUT/c3_convert.txt"
for v in 314 314t; do [ $v = 314t ] && P=$PYT || P=$PY
  { echo "load before: $(uptime | sed 's/.*load/load/')"; $P -u c7_gil.py "$OUT/c7_gil_$v.json"; } 2>&1 | clean > "$OUT/c7_gil_$v.txt"; done
{ $PY c9_abi_cost.py; $W/abi_3.14.8/bin/python c9_abi_cost.py; } > "$OUT/c9_abi_cost.jsonl"
mkdir -p $W/alts && cp alts/* $W/alts/ && ( cd $W/alts && $V/cythonize -i -3 -q tok_cy.pyx >/dev/null 2>&1 && $V/mypyc tok_mypyc.py >/dev/null 2>&1 )
{ echo "load before: $(uptime | sed 's/.*load/load/')"; PYTHONPATH=$CODE:$W/alts $PY -u c8_alts.py "$OUT/c8_alts.json"; } 2>&1 | clean > "$OUT/c8_alts.txt"
for s in python percall owned borrowed bytes parallel; do $PY ladder.py $s "$CHAT" > $W/ladder_$s.txt; cmp -s $W/ladder_$s.txt "$ROOT/src/bench/results/expected_200k.txt" && echo "$s: output identical to PROGRAM.md" || echo "$s: OUTPUT DIFFERS"; done > "$OUT/ladder_check.txt"
cp $W/ladder_parallel.txt "$OUT/ladder_output.txt"
{ echo "load before: $(uptime | sed 's/.*load/load/')"
  CMDS=(); for s in python percall owned borrowed bytes parallel; do CMDS+=("$PY ladder.py $s $CHAT"); done
  hyperfine -N --warmup 1 --runs 7 --export-json $W/ladder_hf.json "${CMDS[@]}" 2>&1 | grep -E "Benchmark|Time|Range"
  echo "load after: $(uptime | sed 's/.*load/load/')"; } | clean > "$OUT/ladder_hyperfine.txt"
hyperfine -N --warmup 1 --runs 7 --export-json $W/startup_hf.json "$PY -c 'import tokrs'" > /dev/null 2>&1
python3 -c "import json;r=json.load(open('$W/startup_hf.json'))['results'][0];json.dump({k:r[k] for k in ('median','min','max')},open('$OUT/startup.json','w'))"
python3 -c "import json,sys;d=json.load(open('$W/ladder_hf.json'));json.dump([{'step':r['command'].split()[2],'median':r['median'],'min':r['min'],'max':r['max'],'times':r['times']} for r in d['results']],open('$OUT/ladder_hf.json','w'),indent=1)"
$PY phases.py $PY "$CHAT" "$OUT/ladder_phases.json" > "$OUT/ladder_phases.txt"

{ $PY --version; $PYT -VV | head -1; $MAT --version; rustc --version; cargo --version
  grep -A1 -E '^name = "(pyo3|numpy|rayon|serde_json)"$' "$EXT/Cargo.lock" | grep -v '^--' | paste - - | sed 's/name = //;s/version = //;s/"//g'
  $PY -c "import numpy,numba,Cython,pytest;print('numpy',numpy.__version__,'| numba',numba.__version__,'| Cython',Cython.__version__,'| pytest',pytest.__version__)"
  $V/mypy --version; $PL/pa/venv/bin/ty --version; hyperfine --version; sw_vers -productVersion | sed 's/^/macOS /'; sysctl -n machdep.cpu.brand_string
  uptime | sed 's/.*load/load/'; date -u +%Y-%m-%dT%H:%MZ; } > "$HERE/versions.txt" 2>&1
echo done
