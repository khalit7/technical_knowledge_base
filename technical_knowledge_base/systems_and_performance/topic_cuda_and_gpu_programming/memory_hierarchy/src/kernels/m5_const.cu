// Constant memory and kernel parameters. A uniform index (every lane the same address)
// is served as an operand straight from the constant bank; a per-lane index is not.
__constant__ float c_tab[1024];
struct Params { float scale; float bias; int n; };
extern "C" __global__ void const_uniform(float* __restrict__ y, int k) {
  int i = blockIdx.x * blockDim.x + threadIdx.x; y[i] = y[i] * c_tab[k] + c_tab[k + 1]; }
extern "C" __global__ void const_perlane(float* __restrict__ y) {
  int i = blockIdx.x * blockDim.x + threadIdx.x; y[i] = y[i] * c_tab[threadIdx.x]; }
extern "C" __global__ void param_struct(float* __restrict__ y, Params p) {
  int i = blockIdx.x * blockDim.x + threadIdx.x; if (i < p.n) y[i] = y[i] * p.scale + p.bias; }
extern "C" __global__ void const_fixed(float* __restrict__ y) {
  int i = blockIdx.x * blockDim.x + threadIdx.x; y[i] = y[i] * c_tab[3] + c_tab[4]; }   // index known at compile time
