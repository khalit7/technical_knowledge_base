#include <cstdio>
#include <functional>
#include <vector>

int main() {
    int threshold = 10;
    auto by_value = [threshold](int n) { return n > threshold; };   // copies threshold now
    auto by_ref   = [&threshold](int n) { return n > threshold; };  // refers to the variable
    threshold = 100;
    std::printf("by_value(50)=%d by_ref(50)=%d\n", by_value(50), by_ref(50));

    int calls = 0;
    auto counter = [calls]() mutable { return ++calls; };   // mutable: may change its own copy
    counter(); counter();
    std::printf("counter() -> %d, outer calls still %d\n", counter(), calls);

    auto twice = [](auto x) { return x + x; };              // generic lambda (a template)
    std::printf("twice(21)=%d twice(1.5)=%.1f\n", twice(21), twice(1.5));

    // A lambda is an object of a compiler-written class; its size is its captures
    std::printf("sizeof: no capture %zu, one int %zu, one reference %zu\n",
                sizeof([] {}), sizeof(by_value), sizeof(by_ref));
    std::function<bool(int)> f = by_value;   // type-erased holder: can store any callable
    std::printf("sizeof(std::function) %zu\n", sizeof(f));
}
