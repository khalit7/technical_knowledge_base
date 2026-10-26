// Times the four dot products on a vector that fits in L1 and on one that only fits in DRAM.
#include "bench.h"
#include <algorithm>
#include <cmath>
#include <vector>
float dot_scalar(const float*, const float*, size_t);
float dot_auto(const float*, const float*, size_t);
float dot_neon(const float*, const float*, size_t);
float dot_auto_fastmath(const float*, const float*, size_t);

int main() {
  prefer_pcore();
  struct K { const char* name; float (*f)(const float*, const float*, size_t); } ks[] = {
    {"scalar", dot_scalar}, {"auto (-O2)", dot_auto}, {"auto (-O2 -ffast-math)", dot_auto_fastmath}, {"NEON intrinsics", dot_neon}};
  for (size_t n : {size_t(4096), size_t(64) << 20}) {          // 2 x 16 KB (L1), 2 x 256 MB (DRAM)
    std::vector<float> a(n), b(n);
    for (size_t i = 0; i < n; ++i) { a[i] = float(i % 17) * 0.25f; b[i] = float(i % 13) * 0.5f; }
    size_t reps = std::max<size_t>(1, (size_t(1) << 28) / n);
    std::printf("n = %zu floats (%s), %zu passes\n", n, n < 100000 ? "2 x 16 KB, in L1" : "2 x 256 MB, from DRAM", reps);
    for (auto& k : ks) {
      double best = 1e9; float r = 0;
      for (int t = 0; t < 5; ++t) {
        double t0 = now_s();
        for (size_t j = 0; j < reps; ++j) { r = k.f(a.data(), b.data(), n); keep(r); }
        best = std::min(best, (now_s() - t0) / (double(reps) * n));
      }
      double gflops = 2.0 / best / 1e9, gbs = 8.0 / best / 1e9;  // 2 flops and 8 bytes per element
      std::printf("  %-24s %7.3f ns/elem  %6.1f GFLOP/s  %6.1f GB/s  result %.1f\n", k.name, best * 1e9, gflops, gbs, r);
    }
  }
}
