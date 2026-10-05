# Toolchains used by the Reading's code (all inside the session scratchpad; see ../README or versions.txt)
PL=/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl
export RUSTUP_HOME=$PL/rust/rustup CARGO_HOME=$PL/rust/cargo
export PATH=$PL/rust/cargo/bin:$PL/ts/node_modules/.bin:$PL/bin:$PATH
PY=$PL/py/cpython-3.14.8-macos-aarch64-none/bin/python3.14
PYT=$PL/py/cpython-3.14.8+freethreaded-macos-aarch64-none/bin/python3.14t
# Apple's Command Line Tools clang 17 with the macOS 26 SDK (the /usr/bin/clang++ shim points at an older Xcode, clang 14)
CXX="/Library/Developer/CommandLineTools/usr/bin/clang++ -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk"
# LLVM 23.1.2 release build (for AddressSanitizer / ThreadSanitizer: Apple clang 17's ASan runtime hangs at start-up on macOS 27)
LLVM=$PL/llvm
CXXSAN="$LLVM/bin/clang++ -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk"
# run a command with a time limit (no coreutils timeout on macOS): to 20 cmd args
to() { t=$1; shift; perl -e 'alarm shift; exec @ARGV' "$t" "$@"; }
