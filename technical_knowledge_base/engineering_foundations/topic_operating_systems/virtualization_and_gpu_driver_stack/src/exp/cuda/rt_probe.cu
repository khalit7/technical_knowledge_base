// The CUDA runtime API in a container with no GPU: what each call returns.
// Built with the runtime as a shared library (-cudart shared) so strace and LD_DEBUG show it load.
#include <cstdio>
#include <cuda_runtime.h>
__global__ void vadd(const float* a, const float* b, float* c, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) c[i] = a[i] + b[i];
}
static void show(const char* what, cudaError_t e) {
  std::printf("%-34s -> %d %s: %s\n", what, (int)e, cudaGetErrorName(e), cudaGetErrorString(e));
}
int main() {
  int v = -1;
  show("cudaRuntimeGetVersion", cudaRuntimeGetVersion(&v)); std::printf("   runtime version %d\n", v);
  v = -1; show("cudaDriverGetVersion", cudaDriverGetVersion(&v)); std::printf("   driver version %d\n", v);
  int n = -1; show("cudaGetDeviceCount", cudaGetDeviceCount(&n)); std::printf("   device count %d\n", n);
  float* d = nullptr; show("cudaMalloc(1 MiB)", cudaMalloc(&d, 1 << 20));
  vadd<<<1, 32>>>(d, d, d, 32); show("vadd<<<1,32>>> (cudaGetLastError)", cudaGetLastError());
  return 0;
}
