// Synchronisation inside a block: a shared-memory tree sum with and without the barrier,
// a warp-level sum with shuffles, warp votes, and atomics.
#define B 256
extern "C" __global__ void block_sum(const float* x, float* out) {
  __shared__ float s[B];
  int t = threadIdx.x;
  s[t] = x[blockIdx.x * B + t];
  __syncthreads();                                  // every write to s is visible below
  for (int k = B / 2; k > 0; k >>= 1) {
    if (t < k) s[t] += s[t + k];
    __syncthreads();                                // finish this level before the next reads it
  }
  if (t == 0) out[blockIdx.x] = s[0];
}
// The same code with the barriers removed: it compiles without a warning and is wrong.
extern "C" __global__ void block_sum_racy(const float* x, float* out) {
  __shared__ float s[B];
  int t = threadIdx.x;
  s[t] = x[blockIdx.x * B + t];
  for (int k = B / 2; k > 0; k >>= 1) {
    if (t < k) s[t] += s[t + k];
  }
  if (t == 0) out[blockIdx.x] = s[0];
}
// Warp-level: lanes read each other's registers; no shared memory, no __syncthreads.
extern "C" __global__ void warp_sum(const float* x, float* out) {
  float v = x[blockIdx.x * blockDim.x + threadIdx.x];
  for (int off = 16; off > 0; off >>= 1) v += __shfl_down_sync(0xffffffffu, v, off);
  if ((threadIdx.x & 31) == 0) atomicAdd(out, v);   // one atomic per warp, not per thread
}
// Votes: how many lanes of this warp have a positive value?
extern "C" __global__ void count_positive(const float* x, int* out, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  bool p = (i < n) && x[i] > 0.f;
  unsigned m = __ballot_sync(0xffffffffu, p);       // one bit per lane
  if ((threadIdx.x & 31) == 0) atomicAdd(out, __popc(m));
}
// Atomics: every thread adds to one address (contended) or a block first combines in shared memory.
extern "C" __global__ void hist_global(const int* bin, int* h, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) atomicAdd(&h[bin[i]], 1);
}
extern "C" __global__ void hist_shared(const int* bin, int* h, int n) {
  __shared__ int sh[64];
  if (threadIdx.x < 64) sh[threadIdx.x] = 0;
  __syncthreads();
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) atomicAdd(&sh[bin[i]], 1);
  __syncthreads();
  if (threadIdx.x < 64) atomicAdd(&h[threadIdx.x], sh[threadIdx.x]);
}
// The naive count: every thread with a positive value adds 1 to the same address.
// Look in the SASS for what the compiler does with it (warp-aggregated atomics).
extern "C" __global__ void count_positive_naive(const float* x, int* out, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n && x[i] > 0.f) atomicAdd(out, 1);
}
// Integer warp reduction in one instruction (compute capability 8.0 and later), and __syncwarp.
extern "C" __global__ void count_redux(const float* x, int* out) {
  int p = x[blockIdx.x * blockDim.x + threadIdx.x] > 0.f;
  int c = __reduce_add_sync(0xffffffffu, p);
  __syncwarp();
  if ((threadIdx.x & 31) == 0) atomicAdd(out, c);
}
