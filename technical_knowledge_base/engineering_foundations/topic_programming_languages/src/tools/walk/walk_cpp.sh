. ../tools_research/env.sh; . ./rec.sh
W=$PL/tools_walk/cpp; rm -rf $W; mkdir -p $W/hello_tokens/src $W/hello_tokens/tests; cd $W/hello_tokens
export TRANSCRIPT=$PL/tools_walk/cpp.txt; : > $TRANSCRIPT
rec "clang++ --version | head -2; cmake --version | head -1; ninja --version"
cat > CMakeLists.txt <<'C'
cmake_minimum_required(VERSION 3.28)
project(hello_tokens LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)  # compile_commands.json for clang-tidy and editors

add_library(tokens src/tokens.cpp)
target_include_directories(tokens PUBLIC src)
target_compile_options(tokens PRIVATE -Wall -Wextra)

add_executable(hello_tokens src/main.cpp)
target_link_libraries(hello_tokens PRIVATE tokens)

enable_testing()
add_executable(test_tokens tests/test_tokens.cpp)
target_link_libraries(test_tokens PRIVATE tokens)
add_test(NAME count_tokens COMMAND test_tokens)
C
cat > src/tokens.hpp <<'C'
#pragma once
#include <string_view>

// Count runs of ASCII letters or digits.
int count_tokens(std::string_view text);
C
cat > src/tokens.cpp <<'C'
#include "tokens.hpp"

static bool is_alnum_ascii(char c) {
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
}

int count_tokens(std::string_view text) {
  int n = 0;
  bool in_token = false;
  for (char c : text) {
    bool a = is_alnum_ascii(c);
    if (a && !in_token) ++n;
    in_token = a;
  }
  return n;
}
C
cat > src/main.cpp <<'C'
#include <iostream>
#include "tokens.hpp"

int main() {
  std::cout << count_tokens("Hello from hello-tokens, x86_64 café!") << "\n";
}
C
cat > tests/test_tokens.cpp <<'C'
#include <cstdio>
#include "tokens.hpp"

int main() {
  if (count_tokens("x86_64 café") != 3) {
    std::puts("FAIL: expected 3");
    return 1;
  }
  std::puts("ok");
  return 0;
}
C
echo "## files written by hand (C++ has no project generator in the toolchain)" >> $TRANSCRIPT; tree_list . >> $TRANSCRIPT; echo >> $TRANSCRIPT
rec "cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug"
rec "cmake --build build"
echo "## files in build/ (top level)" >> $TRANSCRIPT; ls build >> $TRANSCRIPT; echo >> $TRANSCRIPT
rec "./build/hello_tokens"
rec "ctest --test-dir build"
rec "clang-format --style=LLVM --dry-run src/*.cpp src/*.hpp tests/*.cpp 2>&1 | head -12"
