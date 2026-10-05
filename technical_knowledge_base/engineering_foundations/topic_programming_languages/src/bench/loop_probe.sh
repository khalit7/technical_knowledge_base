#!/bin/bash
# The token loop alone, compiled two ways, timed on 2,000,000 calls over a 120-byte ASCII string,
# plus the inner loop of each compiler's assembly. Usage: loop_probe.sh <build dir>
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; B="$1"; mkdir -p "$B/probe"
clang++ -O3 -std=c++20 -I"$HERE/ext_cpp" "$HERE/ext_cpp/loop_probe.cpp" -o "$B/probe/loop"
echo "## C++ (Apple clang -O3): the Rosetta comparison (v0) and a case-folding rewrite (v1), ns per byte"
"$B/probe/loop"
cat > "$B/probe/tok.rs" <<'RS'
#[unsafe(no_mangle)]
pub fn tokens(s: &[u8]) -> u64 { let mut n = 0u64; let mut inside = false; for &b in s { let t = b.is_ascii_alphanumeric(); if t && !inside { n += 1; } inside = t; } n }
RS
cat > "$B/probe/tok_main.rs" <<'RS'
use std::time::Instant;
#[inline(never)]
fn tokens(s: &[u8]) -> u64 { let mut n = 0u64; let mut inside = false; for &b in s { let t = b.is_ascii_alphanumeric(); if t && !inside { n += 1; } inside = t; } n }
fn main() { let s = "abc def ghi ".repeat(10); let mut acc = 0u64; let t0 = Instant::now();
  for i in 0..2_000_000usize { acc += tokens(std::hint::black_box(&s.as_bytes()[..s.len() - (i & 1)])); }
  println!("rust {:.2} ns/byte", t0.elapsed().as_nanos() as f64 / 2e6 / s.len() as f64); println!("{acc}"); }
RS
rustc -O "$B/probe/tok_main.rs" -o "$B/probe/tok_main"
if [ -n "${CXX23:-}" ]; then
  $CXX23 -O3 -std=c++20 -I"$HERE/ext_cpp" "$HERE/ext_cpp/loop_probe.cpp" -o "$B/probe/loop23" $F23 2>/dev/null
  echo "## C++ (LLVM clang 23 -O3): same two loops, ns per byte"
  "$B/probe/loop23" | sed 's/^v/c23v/'
fi
echo "## Rust (rustc -O), same loop, ns per byte"
"$B/probe/tok_main"
echo "## C++ inner loop, Apple clang -O2 (bytes loaded per iteration: count the ld1.b lane loads)"
cat > "$B/probe/asm.cpp" <<'CC'
#include "tokens.h"
extern "C" uint64_t tokens_cpp(const char* p, size_t n) { return count_tokens_sv(std::string_view(p, n)); }
CC
clang++ -O2 -std=c++20 -I"$HERE/ext_cpp" -S -o - "$B/probe/asm.cpp" | awk '/Inner Loop Header/{f=1} f&&/^LBB/&&!/Inner/{if(c++)exit} f' | grep -v '^\s*;' | head -70
echo "## Rust inner loop, rustc -O (ldp q = two 16-byte vector loads per iteration)"
rustc -O --crate-type=cdylib --emit asm "$B/probe/tok.rs" -o "$B/probe/tok.s"
awk '/^LBB0_5:/{f=1} f&&/^LBB0_6:/{exit} f' "$B/probe/tok.s" | grep -v '^\s*;' | head -90
echo "## C++ inner loop, scalar form for reading (Apple clang -O2 -fno-vectorize -fno-slp-vectorize -fno-unroll-loops)"
clang++ -O2 -fno-vectorize -fno-slp-vectorize -fno-unroll-loops -std=c++20 -I"$HERE/ext_cpp" -S -o - "$B/probe/asm.cpp" | awk '/Inner Loop Header/{f=1} f&&/b.ne/{print;exit} f' | grep -v '^\s*;'
