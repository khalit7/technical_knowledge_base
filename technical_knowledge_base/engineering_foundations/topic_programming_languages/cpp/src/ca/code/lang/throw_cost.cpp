// What an exception costs: nothing on the path where none is thrown, a lot when one is.
#include <chrono>
#include <cstdio>
#include <expected>
#include <stdexcept>

__attribute__((noinline)) int f_throw(int i) { if (i < 0) throw std::runtime_error("neg"); return i; }
__attribute__((noinline)) std::expected<int, int> f_exp(int i) { if (i < 0) return std::unexpected(1); return i; }

template <class F> double ns_per(int n, F f) {
    double best = 1e18;
    for (int r = 0; r < 5; ++r) {
        auto t0 = std::chrono::steady_clock::now();
        f(n);
        double ns = std::chrono::duration<double, std::nano>(std::chrono::steady_clock::now() - t0).count() / n;
        if (ns < best) best = ns;
    }
    return best;
}

int main() {
    volatile long sink = 0;
    double ok_t = ns_per(10'000'000, [&](int n) { long s = 0; for (int i = 0; i < n; ++i) s += f_throw(i); sink = s; });
    double ok_e = ns_per(10'000'000, [&](int n) { long s = 0; for (int i = 0; i < n; ++i) s += *f_exp(i); sink = s; });
    double bad_t = ns_per(100'000, [&](int n) { long s = 0; for (int i = 0; i < n; ++i) { try { s += f_throw(-1); } catch (const std::exception&) { ++s; } } sink = s; });
    double bad_e = ns_per(100'000, [&](int n) { long s = 0; for (int i = 0; i < n; ++i) { auto r = f_exp(-1); s += r ? *r : 1; } sink = s; });
    std::printf("success path:  exception-style %.2f ns/call, expected-style %.2f ns/call\n", ok_t, ok_e);
    std::printf("failure path:  throw+catch %.0f ns/call, expected %.2f ns/call\n", bad_t, bad_e);
    (void)sink;
}
