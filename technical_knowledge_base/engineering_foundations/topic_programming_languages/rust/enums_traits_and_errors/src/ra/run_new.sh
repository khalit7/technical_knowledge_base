#!/bin/sh
# The two recordings added on 2026-11-07 for the 3D stages (enum layout, lazy chain trace).
# They use whatever rustc is on PATH (not the pinned 1.99.0 of versions.txt) and print its version and the platform
# in the recorded command; enum layout is not a stable guarantee, so the platform is part of the result.
# Usage: sh src/ra/run_new.sh   (a few seconds; works in a temporary folder, writes out/l_layout.txt and out/l_lazy.txt)
HERE=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d) || exit 1
cp "$HERE/code/lang/layout.rs" "$HERE/code/lang/lazy.rs" "$T/"
for p in layout lazy; do
  cmd="rustc --version && uname -sm && rustc --edition 2024 $p.rs && ./$p"
  ( cd "$T" && { printf '$ %s\n' "$cmd"; sh -c "$cmd" 2>&1; rc=$?; [ $rc -ne 0 ] && printf '[exit code %s]\n' "$rc"; true; } ) > "$HERE/out/l_$p.txt"
  echo "recorded l_$p ($(wc -l < "$HERE/out/l_$p.txt") lines)"
done
rm -rf "$T"
