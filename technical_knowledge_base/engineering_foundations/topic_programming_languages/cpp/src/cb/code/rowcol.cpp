// Spatial locality: sum a 4096 x 4096 matrix of 32-bit integers (64 MB) row by row, then column by column.
// Same additions, same result; only the order of memory accesses changes.
#include "bench.h"
#include <algorithm>
#include <cstdint>
#include <vector>
int main() {
  prefer_pcore();
  const size_t R = 4096, C = 4096;
  std::vector<int32_t> m(R * C);
  for (size_t i = 0; i < R * C; ++i) m[i] = int32_t(i % 3);
  double br = 1e9, bc = 1e9; int64_t sr = 0, sc = 0;
  for (int t = 0; t < 5; ++t) {
    double t0 = now_s(); int64_t s = 0;
    for (size_t r = 0; r < R; ++r) for (size_t c = 0; c < C; ++c) s += m[r * C + c];   // next element is 4 bytes away
    br = std::min(br, now_s() - t0); sr = s; keep(sr);
    t0 = now_s(); s = 0;
    for (size_t c = 0; c < C; ++c) for (size_t r = 0; r < R; ++r) s += m[r * C + c];   // next element is 16 KB away
    bc = std::min(bc, now_s() - t0); sc = s; keep(sc);
  }
  std::printf("row by row     %6.1f ms  %.2f ns/element  sum %lld\n", br * 1e3, br / (R * C) * 1e9, (long long)sr);
  std::printf("column by col  %6.1f ms  %.2f ns/element  sum %lld\n", bc * 1e3, bc / (R * C) * 1e9, (long long)sc);
  std::printf("columns are %.1fx slower\n", bc / br);
}
