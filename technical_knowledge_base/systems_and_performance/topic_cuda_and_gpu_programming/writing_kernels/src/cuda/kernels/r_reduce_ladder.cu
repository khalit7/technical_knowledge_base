// Mark Harris's reduction ladder (2007), written for current CUDA. Each kernel sums 256 (or 512) floats per block
// into part[blockIdx.x]. Compiled here for sm_80, sm_90a and sm_120 without a GPU; nothing was run.
#define B 256
extern "C" __global__ void r1_interleaved(const float* x, float* part) {      // divergent branch
  __shared__ float sh[B]; unsigned t = threadIdx.x;
  sh[t] = x[blockIdx.x * B + t]; __syncthreads();
  for (unsigned s = 1; s < B; s *= 2) { if (t % (2 * s) == 0) sh[t] += sh[t + s]; __syncthreads(); }
  if (t == 0) part[blockIdx.x] = sh[0];
}
extern "C" __global__ void r2_strided(const float* x, float* part) {          // bank conflicts
  __shared__ float sh[B]; unsigned t = threadIdx.x;
  sh[t] = x[blockIdx.x * B + t]; __syncthreads();
  for (unsigned s = 1; s < B; s *= 2) { unsigned i = 2 * s * t; if (i < B) sh[i] += sh[i + s]; __syncthreads(); }
  if (t == 0) part[blockIdx.x] = sh[0];
}
extern "C" __global__ void r3_sequential(const float* x, float* part) {
  __shared__ float sh[B]; unsigned t = threadIdx.x;
  sh[t] = x[blockIdx.x * B + t]; __syncthreads();
  for (unsigned s = B / 2; s > 0; s >>= 1) { if (t < s) sh[t] += sh[t + s]; __syncthreads(); }
  if (t == 0) part[blockIdx.x] = sh[0];
}
extern "C" __global__ void r4_firstadd(const float* x, float* part) {
  __shared__ float sh[B]; unsigned t = threadIdx.x;
  sh[t] = x[blockIdx.x * 2 * B + t] + x[blockIdx.x * 2 * B + t + B]; __syncthreads();
  for (unsigned s = B / 2; s > 0; s >>= 1) { if (t < s) sh[t] += sh[t + s]; __syncthreads(); }
  if (t == 0) part[blockIdx.x] = sh[0];
}
__device__ __forceinline__ float warp_sum(float v) {   // replaces Harris's volatile "warp-synchronous" tail
  for (int o = 16; o > 0; o >>= 1) v += __shfl_down_sync(0xffffffffu, v, o);
  return v;
}
extern "C" __global__ void r5_warptail(const float* x, float* part) {
  __shared__ float sh[B]; unsigned t = threadIdx.x;
  sh[t] = x[blockIdx.x * 2 * B + t] + x[blockIdx.x * 2 * B + t + B]; __syncthreads();
  for (unsigned s = B / 2; s > 16; s >>= 1) { if (t < s) sh[t] += sh[t + s]; __syncthreads(); }
  if (t < 32) { float v = warp_sum(sh[t]); if (t == 0) part[blockIdx.x] = v; }
}
extern "C" __global__ void r6_gridstride(const float4* x4, float* part, int n4) {   // many elements per thread
  __shared__ float sh[B / 32]; float4 a = make_float4(0.f, 0.f, 0.f, 0.f);
  for (int i = blockIdx.x * B + threadIdx.x; i < n4; i += gridDim.x * B) { float4 v = x4[i]; a.x += v.x; a.y += v.y; a.z += v.z; a.w += v.w; }
  float v = warp_sum(a.x + a.y + a.z + a.w);
  if ((threadIdx.x & 31) == 0) sh[threadIdx.x >> 5] = v;
  __syncthreads();
  if (threadIdx.x < 32) { v = threadIdx.x < B / 32 ? sh[threadIdx.x] : 0.f; v = warp_sum(v); if (threadIdx.x == 0) part[blockIdx.x] = v; }
}
