// The running example through cuBLASLt: Y = GELU(X W + b) in BF16 with FP32 accumulation,
// the bias add and GELU done in the GEMM's epilogue (CUBLASLT_EPILOGUE_GELU_BIAS).
// cuBLAS is column-major: a row-major X (M x K) is a column-major K x M matrix, so we ask for
// Y^T = W^T X^T, which cuBLAS sees as (N x K) times (K x M). Compiled here; run fails without a GPU.
#include <cstdio>
#include <cuda_runtime.h>
#include <cublasLt.h>
#include <cuda_bf16.h>
#define CK(x) do { auto s = (x); if ((int)s != 0) { printf("%s -> %d (%s)\n", #x, (int)s, __FILE__); return 1; } } while (0)
int main() {
  const int M = 8192, K = 4096, N = 14336;            // tokens, model width, MLP width (Llama-3-8B-shaped)
  int ver = (int)cublasLtGetVersion();
  printf("cublasLt version %d\n", ver);
  int dev = 0; cudaError_t e = cudaGetDeviceCount(&dev);
  printf("cudaGetDeviceCount -> %d (%s), devices %d\n", (int)e, cudaGetErrorString(e), dev);
  cublasLtHandle_t lt; cublasStatus_t st = cublasLtCreate(&lt);
  printf("cublasLtCreate -> %d\n", (int)st);
  if (st != CUBLAS_STATUS_SUCCESS || e != cudaSuccess) { printf("stopping: no device here\n"); return 0; }
  __nv_bfloat16 *X, *W, *Y, *b; void* ws; size_t wsize = 32u << 20;
  CK(cudaMalloc(&X, sizeof(*X) * M * K)); CK(cudaMalloc(&W, sizeof(*W) * K * N));
  CK(cudaMalloc(&Y, sizeof(*Y) * M * N)); CK(cudaMalloc(&b, sizeof(*b) * N)); CK(cudaMalloc(&ws, wsize));
  cublasLtMatmulDesc_t op; CK(cublasLtMatmulDescCreate(&op, CUBLAS_COMPUTE_32F, CUDA_R_32F));
  cublasLtEpilogue_t epi = CUBLASLT_EPILOGUE_GELU_BIAS;
  CK(cublasLtMatmulDescSetAttribute(op, CUBLASLT_MATMUL_DESC_EPILOGUE, &epi, sizeof(epi)));
  CK(cublasLtMatmulDescSetAttribute(op, CUBLASLT_MATMUL_DESC_BIAS_POINTER, &b, sizeof(b)));
  cublasLtMatrixLayout_t la, lb, lc;                   // column-major views: W^T is N x K (ld N), X^T is K x M (ld K)
  CK(cublasLtMatrixLayoutCreate(&la, CUDA_R_16BF, N, K, N));
  CK(cublasLtMatrixLayoutCreate(&lb, CUDA_R_16BF, K, M, K));
  CK(cublasLtMatrixLayoutCreate(&lc, CUDA_R_16BF, N, M, N));
  cublasLtMatmulPreference_t pref; CK(cublasLtMatmulPreferenceCreate(&pref));
  CK(cublasLtMatmulPreferenceSetAttribute(pref, CUBLASLT_MATMUL_PREF_MAX_WORKSPACE_BYTES, &wsize, sizeof(wsize)));
  cublasLtMatmulHeuristicResult_t res[8]; int found = 0;   // the heuristic ranks candidate kernels
  CK(cublasLtMatmulAlgoGetHeuristic(lt, op, la, lb, lc, lc, pref, 8, res, &found));
  printf("heuristic returned %d algorithms\n", found);
  float alpha = 1.f, beta = 0.f;
  CK(cublasLtMatmul(lt, op, &alpha, W, la, X, lb, &beta, Y, lc, Y, lc, &res[0].algo, ws, wsize, 0));
  CK(cudaDeviceSynchronize());
  printf("done\n");
  return 0;
}
