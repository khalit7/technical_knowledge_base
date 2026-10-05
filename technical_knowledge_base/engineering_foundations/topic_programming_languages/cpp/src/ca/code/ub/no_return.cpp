#include <cstdio>

__attribute__((noinline)) int sign(int x) {
    if (x > 0) return 1;
    if (x < 0) return -1;
    // forgot: return 0;   flowing off the end of a non-void function is UB
}

int main() { std::printf("sign(0) = %d\n", sign(0)); }
