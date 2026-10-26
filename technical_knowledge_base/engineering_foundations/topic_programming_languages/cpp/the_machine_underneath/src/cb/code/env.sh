# Toolchains for Part 2 (all in the session scratchpad, nothing system-wide)
PL=${PL:-${TMPDIR:-/tmp}/pl}
B=$PL/cb            # build products and big files stay here, never in the repo
SDK=/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk
# Apple clang 17 from the Command Line Tools (the default /usr/bin/clang++ is an older clang 14)
CXX="/Library/Developer/CommandLineTools/usr/bin/clang++ -isysroot $SDK -std=c++23"
# LLVM clang 23.1.2 (ThreadSanitizer works with it on macOS 27; Apple's does not start)
CXXSAN="$PL/llvm/bin/clang++ -isysroot $SDK -std=c++23"
export PATH=$PL/bin:$PATH
