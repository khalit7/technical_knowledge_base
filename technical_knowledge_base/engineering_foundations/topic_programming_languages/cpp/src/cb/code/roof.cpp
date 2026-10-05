// Roofline inputs measured on this machine: peak compute, peak memory bandwidth,
// and where two kernels land: matrix-vector (LLM decode) and matrix-matrix (prefill, training).
// Compiled with -O3 -ffast-math so the plain loops vectorise.
#include "bench.h"
#include <arm_neon.h>
#include <algorithm>
#include <thread>
#include <vector>

// Peak: 24 independent FMA chains (4 FMA units x 4 cycles latency needs at least 16) on registers, no memory traffic at all.
__attribute__((noinline)) float32x4_t fma_peak(long iters) {
  float32x4_t a[24]; for (int k = 0; k < 24; ++k) a[k] = vdupq_n_f32(1.0f + k * 1e-3f);
  const float32x4_t x = vdupq_n_f32(0.999999f), y = vdupq_n_f32(1e-7f);
  for (long i = 0; i < iters; ++i)
    for (int k = 0; k < 24; ++k) a[k] = vfmaq_f32(a[k], x, y);   // a += x * y, 4 lanes, 2 flops each
  float32x4_t s = a[0]; for (int k = 1; k < 24; ++k) s = vaddq_f32(s, a[k]);
  return s;
}
// Bandwidth: read a big array once (sum it), so every byte comes from DRAM.
__attribute__((noinline)) float read_sum(const float* p, size_t n) { float s = 0; for (size_t i = 0; i < n; ++i) s += p[i]; return s; }
// y = W x with W rows x cols, row major: each weight is used once (2 flops per 4 bytes read)
__attribute__((noinline)) void matvec(const float* W, const float* x, float* y, size_t r0, size_t r1, size_t cols) {
  for (size_t r = r0; r < r1; ++r) { float s = 0; const float* w = W + r * cols; for (size_t c = 0; c < cols; ++c) s += w[c] * x[c]; y[r] = s; }
}
// C += A B, n x n, blocked so the working set stays in cache: each loaded number is reused many times
__attribute__((noinline)) void matmul(const float* A, const float* B, float* C, size_t n, size_t r0, size_t r1) {
  const size_t T = 64;
  for (size_t ii = r0; ii < r1; ii += T) for (size_t kk = 0; kk < n; kk += T) for (size_t jj = 0; jj < n; jj += T)
    for (size_t i = ii; i < std::min(ii + T, r1); ++i) for (size_t k = kk; k < kk + T; ++k) {
      float a = A[i * n + k]; const float* b = B + k * n; float* c = C + i * n;
      for (size_t j = jj; j < jj + T; ++j) c[j] += a * b[j];
    }
}
template <class F> double par(int threads, F f) {      // run f(t, threads) on `threads` threads, return seconds
  double t0 = now_s(); std::vector<std::thread> ts;
  for (int t = 0; t < threads; ++t) ts.emplace_back([&, t] { prefer_pcore(); f(t, threads); });
  for (auto& th : ts) th.join(); return now_s() - t0;
}
template <class F> double best(F f) { double b = 1e9; for (int i = 0; i < 5; ++i) b = std::min(b, f()); return b; }

int main() {
  prefer_pcore();
  for (int th : {1, 8}) {
    long it = 25'000'000;
    double t = best([&] { return par(th, [&](int, int) { keep(fma_peak(it)); }); });
    std::printf("peak FMA, %d thread%s: %.1f GFLOP/s\n", th, th > 1 ? "s" : "", th * it * 24 * 8 / t / 1e9);
  }
  size_t n = size_t(128) << 20; std::vector<float> big(n, 1.0f);   // 512 MB
  for (int th : {1, 8}) {
    double t = best([&] { return par(th, [&](int t, int T) { size_t a = n * t / T, b = n * (t + 1) / T; keep(read_sum(big.data() + a, b - a)); }); });
    std::printf("read bandwidth, %d thread%s: %.1f GB/s\n", th, th > 1 ? "s" : "", n * 4.0 / t / 1e9);
  }
  size_t R = 8192, Cc = 8192;                                          // 256 MB of fp32 weights, like one big layer
  std::vector<float> W(R * Cc, 0.001f), x(Cc, 1.0f), y(R);
  for (int th : {1, 8}) {
    double t = best([&] { return par(th, [&](int t, int T) { matvec(W.data(), x.data(), y.data(), R * t / T, R * (t + 1) / T, Cc); }); });
    std::printf("matvec 8192 x 8192 (256 MB), %d thread%s: %.1f GFLOP/s, %.1f GB/s of weights, intensity 0.5 flop/byte\n",
                th, th > 1 ? "s" : "", 2.0 * R * Cc / t / 1e9, 4.0 * R * Cc / t / 1e9);
  }
  size_t m = 512; std::vector<float> A(m * m, 0.5f), Bm(m * m, 0.25f), C(m * m);
  for (int th : {1, 8}) {
    double t = best([&] { std::fill(C.begin(), C.end(), 0.f); return par(th, [&](int t, int T) { size_t rows = m / T; matmul(A.data(), Bm.data(), C.data(), m, rows * t, rows * (t + 1)); }); });
    std::printf("matmul 512 x 512 (3 MB in all), %d thread%s: %.1f GFLOP/s, intensity %.0f flop/byte if each matrix is read once\n",
                th, th > 1 ? "s" : "", 2.0 * m * m * m / t / 1e9, 2.0 * m * m * m / (3.0 * m * m * 4));
  }
  keep(y[7]); keep(C[9]);
}
