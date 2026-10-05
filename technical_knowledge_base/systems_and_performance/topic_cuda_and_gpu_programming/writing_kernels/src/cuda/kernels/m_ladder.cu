// The float32 matmul ladder of Simon Boehm's worklog (siboehm.com/articles/22/CUDA-MMM), rewritten here kernel by
// kernel in the same structure (our code, his tile sizes): C = A B, all row-major, M = N = K a multiple of 128.
// Compiled for sm_80, sm_90a and sm_120 without a GPU; we read registers, shared memory and the instruction mix.
extern "C" __global__ void k1_naive(const float* A, const float* B, float* C, int n) {
  // threadIdx.x walks ROWS of C: the 32 threads of a warp read 32 different rows of A (n floats apart)
  int r = blockIdx.x * 32 + threadIdx.x, c = blockIdx.y * 32 + threadIdx.y;
  float s = 0.f; for (int k = 0; k < n; ++k) s += A[r * n + k] * B[k * n + c];
  C[r * n + c] = s;
}
extern "C" __global__ void k2_coalesced(const float* A, const float* B, float* C, int n) {
  // threadIdx.x walks COLUMNS: a warp reads one A value (broadcast) and 32 neighbouring B values (one 128-byte line)
  int c = blockIdx.x * 32 + threadIdx.x, r = blockIdx.y * 32 + threadIdx.y;
  float s = 0.f; for (int k = 0; k < n; ++k) s += A[r * n + k] * B[k * n + c];
  C[r * n + c] = s;
}
extern "C" __global__ void k3_smem(const float* A, const float* B, float* C, int n) {
  // 32 x 32 tiles of A and B staged in shared memory; each value loaded from DRAM is reused 32 times
  __shared__ float As[32][32], Bs[32][32];
  int tx = threadIdx.x % 32, ty = threadIdx.x / 32, r = blockIdx.y * 32 + ty, c = blockIdx.x * 32 + tx;
  float s = 0.f;
  for (int k0 = 0; k0 < n; k0 += 32) {
    As[ty][tx] = A[r * n + k0 + tx]; Bs[ty][tx] = B[(k0 + ty) * n + c]; __syncthreads();
    for (int k = 0; k < 32; ++k) s += As[ty][k] * Bs[k][tx];
    __syncthreads();
  }
  C[r * n + c] = s;
}
extern "C" __global__ void __launch_bounds__(512) k4_tile1d(const float* A, const float* B, float* C, int n) {
  // block tile 64 x 64, K step 8; each thread computes TM = 8 outputs of one column: one Bs value feeds 8 FMAs
  constexpr int BM = 64, BN = 64, BK = 8, TM = 8;
  __shared__ float As[BM * BK], Bs[BK * BN];
  int tc = threadIdx.x % BN, tr = threadIdx.x / BN;
  const float* a = A + blockIdx.y * BM * n; const float* b = B + blockIdx.x * BN;
  float acc[TM] = {0.f};
  for (int k0 = 0; k0 < n; k0 += BK) {
    As[(threadIdx.x / BK) * BK + threadIdx.x % BK] = a[(threadIdx.x / BK) * n + k0 + threadIdx.x % BK];
    Bs[(threadIdx.x / BN) * BN + threadIdx.x % BN] = b[(k0 + threadIdx.x / BN) * n + threadIdx.x % BN];
    __syncthreads();
    for (int k = 0; k < BK; ++k) { float bv = Bs[k * BN + tc];
#pragma unroll
      for (int i = 0; i < TM; ++i) acc[i] += As[(tr * TM + i) * BK + k] * bv; }
    __syncthreads();
  }
  for (int i = 0; i < TM; ++i) C[(blockIdx.y * BM + tr * TM + i) * n + blockIdx.x * BN + tc] = acc[i];
}
extern "C" __global__ void __launch_bounds__(256) k5_tile2d(const float* A, const float* B, float* C, int n) {
  // block tile 128 x 128, each thread an 8 x 8 register tile: per k, 8 + 8 shared loads feed 64 FMAs (outer product)
  constexpr int BM = 128, BN = 128, BK = 8, TM = 8, TN = 8;
  __shared__ float As[BM * BK], Bs[BK * BN];
  int tc = threadIdx.x % (BN / TN), tr = threadIdx.x / (BN / TN);
  const float* a = A + blockIdx.y * BM * n; const float* b = B + blockIdx.x * BN;
  float acc[TM][TN] = {{0.f}}, ra[TM], rb[TN];
  for (int k0 = 0; k0 < n; k0 += BK) {
    for (int f = threadIdx.x; f < BM * BK; f += 256) As[f] = a[(f / BK) * n + k0 + f % BK];
    for (int f = threadIdx.x; f < BK * BN; f += 256) Bs[f] = b[(k0 + f / BN) * n + f % BN];
    __syncthreads();
#pragma unroll
    for (int k = 0; k < BK; ++k) {
#pragma unroll
      for (int i = 0; i < TM; ++i) ra[i] = As[(tr * TM + i) * BK + k];
#pragma unroll
      for (int j = 0; j < TN; ++j) rb[j] = Bs[k * BN + tc * TN + j];
#pragma unroll
      for (int i = 0; i < TM; ++i)
#pragma unroll
        for (int j = 0; j < TN; ++j) acc[i][j] += ra[i] * rb[j];
    }
    __syncthreads();
  }
  for (int i = 0; i < TM; ++i) for (int j = 0; j < TN; ++j) C[(blockIdx.y * BM + tr * TM + i) * n + blockIdx.x * BN + tc * TN + j] = acc[i][j];
}
extern "C" __global__ void __launch_bounds__(256) k6_vectorized(const float* A, const float* B, float* C, int n) {
  // as k5, plus 128-bit loads: A is transposed while it is stored to shared memory (As[k][m]) so that both
  // register fragments are read with LDS.128, and global loads and stores move float4
  constexpr int BM = 128, BN = 128, BK = 8, TM = 8, TN = 8;
  __shared__ float As[BK * BM], Bs[BK * BN];
  int tc = threadIdx.x % (BN / TN), tr = threadIdx.x / (BN / TN);
  const float* a = A + blockIdx.y * BM * n; const float* b = B + blockIdx.x * BN;
  float acc[TM][TN] = {{0.f}}, ra[TM], rb[TN];
  int ar = threadIdx.x / 2, ac = (threadIdx.x % 2) * 4, br = threadIdx.x / 32, bc = (threadIdx.x % 32) * 4;
  for (int k0 = 0; k0 < n; k0 += BK) {
    float4 va = *reinterpret_cast<const float4*>(a + ar * n + k0 + ac);
    As[(ac + 0) * BM + ar] = va.x; As[(ac + 1) * BM + ar] = va.y; As[(ac + 2) * BM + ar] = va.z; As[(ac + 3) * BM + ar] = va.w;
    *reinterpret_cast<float4*>(&Bs[br * BN + bc]) = *reinterpret_cast<const float4*>(b + (k0 + br) * n + bc);
    __syncthreads();
#pragma unroll
    for (int k = 0; k < BK; ++k) {
      *reinterpret_cast<float4*>(ra) = *reinterpret_cast<const float4*>(&As[k * BM + tr * TM]);
      *reinterpret_cast<float4*>(ra + 4) = *reinterpret_cast<const float4*>(&As[k * BM + tr * TM + 4]);
      *reinterpret_cast<float4*>(rb) = *reinterpret_cast<const float4*>(&Bs[k * BN + tc * TN]);
      *reinterpret_cast<float4*>(rb + 4) = *reinterpret_cast<const float4*>(&Bs[k * BN + tc * TN + 4]);
#pragma unroll
      for (int i = 0; i < TM; ++i)
#pragma unroll
        for (int j = 0; j < TN; ++j) acc[i][j] += ra[i] * rb[j];
    }
    __syncthreads();
  }
  for (int i = 0; i < TM; ++i) for (int j = 0; j < TN; j += 4)
    *reinterpret_cast<float4*>(C + (blockIdx.y * BM + tr * TM + i) * n + blockIdx.x * BN + tc * TN + j) =
        make_float4(acc[i][j], acc[i][j + 1], acc[i][j + 2], acc[i][j + 3]);
}
