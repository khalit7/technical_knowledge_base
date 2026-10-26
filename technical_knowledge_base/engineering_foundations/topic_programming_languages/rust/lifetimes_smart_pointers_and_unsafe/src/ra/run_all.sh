#!/bin/sh
# Reproduces every output shown on "Rust: lifetimes, smart pointers, threads and unsafe".
# Usage: sh src/ra/run_all.sh   (needs the toolchains listed in versions.txt; RUSTUP_HOME and CARGO_HOME may point at an
# existing install; PL is the scratch folder, default $TMPDIR/pl). The Miri step needs the nightly toolchain with miri.
. "$(dirname "$0")/lib.sh"
fresh
for s in "$HERE"/steps/*.sh; do . "$s"; done
