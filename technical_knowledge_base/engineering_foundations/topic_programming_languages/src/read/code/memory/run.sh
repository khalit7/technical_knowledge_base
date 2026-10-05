#!/bin/sh
# Memory layout of a small list of records, and the cost of pointer-chasing over 10 million of them.
. ../env.sh
mkdir -p out
$PY layout.py > out/py_layout.txt
$CXX -std=c++20 -O2 layout.cpp -o out/layout_cpp && ./out/layout_cpp > out/cpp_layout.txt
rustc --edition 2024 -O layout.rs -o out/layout_rs && ./out/layout_rs > out/rust_layout.txt
$CXX -std=c++20 -O2 scan.cpp -o out/scan_cpp && ./out/scan_cpp > out/cpp_scan.txt
$PY scan.py > out/py_scan.txt
sysctl -n hw.cachelinesize > out/cacheline.txt; sysctl -n machdep.cpu.brand_string >> out/cacheline.txt
sysctl -n hw.l1dcachesize hw.l2cachesize >> out/cacheline.txt
