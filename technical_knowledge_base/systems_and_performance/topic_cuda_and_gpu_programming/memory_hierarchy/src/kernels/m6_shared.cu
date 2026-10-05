// Shared memory declared three ways, and wide shared loads.
extern "C" __global__ void smem_static(const float* __restrict__ a, float* __restrict__ b) {
  __shared__ float t[32][33];                       // padded transpose tile
  int x = threadIdx.x, y = threadIdx.y;
  t[y][x] = a[(blockIdx.y * 32 + y) * 4096 + blockIdx.x * 32 + x];
  __syncthreads();
  b[(blockIdx.x * 32 + y) * 4096 + blockIdx.y * 32 + x] = t[x][y];
}
extern "C" __global__ void smem_swizzle(const float* __restrict__ a, float* __restrict__ b) {
  __shared__ float t[32][32];                       // XOR swizzle instead of padding
  int x = threadIdx.x, y = threadIdx.y;
  t[y][x ^ y] = a[(blockIdx.y * 32 + y) * 4096 + blockIdx.x * 32 + x];
  __syncthreads();
  b[(blockIdx.x * 32 + y) * 4096 + blockIdx.y * 32 + x] = t[x][y ^ x];
}
extern "C" __global__ void smem_dynamic(const float4* __restrict__ a, float4* __restrict__ b, int n4) {
  extern __shared__ float4 s[];                     // size given at launch: <<<grid, block, bytes>>>
  int i = threadIdx.x;
  s[i] = a[blockIdx.x * blockDim.x + i];            // 16-byte store to shared (STS.128)
  __syncthreads();
  b[blockIdx.x * blockDim.x + i] = s[(i + 1) % blockDim.x];   // 16-byte load (LDS.128)
}
