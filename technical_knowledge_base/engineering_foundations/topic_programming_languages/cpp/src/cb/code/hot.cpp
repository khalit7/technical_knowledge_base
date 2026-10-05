// A program to measure with hardware counters: the same additions, row by row or column by column.
// Usage: hot rows | hot cols     (each sums a 64 MB matrix 20 times)
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <vector>
const size_t R = 4096, C = 4096;
__attribute__((noinline)) int64_t sum_rows(const std::vector<int32_t>& m) { int64_t s = 0; for (size_t r = 0; r < R; ++r) for (size_t c = 0; c < C; ++c) s += m[r * C + c]; return s; }
__attribute__((noinline)) int64_t sum_cols(const std::vector<int32_t>& m) { int64_t s = 0; for (size_t c = 0; c < C; ++c) for (size_t r = 0; r < R; ++r) s += m[r * C + c]; return s; }
int main(int argc, char** argv) {
  bool rows = argc > 1 && std::strcmp(argv[1], "rows") == 0;
  std::vector<int32_t> m(R * C, 1);
  int64_t s = 0;
  for (int i = 0; i < 20; ++i) s += rows ? sum_rows(m) : sum_cols(m);
  std::printf("%s: sum %lld\n", rows ? "rows" : "cols", (long long)s);
}
