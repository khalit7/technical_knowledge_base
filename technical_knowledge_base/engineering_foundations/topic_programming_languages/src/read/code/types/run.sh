#!/bin/sh
# The same wrong call, count_tokens(42), in four languages: when is it caught?
. ../env.sh
mkdir -p out
$PY wrong.py > out/py_run.txt 2>&1; echo "exit $?" >> out/py_run.txt
uvx --python $PY mypy@2.4.0 --strict wrong.py > out/py_mypy.txt 2>&1; echo "exit $?" >> out/py_mypy.txt
uvx --python $PY ty@0.0.84 check wrong.py > out/py_ty.txt 2>&1; echo "exit $?" >> out/py_ty.txt
tsc --noEmit --strict --target es2023 --lib es2023 --typeRoots $PL/ts/node_modules/@types --types node wrong.ts > out/ts_tsc.txt 2>&1; echo "exit $?" >> out/ts_tsc.txt
node wrong.ts > out/ts_node_run.txt 2>&1; echo "exit $?" >> out/ts_node_run.txt
$CXX -std=c++20 wrong.cpp -o out/wrong_cpp > out/cpp_compile.txt 2>&1; echo "exit $?" >> out/cpp_compile.txt
rustc --edition 2024 wrong.rs -o out/wrong_rs > out/rust_compile.txt 2>&1; echo "exit $?" >> out/rust_compile.txt
