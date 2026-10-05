"""Decode-time matrix-vector product with 4-bit weights (dequantize fused into the GEMV), Metal kernel bodies.

y = W x for one token: W is N_out x K, stored in MLX's own affine 4-bit format (mx.quantize, group size 64):
  wq     N_out x K/8 uint32, eight 4-bit codes per word, lowest bits first
  scales N_out x K/64 float16,  biases N_out x K/64 float16;  w = scale * code + bias
x is K float16; y is N_out float32. Every weight is used exactly once, so the kernel is bound by how
many bytes of W it reads: 2 bytes per weight in float16, 0.5 + 4/64 = 0.5625 bytes in this 4-bit format.
  Q1  one thread per output row (neighbouring threads read addresses a whole row apart)
  Q2  one SIMD-group per row, lane l reads words l, l + 32, ... (coalesced 4-byte loads)
  Q3  one SIMD-group per row, 16-byte loads (a uint4 = 32 codes = half a quantisation group per lane)
"""

Q1_THREAD = """
uint row = thread_position_in_grid.x, K = x_shape[0], W8 = K / 8, G = K / 64;
const device uint* w = wq + row * W8;
float acc = 0.0f;
for (uint j = 0; j < W8; ++j) {
  uint word = w[j]; float s = scales[row * G + j / 8], b = biases[row * G + j / 8];
  for (uint c = 0; c < 8; ++c) acc += (s * float((word >> (4 * c)) & 0xF) + b) * float(x[8 * j + c]);
}
y[row] = acc;
"""

Q2_SIMD = """
uint row = threadgroup_position_in_grid.x * 8 + simdgroup_index_in_threadgroup, lane = thread_index_in_simdgroup;
uint K = x_shape[0], W8 = K / 8, G = K / 64;
const device uint* w = wq + row * W8;
float acc = 0.0f;
for (uint j = lane; j < W8; j += 32) {
  uint word = w[j]; float s = scales[row * G + j / 8], b = biases[row * G + j / 8];
  float xs = 0.0f, d = 0.0f;
  for (uint c = 0; c < 8; ++c) { float xv = float(x[8 * j + c]); d += float((word >> (4 * c)) & 0xF) * xv; xs += xv; }
  acc += s * d + b * xs;                                // sum((s q + b) x) = s sum(q x) + b sum(x)
}
acc = simd_sum(acc);
if (lane == 0) y[row] = acc;
"""

Q3_VEC = """
uint row = threadgroup_position_in_grid.x * 8 + simdgroup_index_in_threadgroup, lane = thread_index_in_simdgroup;
uint K = x_shape[0], W32 = K / 32, G = K / 64;
const device uint4* w = (const device uint4*)wq + row * W32;
const device half4* x4 = (const device half4*)x;
float acc = 0.0f;
for (uint j = lane; j < W32; j += 32) {                 // 32 codes per lane per step
  uint4 word = w[j]; float s = scales[row * G + j / 2], b = biases[row * G + j / 2];
  float d = 0.0f, xs = 0.0f;
  for (uint e = 0; e < 4; ++e) {
    uint wd = word[e];
    float4 xa = float4(x4[8 * j + 2 * e]), xb = float4(x4[8 * j + 2 * e + 1]);
    float4 qa = float4(wd & 0xF, (wd >> 4) & 0xF, (wd >> 8) & 0xF, (wd >> 12) & 0xF);
    float4 qb = float4((wd >> 16) & 0xF, (wd >> 20) & 0xF, (wd >> 24) & 0xF, (wd >> 28) & 0xF);
    d += dot(qa, xa) + dot(qb, xb); xs += xa.x + xa.y + xa.z + xa.w + xb.x + xb.y + xb.z + xb.w;
  }
  acc += s * d + b * xs;
}
acc = simd_sum(acc);
if (lane == 0) y[row] = acc;
"""

# The float16 baseline written the same way as Q3 (16-byte loads, one SIMD-group per row), for a like-for-like
# comparison of bytes: 8 halves per lane per load.
H_VEC = """
uint row = threadgroup_position_in_grid.x * 8 + simdgroup_index_in_threadgroup, lane = thread_index_in_simdgroup;
uint K = x_shape[0], W8 = K / 8;
const device half4* w = (const device half4*)W + row * (K / 4);
const device half4* x4 = (const device half4*)x;
float acc = 0.0f;
for (uint j = lane; j < W8; j += 32) acc += dot(float4(w[2 * j]), float4(x4[2 * j])) + dot(float4(w[2 * j + 1]), float4(x4[2 * j + 1]));
acc = simd_sum(acc);
if (lane == 0) y[row] = acc;
"""
