// Array of structs (AoS) against struct of arrays (SoA): the same data, two layouts.
// A token record as an inference server might keep it: 8 fields of 4 bytes = 32 bytes.
#include "bench.h"
#include <algorithm>
#include <cstdint>
#include <vector>

struct Token {                         // AoS: one record after another
  int32_t id; float logprob; int32_t user; int32_t pos;
  float temp; float top_p; int32_t seq; int32_t flags;
};
struct Tokens {                        // SoA: one array per field
  std::vector<int32_t> id; std::vector<float> logprob; std::vector<int32_t> user, pos;
  std::vector<float> temp, top_p; std::vector<int32_t> seq, flags;
};

template <class F> double best_ns(size_t n, F f) {
  double best = 1e9;
  for (int r = 0; r < 7; ++r) { double t0 = now_s(); f(); best = std::min(best, (now_s() - t0) / n * 1e9); }
  return best;
}

int main() {
  prefer_pcore();
  const size_t N = 20'000'000;          // 640 MB as AoS: far bigger than every cache
  std::vector<Token> aos(N);
  Tokens soa;
  for (auto* v : {&soa.id, &soa.user, &soa.pos, &soa.seq, &soa.flags}) v->resize(N);
  for (auto* v : {&soa.logprob, &soa.temp, &soa.top_p}) v->resize(N);
  for (size_t i = 0; i < N; ++i) {
    float lp = -float(i % 1000) / 100.f;
    aos[i] = {int32_t(i), lp, int32_t(i % 7), int32_t(i), 1.f, 0.9f, 0, 0};
    soa.id[i] = int32_t(i); soa.logprob[i] = lp; soa.user[i] = int32_t(i % 7); soa.pos[i] = int32_t(i);
    soa.temp[i] = 1.f; soa.top_p[i] = 0.9f;
  }
  std::printf("sizeof(Token) = %zu bytes; N = %zu\n", sizeof(Token), N);
  float s1 = 0, s2 = 0; double s3 = 0, s4 = 0;
  // 1. one field: sum of logprob (AoS reads 32 bytes to use 4)
  double a1 = best_ns(N, [&] { float s = 0; for (auto const& t : aos) s += t.logprob; s1 = s; keep(s1); });
  double b1 = best_ns(N, [&] { float s = 0; for (float x : soa.logprob) s += x; s2 = s; keep(s2); });
  std::printf("one field   (logprob)       AoS %.3f ns/record   SoA %.3f ns/record   SoA is %.1fx faster\n", a1, b1, a1 / b1);
  // 1b. one integer field: integer adds can be reordered, so the compiler vectorises the SoA loop
  int64_t s5 = 0, s6 = 0;
  double a3 = best_ns(N, [&] { int32_t s = 0; for (auto const& t : aos) s += t.user; s5 = s; keep(s5); });
  double b3 = best_ns(N, [&] { int32_t s = 0; for (int32_t x : soa.user) s += x; s6 = s; keep(s6); });
  std::printf("one field   (user, integer) AoS %.3f ns/record   SoA %.3f ns/record   SoA is %.1fx faster\n", a3, b3, a3 / b3);
  // 2. every field: AoS reads what it needs either way
  double a2 = best_ns(N, [&] { double s = 0; for (auto const& t : aos) s += t.id + t.logprob + t.user + t.pos + t.temp + t.top_p + t.seq + t.flags; s3 = s; keep(s3); });
  double b2 = best_ns(N, [&] { double s = 0; for (size_t i = 0; i < N; ++i) s += soa.id[i] + soa.logprob[i] + soa.user[i] + soa.pos[i] + soa.temp[i] + soa.top_p[i] + soa.seq[i] + soa.flags[i]; s4 = s; keep(s4); });
  std::printf("all 8 fields                AoS %.3f ns/record   SoA %.3f ns/record   ratio %.2f\n", a2, b2, a2 / b2);
  std::printf("check: %.0f %.0f %.0f %.0f %lld %lld\n", s1, s2, s3, s4, (long long)s5, (long long)s6);
}
