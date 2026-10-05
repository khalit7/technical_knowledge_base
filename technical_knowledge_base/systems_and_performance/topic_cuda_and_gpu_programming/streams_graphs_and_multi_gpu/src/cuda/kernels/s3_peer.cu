// s3_peer.cu: two GPUs in one process. Peer access lets a kernel on GPU 0 read GPU 1's memory
// directly (over NVLink or PCIe); cudaMemcpyPeerAsync copies between them without the host.
#include <cstdio>
#include <cuda_runtime.h>
#define CK(x) do { cudaError_t e = (x); if (e != cudaSuccess) { \
  printf("%s:%d %s -> %s (%d)\n", __FILE__, __LINE__, #x, cudaGetErrorString(e), (int)e); return 1; } } while (0)

__global__ void add_remote(float* mine, const float* theirs, int n) {   // theirs lives on the other GPU
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) mine[i] += theirs[i];
}

int main() {
  int ndev = 0; CK(cudaGetDeviceCount(&ndev));
  if (ndev < 2) { printf("need 2 GPUs, found %d\n", ndev); return 0; }
  const int n = 1 << 24; float *a, *b;
  int can01 = 0; CK(cudaDeviceCanAccessPeer(&can01, 0, 1));
  CK(cudaSetDevice(1)); CK(cudaMalloc(&b, n * sizeof(float)));
  CK(cudaSetDevice(0)); CK(cudaMalloc(&a, n * sizeof(float)));
  if (can01) {
    CK(cudaDeviceEnablePeerAccess(1, 0));                // GPU 0 may now dereference GPU 1 pointers
    add_remote<<<n / 256, 256>>>(a, b, n);               // loads go over the link, no copy
  } else {
    float* tmp; CK(cudaMalloc(&tmp, n * sizeof(float)));
    CK(cudaMemcpyPeerAsync(tmp, 0, b, 1, n * sizeof(float), 0));   // staged through host if no P2P
    add_remote<<<n / 256, 256>>>(a, tmp, n);
  }
  CK(cudaDeviceSynchronize());
  // Another process can map this allocation too: export an IPC handle and send its bytes.
  cudaIpcMemHandle_t hnd; CK(cudaIpcGetMemHandle(&hnd, a));
  printf("peer access %d, ipc handle %zu bytes\n", can01, sizeof(hnd));
  return 0;
}
