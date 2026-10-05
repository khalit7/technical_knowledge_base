// Allocation as a hidden cost: build 10 M token ids three ways, and look at the small-string optimisation.
#include "bench.h"
#include <algorithm>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>
template <class F> double best_ms(F f) { double b = 1e9; for (int i = 0; i < 5; ++i) { double t0 = now_s(); f(); b = std::min(b, now_s() - t0); } return b * 1e3; }
int main() {
  prefer_pcore();
  const int N = 10'000'000;
  double grow = best_ms([&] { std::vector<int32_t> v; for (int i = 0; i < N; ++i) v.push_back(i); keep(v.data()); });
  double res  = best_ms([&] { std::vector<int32_t> v; v.reserve(N); for (int i = 0; i < N; ++i) v.push_back(i); keep(v.data()); });
  double box  = best_ms([&] { std::vector<std::unique_ptr<int32_t>> v; v.reserve(N); for (int i = 0; i < N; ++i) v.push_back(std::make_unique<int32_t>(i)); keep(v.data()); });
  std::printf("10 M push_back, growing          %6.1f ms\n", grow);
  std::printf("10 M push_back after reserve()   %6.1f ms\n", res);
  std::printf("10 M heap objects (make_unique)  %6.1f ms  (one malloc and one free each)\n", box);
  size_t reallocs = 0; { std::vector<int32_t> v; const int32_t* last = nullptr; for (int i = 0; i < N; ++i) { v.push_back(i); if (v.data() != last) { ++reallocs; last = v.data(); } } }
  std::printf("a growing vector moved its buffer %zu times to reach 10 M elements\n", reallocs);
  std::string s1 = "short", s2 = "a string long enough to need the heap";
  auto inside = [](const std::string& s) { auto p = (const char*)s.data(); auto o = (const char*)&s; return p >= o && p < o + sizeof(s); };
  std::printf("sizeof(std::string) = %zu; capacity of an empty string = %zu\n", sizeof(std::string), std::string().capacity());
  std::printf("\"%s\": characters stored inside the string object itself: %s\n", s1.c_str(), inside(s1) ? "yes" : "no");
  std::printf("\"%s\": inside: %s\n", s2.c_str(), inside(s2) ? "yes" : "no (on the heap)");
}
