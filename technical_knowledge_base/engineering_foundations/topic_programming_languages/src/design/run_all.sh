#!/bin/bash
# Re-run every snippet under code/ and rewrite outputs/ and versions.txt. Usage: bash run_all.sh [pattern]
cd "$(dirname "$0")"
PL=${PL:-${TMPDIR:-/tmp}/pl}
mkdir -p "$PL/../dsw"
find code -type f ! -name '*__*' ! -name '.*' | grep -E "${1:-.}" | sort | xargs -P 4 -n 1 bash run_one.sh
export RUSTUP_HOME=$PL/rust/rustup CARGO_HOME=$PL/rust/cargo UV_CACHE_DIR=$PL/uvcache
{ echo "Toolchains used for every output in outputs/ (run $(date -u +%Y-%m-%d))"
  echo "python: $($PL/py/cpython-3.14.8-macos-aarch64-none/bin/python3.14 --version 2>&1) (uv-managed CPython)"
  echo "ty: $($PL/bin/uvx ty@0.0.84 --version 2>&1 | tail -1)"
  echo "mypy: $($PL/bin/uvx mypy==2.4.0 --version 2>&1 | tail -1)"
  echo "clang++: $(/Library/Developer/CommandLineTools/usr/bin/clang++ --version | head -1), libc++ from MacOSX26.sdk, -std=c++23"
  echo "rustc: $($PL/rust/cargo/bin/rustc --version)"
  echo "node: $(node --version) (runs .ts files by stripping types)"
  echo "tsc: $($PL/ts/node_modules/.bin/tsc --version) (typescript npm package, native compiler)"
  echo "ruff: $($PL/bin/uvx ruff@0.16.10 --version 2>&1 | tail -1); clippy: $($PL/rust/cargo/bin/clippy-driver --version 2>&1)"
  echo "zod: $(node -p 'require("'$PL'/ds_node/node_modules/zod/package.json").version')"
  echo "os: $(uname -sm) $(sw_vers -productVersion 2>/dev/null)"
} > versions.txt
cat versions.txt
