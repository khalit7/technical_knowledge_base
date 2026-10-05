// Vector add: one thread per element. The simplest kernel there is.
extern "C" __global__ void vadd(const float* a, const float* b, float* c, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;  // this thread's global index
  if (i < n)                                       // the last block may run past n
    c[i] = a[i] + b[i];                            // two loads, one add, one store
}
