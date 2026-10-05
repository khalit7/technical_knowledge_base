// Four ways to write e^x in a kernel, compiled to compare what each becomes.
// expf: accurate (max error 2 ulp, CUDA Programming Guide); __expf: the fast intrinsic;
// inline PTX ex2.approx: what the intrinsic is made of; expf under -use_fast_math becomes __expf.
extern "C" __global__ void k_expf(const float* x, float* y, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = expf(x[i]);
}
extern "C" __global__ void k_fast(const float* x, float* y, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = __expf(x[i]);
}
__device__ __forceinline__ float ex2_approx(float v) {
  float r;
  asm("ex2.approx.ftz.f32 %0, %1;" : "=f"(r) : "f"(v));   // inline PTX: one instruction, our choice
  return r;
}
extern "C" __global__ void k_inline(const float* x, float* y, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = ex2_approx(x[i] * 1.4426950408889634f);  // e^x = 2^(x log2 e)
}
