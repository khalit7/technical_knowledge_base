// s1_pipeline.cu: copy/compute overlap with pinned memory, streams and events.
// The input is cut into chunks; chunk i's copy in, kernel and copy out go on stream i % NS,
// so chunk i+1's copy can run while chunk i's kernel runs.
#include <cstdio>
#include <cuda_runtime.h>
#define CK(x) do { cudaError_t e = (x); if (e != cudaSuccess) { \
  printf("%s:%d %s -> %s (%d)\n", __FILE__, __LINE__, #x, cudaGetErrorString(e), (int)e); return 1; } } while (0)

__global__ void scale(float* y, const float* x, int n, float a) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = a * x[i];
}

int main() {
  const int N = 1 << 26, CHUNKS = 8, NS = 3, C = N / CHUNKS;
  float *h_in, *h_out, *d_in, *d_out;
  CK(cudaMallocHost(&h_in, N * sizeof(float)));      // pinned: the copy engine can DMA it directly
  CK(cudaMallocHost(&h_out, N * sizeof(float)));
  CK(cudaMalloc(&d_in, N * sizeof(float)));
  CK(cudaMalloc(&d_out, N * sizeof(float)));
  int lo, hi;                                         // priorities: lower number = higher priority
  CK(cudaDeviceGetStreamPriorityRange(&lo, &hi));
  cudaStream_t s[NS];
  for (int k = 0; k < NS; ++k)                        // non-blocking: no implicit sync with the legacy default stream
    CK(cudaStreamCreateWithPriority(&s[k], cudaStreamNonBlocking, k == 0 ? hi : lo));
  cudaEvent_t t0, t1;
  CK(cudaEventCreate(&t0)); CK(cudaEventCreate(&t1));
  CK(cudaEventRecord(t0, s[0]));
  for (int c = 0; c < CHUNKS; ++c) {
    cudaStream_t st = s[c % NS];
    size_t off = (size_t)c * C;
    CK(cudaMemcpyAsync(d_in + off, h_in + off, C * sizeof(float), cudaMemcpyHostToDevice, st));
    scale<<<(C + 255) / 256, 256, 0, st>>>(d_out + off, d_in + off, C, 2.0f);
    CK(cudaGetLastError());
    CK(cudaMemcpyAsync(h_out + off, d_out + off, C * sizeof(float), cudaMemcpyDeviceToHost, st));
  }
  for (int k = 1; k < NS; ++k) {                      // make s[0] wait for the others before the end event
    cudaEvent_t done; CK(cudaEventCreateWithFlags(&done, cudaEventDisableTiming));
    CK(cudaEventRecord(done, s[k])); CK(cudaStreamWaitEvent(s[0], done, 0));
  }
  CK(cudaEventRecord(t1, s[0]));
  CK(cudaEventSynchronize(t1));                       // the only host wait
  float ms; CK(cudaEventElapsedTime(&ms, t0, t1));
  printf("pipelined %d chunks on %d streams: %.3f ms\n", CHUNKS, NS, ms);
  return 0;
}
