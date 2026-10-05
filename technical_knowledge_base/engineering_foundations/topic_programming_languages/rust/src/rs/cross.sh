#!/bin/zsh
# Cross-compile tokserve for Linux from this Mac: a fully static musl binary, linked with the
# rust-lld linker that ships with rustup (no C toolchain or Docker needed for a pure-Rust crate).
set -u
HERE=${0:A:h}; . $HERE/code/env.sh
cd $HERE/code/tok
for tgt in aarch64-unknown-linux-musl x86_64-unknown-linux-musl; do
  print "\$ cargo build --release --bin tokserve --target $tgt"
  CARGO_TARGET_DIR=$P/rs/tgt_cross RUSTFLAGS="-C linker=rust-lld" cargo build --release --bin tokserve --target $tgt 2>&1 | grep -v Compiling | tail -2
  f=$P/rs/tgt_cross/$tgt/release/tokserve
  print "\$ file tokserve"; file -b $f | sed 's/, BuildID\[[^]]*\]=[0-9a-f]*//'
  print "size: $(stat -f %z $f) bytes"
  print
done
print "\$ file target/release/tokserve   (the macOS build, for comparison)"
file -b $CARGO_TARGET_DIR/release/tokserve
print "\$ otool -L target/release/tokserve"
otool -L $CARGO_TARGET_DIR/release/tokserve | tail -n +2 | sed 's/^[[:space:]]*/  /'
