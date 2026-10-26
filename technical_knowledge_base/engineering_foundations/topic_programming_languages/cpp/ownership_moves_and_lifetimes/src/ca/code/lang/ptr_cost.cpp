// What an owner costs per call: the same function called 100 million times with the object passed
// as a raw pointer, a const unique_ptr&, a const shared_ptr&, and a shared_ptr by value (a copy: two atomic
// count updates). Then 4 threads copying one shared_ptr at once, all updating the same count.
// noinline plus an empty asm statement with a memory clobber keep every call real (without them clang hoisted
// the read-only calls out of the loop and printed 0.00 ns); best of 5 runs; ns per call.
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <memory>
#include <thread>
#include <vector>

#define NOINLINE __attribute__((noinline))
#define KEEP asm volatile("" ::: "memory")
NOINLINE long by_raw(const int* p) { KEEP; return *p; }
NOINLINE long by_uref(const std::unique_ptr<int>& p) { KEEP; return *p; }
NOINLINE long by_sref(const std::shared_ptr<int>& p) { KEEP; return *p; }
NOINLINE long by_sval(std::shared_ptr<int> p) { KEEP; return *p; }

constexpr long N = 100'000'000;
volatile long sink;

template <class F> double best_ns(F f) {
    double best = 1e30;
    for (int r = 0; r < 5; ++r) {
        auto t0 = std::chrono::steady_clock::now();
        long s = 0;
        for (long i = 0; i < N; ++i) s += f();
        sink = s;
        double ns = std::chrono::duration<double, std::nano>(std::chrono::steady_clock::now() - t0).count() / N;
        if (ns < best) best = ns;
    }
    return best;
}

int main() {
    double load[1];
    getloadavg(load, 1);
    std::printf("load average %.2f\n", load[0]);
    auto u = std::make_unique<int>(1);
    auto s = std::make_shared<int>(1);
    std::printf("raw pointer              %.2f ns per call\n", best_ns([&] { return by_raw(u.get()); }));
    std::printf("const unique_ptr&        %.2f ns per call\n", best_ns([&] { return by_uref(u); }));
    std::printf("const shared_ptr&        %.2f ns per call\n", best_ns([&] { return by_sref(s); }));
    std::printf("shared_ptr by value      %.2f ns per call\n", best_ns([&] { return by_sval(s); }));
    // 4 threads, each passing the same shared_ptr by value: the count's cache line moves between cores
    for (int threads : {1, 4}) {
        double best = 1e30;
        for (int r = 0; r < 5; ++r) {
            std::vector<std::thread> ts;
            std::atomic<int> ready{0};
            auto t0 = std::chrono::steady_clock::now();
            for (int t = 0; t < threads; ++t)
                ts.emplace_back([&] {
                    ready++;
                    while (ready < threads) {}
                    long acc = 0;
                    for (long i = 0; i < N / 10; ++i) acc += by_sval(s);
                    sink = acc;
                });
            for (auto& t : ts) t.join();
            double ns = std::chrono::duration<double, std::nano>(std::chrono::steady_clock::now() - t0).count() / (N / 10);
            if (ns < best) best = ns;
        }
        std::printf("by value, %d thread%s on one shared_ptr: %.2f ns per call per thread\n", threads, threads > 1 ? "s" : " ", best);
    }
}
