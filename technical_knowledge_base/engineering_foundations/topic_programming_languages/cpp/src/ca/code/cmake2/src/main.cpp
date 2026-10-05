// main.cpp: uses count_tokens; only sees the declaration
#include "tokens.h"
#include <cstdio>

int main() {
    std::printf("%d tokens\n", count_tokens("C++ is fun, x86_64 too"));
}
