#include <cstdio>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> counts{12, 0, 7, 31, 0, 5, 18};
    // A lazy pipeline: nothing runs until the loop pulls values (like a Python generator)
    auto pipeline = counts
        | std::views::filter([](int n) { std::printf("  filter %d\n", n); return n > 0; })
        | std::views::transform([](int n) { std::printf("  square %d\n", n); return n * n; })
        | std::views::take(2);
    std::printf("pipeline built, nothing computed yet\n");
    for (int x : pipeline) std::printf("got %d\n", x);

    // C++23: collect into a container, like list(...) in Python
    auto evens = std::views::iota(1, 11)
               | std::views::filter([](int n) { return n % 2 == 0; })
               | std::ranges::to<std::vector>();
    std::printf("evens: %zu values, last %d\n", evens.size(), evens.back());
}
