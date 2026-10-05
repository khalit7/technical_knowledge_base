// Sum reduction: each warp sums its 32 values with register shuffles,
// then warp 0 sums the per-warp partial sums, and one atomic adds the block's total.
__device__ __forceinline__ float warp_sum(float v) {
#pragma unroll
  for (int off = 16; off > 0; off >>= 1)
    v += __shfl_down_sync(0xffffffff, v, off);       // read v from lane (lane + off)
  return v;
}
extern "C" __global__ void reduce_sum(const float* x, float* out, int n) {
  __shared__ float partial[32];                      // one slot per warp (up to 1024 threads)
  float v = 0.f;
  for (int i = blockIdx.x * blockDim.x + threadIdx.x; i < n; i += gridDim.x * blockDim.x)
    v += x[i];                                       // grid-stride loop: each thread sums many
  v = warp_sum(v);
  int lane = threadIdx.x & 31, warp = threadIdx.x >> 5;
  if (lane == 0) partial[warp] = v;
  __syncthreads();
  if (warp == 0) {
    v = (lane < (blockDim.x >> 5)) ? partial[lane] : 0.f;
    v = warp_sum(v);
    if (lane == 0) atomicAdd(out, v);
  }
}
