// Asynchronous copy global -> shared (Ampere and later): the data skips the registers,
// and the thread can issue the next copy before the first has landed.
#include <cuda_pipeline.h>
extern "C" __global__ void tile_sync(const float4* __restrict__ a, float* __restrict__ out, int ntiles) {
  __shared__ float4 s[256];
  float acc = 0.f;
  for (int t = 0; t < ntiles; ++t) {
    s[threadIdx.x] = a[t * 256 + threadIdx.x];      // LDG into a register, then STS
    __syncthreads();
    float4 v = s[(threadIdx.x * 7) & 255]; acc += v.x * v.y + v.z * v.w;
    __syncthreads();
  }
  out[blockIdx.x * 256 + threadIdx.x] = acc;
}
extern "C" __global__ void tile_async2(const float4* __restrict__ a, float* __restrict__ out, int ntiles) {
  __shared__ float4 s[2][256];                      // two stages: load tile t+1 while computing on tile t
  float acc = 0.f;
  __pipeline_memcpy_async(&s[0][threadIdx.x], &a[threadIdx.x], 16);
  __pipeline_commit();
  for (int t = 0; t < ntiles; ++t) {
    if (t + 1 < ntiles) __pipeline_memcpy_async(&s[(t + 1) & 1][threadIdx.x], &a[(t + 1) * 256 + threadIdx.x], 16);
    __pipeline_commit();
    __pipeline_wait_prior(1);                         // tile t has landed; tile t+1 may still be in flight
    __syncthreads();
    float4 v = s[t & 1][(threadIdx.x * 7) & 255]; acc += v.x * v.y + v.z * v.w;
    __syncthreads();
  }
  out[blockIdx.x * 256 + threadIdx.x] = acc;
}
