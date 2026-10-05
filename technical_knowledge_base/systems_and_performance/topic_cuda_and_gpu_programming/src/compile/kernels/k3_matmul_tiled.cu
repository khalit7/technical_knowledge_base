// Tiled matmul: each block stages a TILE x TILE piece of A and of B in shared memory,
// so each value loaded from global memory is reused TILE times.
#define TILE 32
extern "C" __global__ void matmul_tiled(const float* A, const float* B, float* C,
                                        int M, int N, int K) {
  __shared__ float As[TILE][TILE];
  __shared__ float Bs[TILE][TILE];
  int row = blockIdx.y * TILE + threadIdx.y;
  int col = blockIdx.x * TILE + threadIdx.x;
  float acc = 0.f;
  for (int t = 0; t < K; t += TILE) {
    As[threadIdx.y][threadIdx.x] = (row < M && t + threadIdx.x < K) ? A[row * K + t + threadIdx.x] : 0.f;
    Bs[threadIdx.y][threadIdx.x] = (col < N && t + threadIdx.y < K) ? B[(t + threadIdx.y) * N + col] : 0.f;
    __syncthreads();                                // wait until the whole tile is loaded
#pragma unroll
    for (int k = 0; k < TILE; ++k)
      acc += As[threadIdx.y][k] * Bs[k][threadIdx.x];  // shared-memory loads only
    __syncthreads();                                // wait before overwriting the tile
  }
  if (row < M && col < N) C[row * N + col] = acc;
}
