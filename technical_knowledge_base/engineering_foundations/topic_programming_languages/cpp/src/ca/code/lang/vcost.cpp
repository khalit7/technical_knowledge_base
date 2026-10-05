// Cost of a virtual call: the same sum computed three ways over 10 million objects.
#include <chrono>
#include <cstdio>
#include <memory>
#include <vector>

struct Shape { virtual long area() const = 0; virtual ~Shape() = default; };
struct Sq : Shape { long s; explicit Sq(long v) : s(v) {} long area() const override { return s * s; } };
struct SqPlain { long s; long area() const { return s * s; } };   // no virtual

template <class F> double best_ms(F f) {
    double best = 1e9;
    for (int r = 0; r < 7; ++r) {
        auto t0 = std::chrono::steady_clock::now();
        f();
        double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
        if (ms < best) best = ms;
    }
    return best;
}

int main() {
    const int N = 10'000'000;
    std::vector<std::unique_ptr<Shape>> virt;     // (a) heap objects, virtual call
    std::vector<std::unique_ptr<SqPlain>> boxed;  // (b) heap objects, ordinary call
    std::vector<SqPlain> flat;                    // (c) contiguous values, ordinary call
    for (int i = 0; i < N; ++i) {
        virt.push_back(std::make_unique<Sq>(i % 7));
        boxed.push_back(std::make_unique<SqPlain>(SqPlain{i % 7}));
        flat.push_back({i % 7});
    }
    volatile long sink;
    double a = best_ms([&] { long s = 0; for (auto& p : virt) s += p->area(); sink = s; });
    double b = best_ms([&] { long s = 0; for (auto& p : boxed) s += p->area(); sink = s; });
    double c = best_ms([&] { long s = 0; for (auto& q : flat) s += q.area(); sink = s; });
    std::printf("(a) virtual call, objects behind pointers:  %.2f ns per object\n", a * 1e6 / N);
    std::printf("(b) ordinary call, objects behind pointers: %.2f ns per object\n", b * 1e6 / N);
    std::printf("(c) ordinary call, objects in a flat vector: %.2f ns per object\n", c * 1e6 / N);
    (void)sink;
}
