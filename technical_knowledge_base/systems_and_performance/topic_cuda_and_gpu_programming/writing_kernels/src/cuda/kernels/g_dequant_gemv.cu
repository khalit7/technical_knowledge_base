// One-token GEMV with 4-bit weights, dequantised in registers (the same format as the M1 kernel: eight 4-bit codes
// per uint32, a float16 scale and bias per group of 64). One warp per output row, lane l reads words l, l + 32, ...
#include <cuda_fp16.h>
extern "C" __global__ void dequant_gemv(const unsigned* wq, const __half* scales, const __half* biases,
                                        const __half* x, float* y, int K) {
  int row = blockIdx.x * 8 + threadIdx.x / 32, lane = threadIdx.x % 32, W8 = K / 8, G = K / 64;
  const unsigned* w = wq + (size_t)row * W8;
  float acc = 0.f;
  for (int j = lane; j < W8; j += 32) {
    unsigned word = w[j]; float s = __half2float(scales[row * G + j / 8]), b = __half2float(biases[row * G + j / 8]);
    float d = 0.f, xs = 0.f;
#pragma unroll
    for (int c = 0; c < 8; ++c) { float xv = __half2float(x[8 * j + c]); d += float((word >> (4 * c)) & 0xF) * xv; xs += xv; }
    acc += s * d + b * xs;
  }
  for (int o = 16; o > 0; o >>= 1) acc += __shfl_down_sync(0xffffffffu, acc, o);
  if (lane == 0) y[row] = acc;
}
