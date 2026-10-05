#!/bin/sh
# Integers, division, floats and text in four languages.
. ../env.sh
mkdir -p out
$PY nums.py > out/py.txt 2>&1
node nums.ts > out/ts.txt 2>&1
$CXX -std=c++20 -O2 nums.cpp -o out/nums_cpp && ./out/nums_cpp > out/cpp_O2.txt 2>&1
$CXXSAN -std=c++20 -O0 -fsanitize=undefined nums.cpp -o out/nums_ubsan && ./out/nums_ubsan > out/cpp_ubsan.txt 2>&1
rustc --edition 2024 nums.rs -o out/nums_debug && ./out/nums_debug > out/rust_debug.txt 2>&1; echo "exit $?" >> out/rust_debug.txt
rustc --edition 2024 -O nums.rs -o out/nums_release && ./out/nums_release > out/rust_release.txt 2>&1; echo "exit $?" >> out/rust_release.txt
rustc --edition 2024 index.rs -o out/index_rs > out/rust_index.txt 2>&1; echo "exit $?" >> out/rust_index.txt
