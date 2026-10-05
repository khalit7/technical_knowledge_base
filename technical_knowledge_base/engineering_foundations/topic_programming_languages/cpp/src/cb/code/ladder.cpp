// Latency ladder: how long does one load take when the data lives in L1, L2, the SLC or DRAM?
// Pointer chasing: each load's address comes from the previous load, so the processor cannot
// overlap them or guess the next address. One node per 128-byte cache line, visited in a random cycle.
// Usage: ladder [random|sequential]
#include "bench.h"
#include <algorithm>
#include <cstdint>
#include <cstring>
#include <random>
#include <vector>
#include <cstdlib>

constexpr size_t LINE = 128;                      // sysctl hw.cachelinesize on this M1 Pro
struct alignas(LINE) Node { Node* next; char pad[LINE - sizeof(Node*)]; };

double chase(size_t bytes, bool random, std::mt19937_64& rng) {
  size_t n = bytes / LINE;
  std::vector<Node> nodes(n);
  std::vector<size_t> order(n);
  for (size_t i = 0; i < n; ++i) order[i] = i;
  if (random) std::shuffle(order.begin() + 1, order.end(), rng);  // one random cycle through every line
  for (size_t i = 0; i < n; ++i) nodes[order[i]].next = &nodes[order[(i + 1) % n]];
  size_t steps = std::max<size_t>(n * 4, 20'000'000);             // enough loads to swamp the clock's cost
  Node* p = &nodes[order[0]];
  for (size_t i = 0; i < n; ++i) p = p->next;                      // warm up: one full lap
  double best = 1e9;
  for (int rep = 0; rep < 3; ++rep) {
    double t0 = now_s();
    for (size_t i = 0; i < steps; ++i) p = p->next;
    double t = (now_s() - t0) / steps * 1e9;
    best = std::min(best, t);
  }
  keep(p);
  return best;
}

int main(int argc, char** argv) {
  prefer_pcore();
  bool random = !(argc > 1 && std::strcmp(argv[1], "sequential") == 0);
  std::mt19937_64 rng(42);
  std::printf("# %s pointer chase, one node per 128-byte line, best of 3, ns per load\n", random ? "random" : "sequential");
  for (size_t kb = 4; kb <= 1024 * 1024; kb *= 2) {
    for (size_t k : {kb, kb * 3 / 2}) {
      if (k > 1024 * 1024 || k < 4) continue;
      std::printf("%zu\t%.2f\n", k, chase(k * 1024, random, rng));
      std::fflush(stdout);
    }
  }
}
