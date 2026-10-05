// Register pressure: each thread keeps N running sums in registers, as a register-tiled
// matmul keeps an N-element piece of C per thread. Larger N reuses each load more,
// but needs more registers; past 255 per thread (or a launch-bounds cap) ptxas spills
// the excess to "local memory", which lives in DRAM behind the caches.
#define DEF(N)                                                                     \
extern "C" __global__ void __launch_bounds__(128) acc##N(const float* x,           \
                                const float* w, float* y, int K) {                 \
  float acc[N];                                                                    \
  _Pragma("unroll") for (int j = 0; j < N; ++j) acc[j] = 0.f;                      \
  for (int k = 0; k < K; ++k) {                                                    \
    float xv = x[k * 128 + threadIdx.x];                                           \
    _Pragma("unroll") for (int j = 0; j < N; ++j) acc[j] = fmaf(xv, w[k * N + j], acc[j]); \
  }                                                                                \
  _Pragma("unroll") for (int j = 0; j < N; ++j)                                    \
    y[(blockIdx.x * N + j) * 128 + threadIdx.x] = acc[j];                          \
}
DEF(16) DEF(32) DEF(64) DEF(128) DEF(192) DEF(256) DEF(320) DEF(384)
