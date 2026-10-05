// False sharing: 4 threads, each incrementing ITS OWN counter 100 million times.
// No data is shared, yet when the counters sit in the same cache line, the line ping-pongs between cores.
#include "bench.h"
#include <algorithm>
#include <atomic>
#include <cstdint>
#include <thread>
#include <vector>

template <size_t Stride> double run(int threads) {
  struct alignas(128) Block { std::atomic<int64_t> c[4 * Stride / 8]; } block{};   // 4 counters, Stride bytes apart
  auto counter = [&](int t) -> std::atomic<int64_t>& { return block.c[t * Stride / 8]; };
  const int64_t ITERS = 100'000'000;
  double t0 = now_s();
  std::vector<std::thread> ts;
  for (int t = 0; t < threads; ++t)
    ts.emplace_back([&, t] { prefer_pcore(); auto& c = counter(t); for (int64_t i = 0; i < ITERS; ++i) c.fetch_add(1, std::memory_order_relaxed); });
  for (auto& th : ts) th.join();
  double dt = now_s() - t0;
  for (int t = 0; t < threads; ++t) if (counter(t).load() != ITERS) std::printf("wrong count!\n");
  return dt;
}
int main() {
  std::printf("4 threads x 100M relaxed atomic increments, each thread on its own counter (best of 3)\n");
  auto best = [](auto f) { double b = 1e9; for (int i = 0; i < 3; ++i) b = std::min(b, f()); return b; };
  double one = best([] { return run<128>(1); });
  double s8 = best([] { return run<8>(4); });
  double s64 = best([] { return run<64>(4); });
  double s128 = best([] { return run<128>(4); });
  std::printf("  1 thread alone                         %6.0f ms\n", one * 1e3);
  std::printf("  4 threads, counters 8 bytes apart      %6.0f ms   (all 4 in one 128-byte line)\n", s8 * 1e3);
  std::printf("  4 threads, counters 64 bytes apart     %6.0f ms   (std::hardware_destructive_interference_size)\n", s64 * 1e3);
  std::printf("  4 threads, counters 128 bytes apart    %6.0f ms   (one line each on this M1 Pro)\n", s128 * 1e3);
  std::printf("  8 bytes apart is %.1fx slower than 128 bytes apart\n", s8 / s128);
}
