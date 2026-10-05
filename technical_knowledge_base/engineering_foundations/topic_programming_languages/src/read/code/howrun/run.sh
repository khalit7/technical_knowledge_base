#!/bin/sh
# Regenerate every output used by the "How code runs" section. Run from this folder: sh run.sh
. ../env.sh
set -e
mkdir -p out
$PY dis_tokens.py > out/py_dis.txt
$CXX -std=c++20 -O2 -S -fno-asynchronous-unwind-tables tokens.cpp -o out/cpp_O2.s
rustc --edition 2024 --crate-type=lib -C opt-level=3 --emit asm -o out/rust_O3.s tokens.rs
rustc --edition 2024 --crate-type=lib -C opt-level=0 --emit asm -o out/rust_O0.s tokens.rs
cp tokens.ts out/tokens.ts
tsc --target es2023 --outDir out tokens.ts || true
node --print-bytecode --print-bytecode-filter=countTokens out/tokens.js > out/v8_bytecode.txt 2>&1
node --trace-opt --trace-deopt out/tokens.js > out/v8_trace_opt.txt 2>&1
node out/tokens.ts > out/node_strip_run.txt 2>&1 || true
{ echo "python $($PY --version)"; $CXX --version | head -1; rustc --version; echo "tsc $(tsc --version)"; echo "node $(node --version)"; uname -m; } > out/versions.txt
