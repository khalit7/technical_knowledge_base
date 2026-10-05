// One kernel, compiled under different register caps (-maxrregcount): each thread keeps
// 128 running sums, as a register-tiled matmul keeps a 128-element piece of C.
__constant__ float c_w[128];
extern "C" __global__ void acc128(const float* __restrict__ x, float* __restrict__ y, int K) {
  float acc[128];
#pragma unroll
  for (int j = 0; j < 128; ++j) acc[j] = 0.f;
  int t = blockIdx.x * blockDim.x + threadIdx.x, T = gridDim.x * blockDim.x;
  for (int k = 0; k < K; ++k) {
    float xv = x[k * T + t];
#pragma unroll
    for (int j = 0; j < 128; ++j) acc[j] = fmaf(xv, c_w[j], acc[j] * 0.999f);
  }
#pragma unroll
  for (int j = 0; j < 128; ++j) y[j * T + t] = acc[j];
}
