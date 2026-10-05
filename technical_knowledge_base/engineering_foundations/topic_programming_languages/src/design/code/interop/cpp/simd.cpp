#include <arm_neon.h>
#include <cstdio>
int main() {
    float a[4] = {1, 2, 3, 4}, b[4] = {10, 20, 30, 40}, c[4];
    float32x4_t va = vld1q_f32(a), vb = vld1q_f32(b);   // 4 floats in one 128-bit register
    vst1q_f32(c, vaddq_f32(va, vb));                     // 4 additions, one instruction
    std::printf("%g %g %g %g\n", c[0], c[1], c[2], c[3]);
}
