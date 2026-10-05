// The dot product four ways. This file is compiled twice: once as written, once with -ffast-math.
#include <arm_neon.h>
#include <cstddef>

// 1. Scalar: the loop as written. vectorize(disable) forbids the compiler from using SIMD here.
float dot_scalar(const float* a, const float* b, size_t n) {
  float s = 0;
#pragma clang loop vectorize(disable) interleave(disable)
  for (size_t i = 0; i < n; ++i) s += a[i] * b[i];
  return s;
}

// 2. Left to the compiler. Without -ffast-math it may not reorder float additions, so it cannot vectorise.
float dot_auto(const float* a, const float* b, size_t n) {
  float s = 0;
  for (size_t i = 0; i < n; ++i) s += a[i] * b[i];
  return s;
}

// 3. NEON intrinsics: 4 floats per register, 4 independent accumulators (16 running sums).
float dot_neon(const float* a, const float* b, size_t n) {
  float32x4_t s0 = vdupq_n_f32(0), s1 = s0, s2 = s0, s3 = s0;
  size_t i = 0;
  for (; i + 16 <= n; i += 16) {
    s0 = vfmaq_f32(s0, vld1q_f32(a + i),      vld1q_f32(b + i));       // s0 += a[i..i+3] * b[i..i+3]
    s1 = vfmaq_f32(s1, vld1q_f32(a + i + 4),  vld1q_f32(b + i + 4));
    s2 = vfmaq_f32(s2, vld1q_f32(a + i + 8),  vld1q_f32(b + i + 8));
    s3 = vfmaq_f32(s3, vld1q_f32(a + i + 12), vld1q_f32(b + i + 12));
  }
  float s = vaddvq_f32(vaddq_f32(vaddq_f32(s0, s1), vaddq_f32(s2, s3)));  // add the 16 lanes together
  for (; i < n; ++i) s += a[i] * b[i];                                    // leftover elements
  return s;
}
