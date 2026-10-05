#include <cstdio>
#include <functional>

std::function<int()> make_counter() {
    int count = 0;
    return [&count] { return ++count; };   // captures a local by reference
}                                           // count dies here

int main() {
    auto next = make_counter();
    next();
    std::printf("next() = %d\n", next());
}
