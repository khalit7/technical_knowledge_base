#include <climits>
#include <cstdio>

// "Will adding 1 overflow?" written the way you would in Python
__attribute__((noinline)) bool will_overflow(int x) {
    return x + 1 < x;   // signed overflow is UB, so the compiler may assume x + 1 > x
}

int main() {
    std::printf("will_overflow(INT_MAX) = %d\n", will_overflow(INT_MAX));
}
