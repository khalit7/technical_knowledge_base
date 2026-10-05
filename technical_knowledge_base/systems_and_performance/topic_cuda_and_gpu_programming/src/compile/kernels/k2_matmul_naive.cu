// Naive matmul C = A x B (row-major, M x K times K x N).
// One thread computes one element of C, reading a whole row of A and column of B from global memory.
extern "C" __global__ void matmul_naive(const float* A, const float* B, float* C,
                                        int M, int N, int K) {
  int row = blockIdx.y * blockDim.y + threadIdx.y;
  int col = blockIdx.x * blockDim.x + threadIdx.x;
  if (row < M && col < N) {
    float acc = 0.f;
    for (int k = 0; k < K; ++k)
      acc += A[row * K + k] * B[k * N + col];       // 2 global loads per multiply-add
    C[row * N + col] = acc;
  }
}
