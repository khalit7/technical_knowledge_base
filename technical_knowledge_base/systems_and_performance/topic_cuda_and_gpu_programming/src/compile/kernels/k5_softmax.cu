// Row softmax: one block of 256 threads per row; max, then sum of exp, then normalise.
// Three passes over the row; each reduction is a warp shuffle plus a shared-memory step.
// "#pragma unroll 1" keeps each loop rolled so the listing stays short; by default nvcc unrolls them.
__device__ __forceinline__ float warp_max(float v) {
#pragma unroll
  for (int off = 16; off > 0; off >>= 1) v = fmaxf(v, __shfl_xor_sync(0xffffffff, v, off));
  return v;
}
__device__ __forceinline__ float warp_sum(float v) {
#pragma unroll
  for (int off = 16; off > 0; off >>= 1) v += __shfl_xor_sync(0xffffffff, v, off);
  return v;
}
extern "C" __global__ void __launch_bounds__(256) softmax_rows(const float* x, float* y, int ncols) {
  __shared__ float red[8];
  const float* xr = x + (size_t)blockIdx.x * ncols;
  float* yr = y + (size_t)blockIdx.x * ncols;
  int lane = threadIdx.x & 31, warp = threadIdx.x >> 5;
  float m = -INFINITY;
#pragma unroll 1
  for (int j = threadIdx.x; j < ncols; j += 256) m = fmaxf(m, xr[j]);   // pass 1: max
  m = warp_max(m); if (lane == 0) red[warp] = m; __syncthreads();
  m = (lane < 8) ? red[lane] : -INFINITY; m = warp_max(m); __syncthreads();
  float s = 0.f;
#pragma unroll 1
  for (int j = threadIdx.x; j < ncols; j += 256) s += __expf(xr[j] - m); // pass 2: sum of exp
  s = warp_sum(s); if (lane == 0) red[warp] = s; __syncthreads();
  s = (lane < 8) ? red[lane] : 0.f; s = warp_sum(s);
  float inv = 1.f / s;
#pragma unroll 1
  for (int j = threadIdx.x; j < ncols; j += 256) yr[j] = __expf(xr[j] - m) * inv; // pass 3
}
