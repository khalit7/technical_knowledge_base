#include <cstdio>

__attribute__((noinline)) void report(bool flag) {
    bool seen;                 // never initialised when flag is false
    if (flag) seen = true;
    if (seen) std::printf("seen\n");
    if (!seen) std::printf("not seen\n");
    std::printf("done\n");
}

int main() { report(false); }
