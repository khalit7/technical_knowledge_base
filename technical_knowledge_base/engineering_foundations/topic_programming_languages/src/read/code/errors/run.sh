#!/bin/sh
# Nothingness (a missing key) and error handling (a bad line) in four languages.
. ../env.sh
mkdir -p out
$PY missing.py > out/py_missing.txt 2>&1; echo "exit $?" >> out/py_missing.txt
$CXX -std=c++20 missing.cpp -o out/missing_cpp && ./out/missing_cpp > out/cpp_missing.txt 2>&1
rustc --edition 2024 missing.rs -o out/missing_rs > out/rust_missing.txt 2>&1; echo "exit $?" >> out/rust_missing.txt
tsc --noEmit --strict --target es2023 --lib es2023 --typeRoots $PL/ts/node_modules/@types --types node missing.ts > out/ts_missing_tsc.txt 2>&1; echo "exit $?" >> out/ts_missing_tsc.txt
node missing.ts > out/ts_missing_run.txt 2>&1; echo "exit $?" >> out/ts_missing_run.txt
$PY parse_line.py > out/py_parse.txt 2>&1
$CXX -std=c++23 -O0 parse_line.cpp -o out/parse_cpp > out/cpp_parse_compile.txt 2>&1 && ./out/parse_cpp > out/cpp_parse.txt 2>&1
# the Rust version needs serde: build it inside a scratch cargo project that reuses the Rosetta crate's lock file
R=$PL/../rd/parse_line_rs; mkdir -p $R/src; cp parse_line.rs $R/src/main.rs
printf '[package]\nname = "parse_line"\nversion = "0.1.0"\nedition = "2024"\n[dependencies]\nserde = { version = "1", features = ["derive"] }\nserde_json = "1"\n' > $R/Cargo.toml
(cd $R && cargo run -q > out.txt 2>&1); cp $R/out.txt out/rust_parse.txt
