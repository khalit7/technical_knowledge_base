// A templated kernel: each instantiation is its own symbol, named by C++ name mangling.
template <typename T, int BLOCK>
__global__ void scale(const T* x, T* y, T a, int n) {
  int i = blockIdx.x * BLOCK + threadIdx.x;
  if (i < n) y[i] = a * x[i];
}
template __global__ void scale<float, 256>(const float*, float*, float, int);
template __global__ void scale<double, 128>(const double*, double*, double, int);
