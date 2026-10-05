// Error handling with the CUDA runtime, run in a container that has the CUDA toolkit
// but no GPU and no driver. Every call below returns an error code; nothing throws.
#include <cstdio>
#include <cuda_runtime.h>
#define CUDA_CHECK(call) do { cudaError_t e_ = (call); if (e_ != cudaSuccess) \
  printf("%s:%d %s failed: %s (%s, code %d)\n", __FILE__, __LINE__, #call, \
         cudaGetErrorName(e_), cudaGetErrorString(e_), (int)e_); } while (0)
__global__ void k(float* p) { p[threadIdx.x] = 1.f; }
int main() {
  int n = -1;
  CUDA_CHECK(cudaGetDeviceCount(&n));
  printf("device count reported: %d\n", n);
  float* d = nullptr;
  CUDA_CHECK(cudaMalloc(&d, 1024));
  k<<<1, 256>>>(d);                     // a launch returns nothing: ask afterwards
  CUDA_CHECK(cudaGetLastError());       // launch-time errors (configuration, no device)
  CUDA_CHECK(cudaDeviceSynchronize());  // errors raised while the kernel ran
  // The names and messages of errors a kernel author meets most, from the runtime itself.
  cudaError_t codes[] = {cudaErrorInvalidConfiguration, cudaErrorLaunchOutOfResources,
    cudaErrorInvalidValue, cudaErrorMemoryAllocation, cudaErrorIllegalAddress,
    cudaErrorMisalignedAddress, cudaErrorLaunchFailure, cudaErrorLaunchTimeout,
    cudaErrorCooperativeLaunchTooLarge, cudaErrorNoKernelImageForDevice,
    cudaErrorUnsupportedPtxVersion, cudaErrorNoDevice, cudaErrorInsufficientDriver,
    cudaErrorNotReady, cudaErrorAssert};
  for (cudaError_t c : codes)
    printf("ERR\t%d\t%s\t%s\n", (int)c, cudaGetErrorName(c), cudaGetErrorString(c));
  int rv = 0; cudaRuntimeGetVersion(&rv); printf("runtime version: %d\n", rv);
  return 0;
}
