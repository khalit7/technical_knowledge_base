// flags: -O2
#include <climits>
#include <cstdio>
bool bigger(int x) { return x + 1 > x; }   // signed overflow is UB: the compiler may assume true
int main(int argc, char**) {
    int m = INT_MAX - 1 + argc;             // INT_MAX, known only at run time
    std::printf("bigger(INT_MAX) = %d\n", bigger(m));
    std::printf("%d %d %u\n", -7 / 2, -7 % 2, 0u - 1);  // truncation; unsigned wraps (defined)
}
