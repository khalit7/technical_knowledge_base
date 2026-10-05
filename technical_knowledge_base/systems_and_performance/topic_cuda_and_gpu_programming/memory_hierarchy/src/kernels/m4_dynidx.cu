// A small per-thread array: indexed with constants after unrolling it lives in registers;
// indexed with a value known only at run time it must live in local memory (DRAM behind
// the caches), even though the kernel uses few registers.
extern "C" __global__ void hist_dynamic(const int* __restrict__ bins, float* __restrict__ out, int n) {
  float h[16];
#pragma unroll
  for (int j = 0; j < 16; ++j) h[j] = 0.f;
  int t = blockIdx.x * blockDim.x + threadIdx.x;
  for (int k = 0; k < n; ++k) h[bins[k * 4096 + t] & 15] += 1.f;   // run-time index
#pragma unroll
  for (int j = 0; j < 16; ++j) out[j * 4096 + t] = h[j];
}
extern "C" __global__ void hist_select(const int* __restrict__ bins, float* __restrict__ out, int n) {
  float h[16];
#pragma unroll
  for (int j = 0; j < 16; ++j) h[j] = 0.f;
  int t = blockIdx.x * blockDim.x + threadIdx.x;
  for (int k = 0; k < n; ++k) {
    int b = bins[k * 4096 + t] & 15;
#pragma unroll
    for (int j = 0; j < 16; ++j) h[j] += (b == j) ? 1.f : 0.f;      // every index a constant
  }
#pragma unroll
  for (int j = 0; j < 16; ++j) out[j * 4096 + t] = h[j];
}
