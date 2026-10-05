// A complete CUDA program: y = a * x on the GPU, checked against the CPU.
#include <cstdio>
#include <cstdlib>
#include <vector>
#include <cuda_runtime.h>
#define CUDA_CHECK(call) do { cudaError_t e_ = (call); if (e_ != cudaSuccess) { \
  fprintf(stderr, "%s:%d: %s\n", __FILE__, __LINE__, cudaGetErrorString(e_)); exit(1); } } while (0)

__global__ void scale(const float* x, float* y, float a, int n) {   // runs on the GPU
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = a * x[i];
}

int main() {
  const int n = 1 << 20;                                 // 1,048,576 elements
  std::vector<float> hx(n), hy(n);
  for (int i = 0; i < n; ++i) hx[i] = float(i);
  float *dx, *dy;                                        // device pointers: not usable on the CPU
  CUDA_CHECK(cudaMalloc(&dx, n * sizeof(float)));        // 1 allocate GPU memory
  CUDA_CHECK(cudaMalloc(&dy, n * sizeof(float)));
  CUDA_CHECK(cudaMemcpy(dx, hx.data(), n * sizeof(float), cudaMemcpyHostToDevice));  // 2 copy in
  int block = 256, grid = (n + block - 1) / block;       // 3 choose the launch: 4,096 blocks of 256
  scale<<<grid, block>>>(dx, dy, 2.0f, n);               // 4 launch (returns at once)
  CUDA_CHECK(cudaGetLastError());                        //   was the launch itself valid?
  CUDA_CHECK(cudaMemcpy(hy.data(), dy, n * sizeof(float), cudaMemcpyDeviceToHost));  // 5 copy out (waits)
  for (int i = 0; i < n; ++i)                            // 6 check against the CPU
    if (hy[i] != 2.0f * hx[i]) { printf("mismatch at %d\n", i); return 1; }
  printf("ok\n");
  CUDA_CHECK(cudaFree(dx)); CUDA_CHECK(cudaFree(dy));    // 7 free
  return 0;
}
