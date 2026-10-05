// s4_nccl_overlap.cu: the DDP pattern by hand. One process drives every GPU (ncclCommInitAll);
// "backward" fills gradient buckets one by one on a compute stream, and each bucket's all-reduce is
// queued on a separate communication stream as soon as an event says the bucket is ready.
#include <cstdio>
#include <vector>
#include <cuda_runtime.h>
#include <nccl.h>
#define CK(x) do { cudaError_t e = (x); if (e != cudaSuccess) { \
  printf("%s:%d %s -> %s (%d)\n", __FILE__, __LINE__, #x, cudaGetErrorString(e), (int)e); return 1; } } while (0)
#define NK(x) do { ncclResult_t r = (x); if (r != ncclSuccess) { \
  printf("%s:%d %s -> %s\n", __FILE__, __LINE__, #x, ncclGetErrorString(r)); return 1; } } while (0)

__global__ void fake_backward(float* g, int n, float v) {     // stands in for the layers' backward kernels
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) g[i] = v;
}

int main() {
  int ver; NK(ncclGetVersion(&ver)); printf("NCCL version code %d\n", ver);
  int nd = 0; CK(cudaGetDeviceCount(&nd));
  const int B = 4, n = 1 << 22;                                // 4 buckets of 4M floats (16 MiB each)
  std::vector<ncclComm_t> comm(nd);
  std::vector<int> devs(nd); for (int d = 0; d < nd; ++d) devs[d] = d;
  NK(ncclCommInitAll(comm.data(), nd, devs.data()));           // one communicator per GPU, ranks 0..nd-1
  std::vector<cudaStream_t> compute(nd), comms(nd);
  std::vector<float*> grad(nd);
  for (int d = 0; d < nd; ++d) {
    CK(cudaSetDevice(d));
    CK(cudaStreamCreateWithFlags(&compute[d], cudaStreamNonBlocking));
    CK(cudaStreamCreateWithFlags(&comms[d], cudaStreamNonBlocking));
    CK(cudaMalloc(&grad[d], (size_t)B * n * sizeof(float)));
  }
  for (int b = B - 1; b >= 0; --b) {                           // backward visits layers last to first
    for (int d = 0; d < nd; ++d) {
      CK(cudaSetDevice(d));
      float* gb = grad[d] + (size_t)b * n;
      fake_backward<<<n / 256, 256, 0, compute[d]>>>(gb, n, 1.0f + d);
      cudaEvent_t ready; CK(cudaEventCreateWithFlags(&ready, cudaEventDisableTiming));
      CK(cudaEventRecord(ready, compute[d]));
      CK(cudaStreamWaitEvent(comms[d], ready, 0));             // comm stream waits for this bucket only
    }
    NK(ncclGroupStart());                                      // one thread, many GPUs: group the calls
    for (int d = 0; d < nd; ++d) {
      float* gb = grad[d] + (size_t)b * n;
      NK(ncclAllReduce(gb, gb, n, ncclFloat, ncclAvg, comm[d], comms[d]));   // in place, averaged
    }
    NK(ncclGroupEnd());                                        // enqueued, not finished
  }
  for (int d = 0; d < nd; ++d) {                               // optimizer step must wait for all buckets
    CK(cudaSetDevice(d));
    cudaEvent_t done; CK(cudaEventCreateWithFlags(&done, cudaEventDisableTiming));
    CK(cudaEventRecord(done, comms[d]));
    CK(cudaStreamWaitEvent(compute[d], done, 0));
    CK(cudaStreamSynchronize(compute[d]));
  }
  for (int d = 0; d < nd; ++d) NK(ncclCommDestroy(comm[d]));
  printf("all-reduce of %d buckets on %d GPUs done\n", B, nd);
  return 0;
}
