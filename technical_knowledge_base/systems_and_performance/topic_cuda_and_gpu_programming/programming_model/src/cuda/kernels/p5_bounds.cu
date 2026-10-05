// The same kernel three ways: no launch bounds, a promise of 1,024-thread blocks,
// and a promise of 256-thread blocks with at least 8 blocks per SM.
// __launch_bounds__ tells ptxas the block size, so it caps registers per thread to make that fit.
template <int K>
__device__ __forceinline__ void body(const float* x, float* y, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i >= n) return;
  float acc[K];
#pragma unroll
  for (int k = 0; k < K; ++k) acc[k] = x[(i + k * 4099) % n];   // K live values per thread
#pragma unroll
  for (int r = 0; r < 8; ++r)
#pragma unroll
    for (int k = 0; k < K; ++k) acc[k] = acc[k] * acc[(k + 1) % K] + 0.5f;
  float s = 0.f;
#pragma unroll
  for (int k = 0; k < K; ++k) s += acc[k];
  y[i] = s;
}
extern "C" __global__ void heavy_plain(const float* x, float* y, int n) { body<96>(x, y, n); }
extern "C" __global__ void __launch_bounds__(1024) heavy_lb1024(const float* x, float* y, int n) { body<96>(x, y, n); }
extern "C" __global__ void __launch_bounds__(256, 8) heavy_lb256x8(const float* x, float* y, int n) { body<96>(x, y, n); }
