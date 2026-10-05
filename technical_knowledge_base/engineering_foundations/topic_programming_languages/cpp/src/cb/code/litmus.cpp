// Message passing, the classic memory-ordering test, run on many independent slots at once.
// Thread A, for each slot i: data[i] = 1, then flag[i] = 1.
// Thread B, for each slot i: read flag[i], then read data[i].
// Forbidden outcome with release/acquire: B sees flag[i] == 1 but data[i] == 0.
// With relaxed atomics the C++ memory model allows it, and an ARM processor may really reorder.
#include <atomic>
#include <cstdio>
#include <memory>
#include <thread>
#include <vector>

template <std::memory_order Store, std::memory_order Load> long run(size_t slots, int rounds) {
  long bad = 0;
  auto data = std::make_unique<std::atomic<int>[]>(slots), flag = std::make_unique<std::atomic<int>[]>(slots);
  std::vector<unsigned char> seen(slots);
  for (int r = 0; r < rounds; ++r) {
    for (size_t i = 0; i < slots; ++i) { data[i].store(0, std::memory_order_relaxed); flag[i].store(0, std::memory_order_relaxed); }
    std::atomic<int> ready{0};
    std::thread a([&] {
      ready.fetch_add(1); while (ready.load() < 2) {}
      for (size_t i = 0; i < slots; ++i) { data[i].store(1, std::memory_order_relaxed); flag[i].store(1, Store); }
    });
    std::thread b([&] {
      ready.fetch_add(1); while (ready.load() < 2) {}
      for (int pass = 0; pass < 4; ++pass)
        for (size_t i = 0; i < slots; ++i) {
          int f = flag[i].load(Load); int d = data[i].load(std::memory_order_relaxed);
          if (f == 1 && d == 0) seen[i] = 1;
        }
    });
    a.join(); b.join();
    for (size_t i = 0; i < slots; ++i) { bad += seen[i]; seen[i] = 0; }
  }
  return bad;
}
int main() {
  const size_t slots = 1 << 20; const int rounds = 50;
  std::printf("message passing on %zu slots x %d rounds = %ld trials each\n", slots, rounds, long(slots) * rounds);
  std::printf("  relaxed store, relaxed load : %ld trials saw flag == 1 with data == 0\n", run<std::memory_order_relaxed, std::memory_order_relaxed>(slots, rounds));
  std::printf("  release store, acquire load : %ld trials saw flag == 1 with data == 0\n", run<std::memory_order_release, std::memory_order_acquire>(slots, rounds));
}
