// s5_default_stream.cu: the same three launches, compiled twice. With the legacy default stream
// (nvcc's default) launch B on stream 0 waits for A and makes C wait for it. With
// --default-stream per-thread, "stream 0" is a per-thread stream that does not synchronise with others.
// Which one you got is visible in the binary: per-thread builds call the *_ptsz / *_ptds entry points.
#include <cuda_runtime.h>
__global__ void k(float* x) { x[threadIdx.x] += 1.0f; }
int main() {
  float* d; cudaMalloc(&d, 1024 * sizeof(float));
  cudaStream_t s1, s2; cudaStreamCreate(&s1); cudaStreamCreate(&s2);   // blocking streams (the default flag)
  k<<<1, 256, 0, s1>>>(d);          // A
  k<<<1, 256>>>(d + 256);           // B: on the default stream
  k<<<1, 256, 0, s2>>>(d + 512);    // C
  cudaMemcpyAsync(d, d + 512, 256 * sizeof(float), cudaMemcpyDeviceToDevice);   // default stream again
  cudaDeviceSynchronize();
  return 0;
}
