constexpr long fib(int n) {
    long a = 0, b = 1;
    for (int i = 0; i < n; i++) { long t = a + b; a = b; b = t; }
    return a;
}
static_assert(fib(10) == 55);     // the compiler runs fib: passes
static_assert(fib(90) == 0);      // the compiler runs fib: fails, and says why
int main() {}
