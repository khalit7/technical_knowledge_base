#!/bin/sh
# Same dangling-reference bug in C++, Rust and Python. Outputs in out/. Run: sh run.sh
. ../env.sh
mkdir -p out
$CXX -std=c++20 -O0 -g dangle.cpp -o out/dangle_plain && to 20 ./out/dangle_plain > out/cpp_plain.txt 2>&1; echo "exit $?" >> out/cpp_plain.txt
MallocScribble=1 to 20 ./out/dangle_plain > out/cpp_scribble.txt 2>&1; echo "exit $?" >> out/cpp_scribble.txt
if [ -x "$LLVM/bin/clang++" ]; then
  $CXXSAN -std=c++20 -O1 -g -fsanitize=address -fno-omit-frame-pointer dangle.cpp -o out/dangle_asan && to 60 ./out/dangle_asan > out/cpp_asan.txt 2>&1; echo "exit $?" >> out/cpp_asan.txt
fi
rustc --edition 2024 dangle.rs -o out/dangle_rs > out/rust_compile.txt 2>&1; echo "exit $?" >> out/rust_compile.txt
$PY dangle.py > out/py.txt 2>&1; echo "exit $?" >> out/py.txt
