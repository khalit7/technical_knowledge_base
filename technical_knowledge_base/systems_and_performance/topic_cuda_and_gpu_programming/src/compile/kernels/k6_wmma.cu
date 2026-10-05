// Tensor-core matmul through the warp-level WMMA API (FP16 in, FP32 accumulate).
// One warp computes one 16x16 tile of C, stepping along K 16 at a time.
// Compiles to HMMA instructions on sm_80, sm_90, sm_100 and sm_120.
#include <mma.h>
#include <cuda_fp16.h>
using namespace nvcuda;
extern "C" __global__ void matmul_wmma(const half* A, const half* B, float* C,
                                       int M, int N, int K) {
  int tileRow = blockIdx.y * 16, tileCol = blockIdx.x * 16;   // one warp per block here
  wmma::fragment<wmma::matrix_a, 16, 16, 16, half, wmma::row_major> a;
  wmma::fragment<wmma::matrix_b, 16, 16, 16, half, wmma::row_major> b;
  wmma::fragment<wmma::accumulator, 16, 16, 16, float> acc;
  wmma::fill_fragment(acc, 0.f);
  for (int k = 0; k < K; k += 16) {
    wmma::load_matrix_sync(a, A + tileRow * K + k, K);        // 16x16 piece of A
    wmma::load_matrix_sync(b, B + k * N + tileCol, N);        // 16x16 piece of B
    wmma::mma_sync(acc, a, b, acc);                           // acc += a x b on tensor cores
  }
  wmma::store_matrix_sync(C + tileRow * N + tileCol, acc, N, wmma::mem_row_major);
}
