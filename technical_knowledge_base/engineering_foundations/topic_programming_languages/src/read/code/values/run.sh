#!/bin/sh
# What does "b = a" mean? Python and TS share, C++ copies, Rust moves.
. ../env.sh
mkdir -p out
$PY alias.py > out/py.txt 2>&1
node alias.ts > out/ts.txt 2>&1
$CXX -std=c++20 alias.cpp -o out/alias_cpp && ./out/alias_cpp > out/cpp.txt 2>&1
rustc --edition 2024 alias.rs -o out/alias_rs > out/rust.txt 2>&1; echo "exit $?" >> out/rust.txt
