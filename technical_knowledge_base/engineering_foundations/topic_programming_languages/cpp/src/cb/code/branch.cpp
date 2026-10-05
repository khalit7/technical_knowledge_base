// Branch prediction: count values >= 128 in 32 M random bytes, unsorted and then sorted.
// Compiled twice: at -O2 (the compiler may remove the branch) and with the branch kept.
#include "bench.h"
#include <algorithm>
#include <cstdint>
#include <random>
#include <vector>
#ifdef KEEP_BRANCH
#define BRANCHY __attribute__((noinline))
#else
#define BRANCHY __attribute__((noinline))
#endif
BRANCHY int64_t count_big(const uint8_t* v, size_t n) {
  int64_t s = 0;
#ifdef KEEP_BRANCH
#pragma clang loop vectorize(disable) interleave(disable)
#endif
  for (size_t i = 0; i < n; ++i) {
    if (v[i] >= 128) {
#ifdef KEEP_BRANCH
      asm volatile("");                 // an empty statement the compiler must keep inside the if, so the branch stays
#endif
      s += v[i];
    }
  }
  return s;
}
int main() {
  prefer_pcore();
  const size_t N = 32u << 20;
  std::vector<uint8_t> v(N);
  std::mt19937 rng(1);
  for (auto& x : v) x = uint8_t(rng());
  auto time = [&](const char* label) {
    double best = 1e9; int64_t r = 0;
    for (int t = 0; t < 5; ++t) { double t0 = now_s(); r = count_big(v.data(), N); keep(r); best = std::min(best, now_s() - t0); }
    std::printf("  %-9s %.2f ns/element  sum %lld\n", label, best / N * 1e9, (long long)r);
    return best;
  };
  double u = time("unsorted");
  std::sort(v.begin(), v.end());
  double s = time("sorted");
  std::printf("  unsorted / sorted = %.1fx\n", u / s);
}
