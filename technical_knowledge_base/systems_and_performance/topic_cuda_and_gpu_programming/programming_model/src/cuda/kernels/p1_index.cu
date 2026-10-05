// Indexing: one thread per element, a grid-stride loop, and a 2D grid over a matrix.
// One thread per element: the grid must cover n, so the host launches ceil(n / block) blocks.
extern "C" __global__ void scale_1d(const float* x, float* y, float a, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;   // global index of this thread
  if (i < n) y[i] = a * x[i];                      // the last block may run past n
}
// Grid-stride loop: any grid size works; each thread strides by the whole grid.
extern "C" __global__ void scale_stride(const float* x, float* y, float a, int n) {
  for (int i = blockIdx.x * blockDim.x + threadIdx.x; i < n; i += gridDim.x * blockDim.x)
    y[i] = a * x[i];
}
// 2D: a dim3 grid of dim3 blocks; x indexes columns so neighbouring threads touch neighbouring addresses.
extern "C" __global__ void scale_2d(const float* x, float* y, float a, int rows, int cols) {
  int c = blockIdx.x * blockDim.x + threadIdx.x;
  int r = blockIdx.y * blockDim.y + threadIdx.y;
  if (r < rows && c < cols) y[r * cols + c] = a * x[r * cols + c];
}
