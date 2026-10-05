#!/bin/sh
# "Anything that can count its tokens": Protocol, structural interface, trait, concept.
. ../env.sh
mkdir -p out
$PY shape.py > out/py.txt 2>&1; echo "exit $?" >> out/py.txt
node shape.ts > out/ts.txt 2>&1
rustc --edition 2024 shape.rs -o out/shape_rs > out/rust.txt 2>&1; echo "exit $?" >> out/rust.txt
$CXX -std=c++20 shape.cpp -o out/shape_cpp > out/cpp.txt 2>&1; echo "exit $?" >> out/cpp.txt
