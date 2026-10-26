// When do exceptions cost more than std::expected? Two sweeps over the same tiny parser-like function:
// (1) the fraction of calls that fail, (2) how many stack frames the error crosses before it is handled.
#include <chrono>
#include <cstdio>
#include <expected>
#include <random>
#include <stdexcept>
#include <vector>

__attribute__((noinline)) int f_throw(int i) { if (i < 0) throw std::runtime_error("neg"); return i; }
__attribute__((noinline)) std::expected<int, int> f_exp(int i) { if (i < 0) return std::unexpected(1); return i; }

// The error crosses `d` frames: each level calls the next; only the top handles it.
// The empty asm after each call keeps every frame real (clang would otherwise turn the recursion into a loop).
__attribute__((noinline)) int deep_throw(int d, int i) {
    if (d == 0) return f_throw(i);
    int r = deep_throw(d - 1, i);
    asm volatile("");
    return r + 1;
}
__attribute__((noinline)) std::expected<int, int> deep_exp(int d, int i) {
    if (d == 0) return f_exp(i);
    auto r = deep_exp(d - 1, i);
    asm volatile("");
    if (!r) return r;            // every level checks and passes the error up
    return *r + 1;
}

template <class F> double ns_per(long n, F f) {
    double best = 1e18;
    for (int r = 0; r < 5; ++r) {
        auto t0 = std::chrono::steady_clock::now();
        f();
        double ns = std::chrono::duration<double, std::nano>(std::chrono::steady_clock::now() - t0).count() / n;
        if (ns < best) best = ns;
    }
    return best;
}

volatile long sink;

int main() {
    std::printf("1. failure rate (depth 1): ns per call, best of 5\n");
    std::printf("   %-9s %10s %10s\n", "failing", "exceptions", "expected");
    for (double p : {0.0, 0.0001, 0.001, 0.01, 0.1, 0.5}) {
        long n = p > 0 ? std::min(1'000'000L, std::max(20'000L, (long)(20'000 / p))) : 1'000'000L;
        std::mt19937 rng(7);
        std::bernoulli_distribution fail(p);
        std::vector<int> in(n);
        for (auto& v : in) v = fail(rng) ? -1 : 3;
        double t = ns_per(n, [&] { long s = 0; for (int v : in) { try { s += f_throw(v); } catch (const std::exception&) { ++s; } } sink = s; });
        double e = ns_per(n, [&] { long s = 0; for (int v : in) { auto r = f_exp(v); s += r ? *r : 1; } sink = s; });
        std::printf("   %-9g %10.2f %10.2f\n", p, t, e);
    }
    std::printf("2. depth (frames the error crosses): ns per call, best of 5\n");
    std::printf("   %-6s %12s %12s %12s %12s\n", "depth", "ok:throw", "ok:expected", "fail:throw", "fail:expected");
    for (int d : {1, 4, 16, 64}) {
        const long nok = 2'000'000 / d, nbad = 20'000;
        double ot = ns_per(nok, [&] { long s = 0; for (long i = 0; i < nok; ++i) s += deep_throw(d - 1, 3); sink = s; });
        double oe = ns_per(nok, [&] { long s = 0; for (long i = 0; i < nok; ++i) s += *deep_exp(d - 1, 3); sink = s; });
        double bt = ns_per(nbad, [&] { long s = 0; for (long i = 0; i < nbad; ++i) { try { s += deep_throw(d - 1, -1); } catch (const std::exception&) { ++s; } } sink = s; });
        double be = ns_per(nbad, [&] { long s = 0; for (long i = 0; i < nbad; ++i) { auto r = deep_exp(d - 1, -1); s += r ? *r : 1; } sink = s; });
        std::printf("   %-6d %12.2f %12.2f %12.0f %12.2f\n", d, ot, oe, bt, be);
    }
}
