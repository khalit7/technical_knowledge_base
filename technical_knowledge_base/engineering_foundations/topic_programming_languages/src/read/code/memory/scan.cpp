// Sum the token counts of 10 million records three ways; same data, different layout.
#include <algorithm>
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <memory>
#include <random>
#include <vector>
struct Record { std::uint32_t user; std::uint64_t tokens; };
template <class F> double best_ms(F f, std::uint64_t& out) {
    double best = 1e30;
    for (int r = 0; r < 5; r++) {
        auto t0 = std::chrono::steady_clock::now();
        asm volatile("" ::: "memory");          // keep the work inside the timed region
        out = f();
        asm volatile("" : : "r"(out) : "memory");
        double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
        best = std::min(best, ms);
    }
    return best;
}
int main() {
    const std::size_t N = 10'000'000;
    std::vector<Record> flat(N);
    for (std::size_t i = 0; i < N; i++) flat[i] = {std::uint32_t(i % 200), 1 + i % 97};
    std::vector<std::unique_ptr<Record>> boxed;        // one heap allocation per record, like Python
    boxed.reserve(N);
    for (std::size_t i = 0; i < N; i++) boxed.push_back(std::make_unique<Record>(flat[i]));
    std::vector<Record*> ptr_in_order(N), ptr_shuffled(N);
    for (std::size_t i = 0; i < N; i++) ptr_in_order[i] = boxed[i].get();
    ptr_shuffled = ptr_in_order;
    std::shuffle(ptr_shuffled.begin(), ptr_shuffled.end(), std::mt19937_64(7));
    std::uint64_t s1, s2, s3;
    double a = best_ms([&] { std::uint64_t s = 0; for (auto& r : flat) s += r.tokens; return s; }, s1);
    double b = best_ms([&] { std::uint64_t s = 0; for (auto* p : ptr_in_order) s += p->tokens; return s; }, s2);
    double c = best_ms([&] { std::uint64_t s = 0; for (auto* p : ptr_shuffled) s += p->tokens; return s; }, s3);
    std::printf("contiguous vector<Record>      %7.1f ms  %5.2f ns/record  sum=%llu\n", a, a * 1e6 / N, (unsigned long long)s1);
    std::printf("pointers, allocation order     %7.1f ms  %5.2f ns/record  sum=%llu\n", b, b * 1e6 / N, (unsigned long long)s2);
    std::printf("pointers, shuffled order       %7.1f ms  %5.2f ns/record  sum=%llu\n", c, c * 1e6 / N, (unsigned long long)s3);
}
