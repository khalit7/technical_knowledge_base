// What a call costs, by how it is dispatched: the same "sum of areas" over 10 million shapes,
// written eight ways. Each pass visits every object once (no repeated pattern for the branch
// predictor to learn). Objects behind pointers are measured twice: in allocation order (the
// heap hands out neighbouring addresses) and allocated in a shuffled order (scattered in memory).
#include <algorithm>
#include <chrono>
#include <cstdio>
#include <functional>
#include <memory>
#include <random>
#include <variant>
#include <vector>

// Run-time polymorphism: a base class with a virtual function
struct Shape { virtual long area() const = 0; virtual ~Shape() = default; };
struct Sq   : Shape { long a;    explicit Sq(long x) : a(x) {}             long area() const override { return a * a; } };
struct Rect : Shape { long a, b; Rect(long x, long y) : a(x), b(y) {}      long area() const override { return a * b; } };
struct Tri  : Shape { long a, b; Tri(long x, long y) : a(x), b(y) {}       long area() const override { return a * b / 2; } };
struct SqFinal final : Shape { long a; explicit SqFinal(long x) : a(x) {}  long area() const override { return a * a; } };

// Compile-time alternatives: plain structs, and a closed set of types in a std::variant
struct PSq   { long a;    long area() const { return a * a; } };
struct PRect { long a, b; long area() const { return a * b; } };
struct PTri  { long a, b; long area() const { return a * b / 2; } };
using AnyShape = std::variant<PSq, PRect, PTri>;

const int N = 10'000'000;
volatile long sink;

template <class F> double best_ns(F pass) {
    double best = 1e18;
    for (int r = 0; r < 7; ++r) {
        auto t0 = std::chrono::steady_clock::now();
        pass();
        double ns = std::chrono::duration<double, std::nano>(std::chrono::steady_clock::now() - t0).count() / N;
        if (ns < best) best = ns;
    }
    return best;
}
template <class V> double sum_ptrs(const V& v) { return best_ns([&] { long s = 0; for (auto& p : v) s += p->area(); sink = s; }); }

std::vector<int> kind(N), xs(N), ys(N);

// A row for objects behind pointers. Position k of the vector is always visited k-th, so the order of
// classes is the same in both columns; only the allocation order differs. Allocated in visiting order,
// neighbours get neighbouring addresses; allocated in a shuffled order, they are scattered.
template <class Create> double ptr_pass(Create create, bool scatter) {
    std::vector<int> order(N);
    for (int i = 0; i < N; ++i) order[i] = i;
    if (scatter) std::shuffle(order.begin(), order.end(), std::mt19937(1));
    std::vector<decltype(create(0))> v(N);
    for (int k : order) v[k] = create(k);
    return sum_ptrs(v);
}
template <class Create> void ptr_row(const char* label, Create create) {
    double in_order = ptr_pass(create, false);
    double scattered = ptr_pass(create, true);
    std::printf("  %-28s %6.2f %10.2f\n", label, in_order, scattered);
}
void flat_row(const char* label, double t) { std::printf("  %-28s %6.2f %10s\n", label, t, "(flat)"); }

int main() {
    std::mt19937 rng(42);
    for (int i = 0; i < N; ++i) { kind[i] = rng() % 3; xs[i] = 1 + rng() % 7; ys[i] = 1 + rng() % 7; }
    auto mixed = [](int i) -> std::unique_ptr<Shape> {
        if (kind[i] == 0) return std::make_unique<Sq>(xs[i]);
        if (kind[i] == 1) return std::make_unique<Rect>(xs[i], ys[i]);
        return std::make_unique<Tri>(xs[i], ys[i]);
    };
    std::printf("10 million objects, one pass each, best of 7: ns per object\n");
    std::printf("  %-28s %6s %10s\n", "dispatch", "order", "scattered");
    std::vector<int> by_class(N);   // visiting order for row 3: positions sorted by class
    for (int i = 0; i < N; ++i) by_class[i] = i;
    std::stable_sort(by_class.begin(), by_class.end(), [](int a, int b) { return kind[a] < kind[b]; });
    // 1. virtual call, one class only: the target never changes, so the predictor gets it right
    ptr_row("virtual, one class", [](int k) -> std::unique_ptr<Shape> { return std::make_unique<Sq>(xs[k]); });
    // 2. virtual call, three classes in random order: the target is unpredictable
    ptr_row("virtual, 3 classes mixed", [&](int k) { return mixed(k); });
    // 3. the same objects, visited sorted by class: predictable again
    ptr_row("virtual, 3 classes sorted", [&](int k) { return mixed(by_class[k]); });
    // 4. final class, called through its own type: the compiler devirtualises and inlines
    ptr_row("final class, devirtualised", [](int k) { return std::make_unique<SqFinal>(xs[k]); });
    // 5. plain struct behind a pointer: an ordinary, inlinable call, no vtable
    ptr_row("plain struct, pointers", [](int k) { return std::make_unique<PSq>(PSq{xs[k]}); });
    {   // 6. std::function per element: type-erased (small lambdas stored inside it), an indirect call
        std::vector<std::function<long()>> v;
        for (int i = 0; i < N; ++i) {
            long a = xs[i], b = ys[i];
            if (kind[i] == 0) v.push_back([a] { return a * a; });
            else if (kind[i] == 1) v.push_back([a, b] { return a * b; });
            else v.push_back([a, b] { return a * b / 2; });
        }
        flat_row("std::function, 3 mixed", best_ns([&] { long s = 0; for (auto& f : v) s += f(); sink = s; }));
    }
    {   // 7. std::variant in a flat vector, std::visit: a closed set of types, no heap, no vtable
        std::vector<AnyShape> v;
        for (int i = 0; i < N; ++i) {
            if (kind[i] == 0) v.push_back(PSq{xs[i]});
            else if (kind[i] == 1) v.push_back(PRect{xs[i], ys[i]});
            else v.push_back(PTri{xs[i], ys[i]});
        }
        flat_row("variant + visit, 3 mixed", best_ns([&] { long s = 0;
            for (auto& x : v) s += std::visit([](const auto& sh) { return sh.area(); }, x); sink = s; }));
    }
    {   // 8. plain structs in a flat vector: what a template over a known type compiles to
        std::vector<PSq> v;
        for (int i = 0; i < N; ++i) v.push_back(PSq{xs[i]});
        flat_row("plain struct, flat vector", best_ns([&] { long s = 0; for (auto& q : v) s += q.area(); sink = s; }));
    }
}
