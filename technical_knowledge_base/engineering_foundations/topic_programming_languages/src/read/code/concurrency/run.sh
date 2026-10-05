#!/bin/sh
# Same shared counter from four threads in Python (GIL and free-threaded), JavaScript, C++ and Rust.
. ../env.sh
mkdir -p out
: > out/py.txt
for i in 1 2 3; do $PY counter.py >> out/py.txt; done
for i in 1 2 3; do $PYT counter.py >> out/py.txt; done
for i in 1 2 3; do PYTHON_GIL=0 $PYT -X gil=0 counter.py >> out/py_t.txt 2>&1; done
$PY counter_lock.py > out/py_lock.txt; $PYT counter_lock.py >> out/py_lock.txt
node counter_async.mjs > out/js_async.txt
for i in 1 2 3; do node counter_workers.mjs >> out/js_workers.txt; done
$CXX -std=c++20 -O0 counter.cpp -o out/counter_O0 && for i in 1 2 3; do ./out/counter_O0; done > out/cpp_O0.txt
$CXX -std=c++20 -O2 counter.cpp -o out/counter_O2 && for i in 1 2 3; do ./out/counter_O2; done > out/cpp_O2.txt
$CXX -std=c++20 -O2 counter_atomic.cpp -o out/counter_atomic && ./out/counter_atomic > out/cpp_atomic.txt
if [ -x "$LLVM/bin/clang++" ]; then
  $CXXSAN -std=c++20 -O1 -g -fsanitize=thread counter.cpp -o out/counter_tsan && to 120 ./out/counter_tsan > out/cpp_tsan.txt 2>&1; echo "exit $?" >> out/cpp_tsan.txt
fi
rustc --edition 2024 counter_bad.rs -o out/counter_bad > out/rust_bad.txt 2>&1; echo "exit $?" >> out/rust_bad.txt
rustc --edition 2024 -O counter_ok.rs -o out/counter_ok && ./out/counter_ok > out/rust_ok.txt
nproc 2>/dev/null || sysctl -n hw.ncpu > out/ncpu.txt
