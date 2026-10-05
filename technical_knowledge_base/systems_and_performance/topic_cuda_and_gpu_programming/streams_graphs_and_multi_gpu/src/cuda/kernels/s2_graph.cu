// s2_graph.cu: CUDA graphs three ways.
// (1) stream capture of 20 small kernels, instantiate once, replay many times;
// (2) update the instantiated graph in place (new scale factor) without re-instantiating;
// (3) a conditional WHILE node: the body runs again as long as a kernel inside it says so.
#include <cstdio>
#include <cuda_runtime.h>
#define CK(x) do { cudaError_t e = (x); if (e != cudaSuccess) { \
  printf("%s:%d %s -> %s (%d)\n", __FILE__, __LINE__, #x, cudaGetErrorString(e), (int)e); return 1; } } while (0)

__global__ void axpb(float* x, int n, float a, float b) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) x[i] = a * x[i] + b;
}
// Body of the loop: halve x[0]; keep looping while x[0] > 1. Sets the condition from the GPU.
__global__ void halve_and_test(float* x, cudaGraphConditionalHandle h) {
  x[0] *= 0.5f;
  cudaGraphSetConditional(h, x[0] > 1.0f ? 1u : 0u);
}

int main() {
  const int n = 1 << 12, K = 20;
  float* d; CK(cudaMalloc(&d, n * sizeof(float)));
  cudaStream_t s; CK(cudaStreamCreateWithFlags(&s, cudaStreamNonBlocking));

  // (1) capture: the launches are recorded, not run
  cudaGraph_t g; cudaGraphExec_t ge;
  CK(cudaStreamBeginCapture(s, cudaStreamCaptureModeGlobal));
  for (int k = 0; k < K; ++k) axpb<<<n / 256, 256, 0, s>>>(d, n, 1.0001f, 0.5f);
  CK(cudaStreamEndCapture(s, &g));
  CK(cudaGraphInstantiate(&ge, g, 0));                 // the expensive step: done once
  for (int it = 0; it < 1000; ++it) CK(cudaGraphLaunch(ge, s));   // one CPU call per 20 kernels
  CK(cudaStreamSynchronize(s));

  // (2) change a parameter: re-capture with the same topology, then update the executable graph
  cudaGraph_t g2;
  CK(cudaStreamBeginCapture(s, cudaStreamCaptureModeGlobal));
  for (int k = 0; k < K; ++k) axpb<<<n / 256, 256, 0, s>>>(d, n, 0.9999f, 0.5f);
  CK(cudaStreamEndCapture(s, &g2));
  cudaGraphExecUpdateResultInfo info;
  CK(cudaGraphExecUpdate(ge, g2, &info));             // fails (info.result) if the topology changed
  CK(cudaGraphLaunch(ge, s));

  // (3) a while loop that lives entirely on the GPU
  cudaGraph_t w; cudaGraphExec_t we;
  CK(cudaGraphCreate(&w, 0));
  cudaGraphConditionalHandle h;
  CK(cudaGraphConditionalHandleCreate(&h, w, 1, cudaGraphCondAssignDefault));
  cudaGraphNodeParams cp = {};
  cp.type = cudaGraphNodeTypeConditional;
  cp.conditional.handle = h;
  cp.conditional.type = cudaGraphCondTypeWhile;
  cp.conditional.size = 1;
  cudaGraphNode_t cn;
  CK(cudaGraphAddNode(&cn, w, nullptr, nullptr, 0, &cp));
  cudaGraph_t body = cp.conditional.phGraph_out[0];    // fill the body graph by capture
  CK(cudaStreamBeginCaptureToGraph(s, body, nullptr, nullptr, 0, cudaStreamCaptureModeGlobal));
  halve_and_test<<<1, 1, 0, s>>>(d, h);
  CK(cudaStreamEndCapture(s, nullptr));
  CK(cudaGraphInstantiate(&we, w, 0));
  CK(cudaGraphLaunch(we, s));
  CK(cudaStreamSynchronize(s));
  printf("graphs ran\n");
  return 0;
}
