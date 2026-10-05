#!/bin/sh
# Reading past the end of a list: four answers.
. ../env.sh
mkdir -p out
$PY oob.py > out/py.txt 2>&1; echo "exit $?" >> out/py.txt
node oob.ts > out/ts.txt 2>&1; echo "exit $?" >> out/ts.txt
tsc --noEmit --strict --noUncheckedIndexedAccess --target es2023 --lib es2023 --typeRoots $PL/ts/node_modules/@types --types node oob.ts > out/ts_tsc_unchecked.txt 2>&1; echo "exit $?" >> out/ts_tsc_unchecked.txt
$CXX -std=c++20 -O0 oob.cpp -o out/oob_cpp && ./out/oob_cpp > out/cpp.txt 2>&1; echo "exit $?" >> out/cpp.txt
$CXXSAN -std=c++20 -O0 -g -fsanitize=address oob.cpp -o out/oob_asan && to 30 ./out/oob_asan > out/cpp_asan.txt 2>&1; echo "exit $?" >> out/cpp_asan.txt
rustc --edition 2024 oob.rs -o out/oob_rs && ./out/oob_rs > out/rust.txt 2>&1; echo "exit $?" >> out/rust.txt
