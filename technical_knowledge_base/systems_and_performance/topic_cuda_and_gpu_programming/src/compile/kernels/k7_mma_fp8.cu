// One warp-wide tensor-core instruction written directly in PTX:
// mma.sync m16n8k32 with FP8 (e4m3) inputs and FP32 accumulators.
// Each of the 32 threads holds 4 registers of A, 2 of B and 4 of C/D.
// Needs sm_89 or later; the result is not run here (no NVIDIA GPU).
#include <cstdint>
extern "C" __global__ void mma_fp8_tile(const uint32_t* A, const uint32_t* B, float* D) {
  int lane = threadIdx.x & 31;
  uint32_t a0 = A[lane * 4 + 0], a1 = A[lane * 4 + 1], a2 = A[lane * 4 + 2], a3 = A[lane * 4 + 3];
  uint32_t b0 = B[lane * 2 + 0], b1 = B[lane * 2 + 1];
  float d0 = 0.f, d1 = 0.f, d2 = 0.f, d3 = 0.f;
  asm volatile(
    "mma.sync.aligned.m16n8k32.row.col.f32.e4m3.e4m3.f32 "
    "{%0,%1,%2,%3}, {%4,%5,%6,%7}, {%8,%9}, {%0,%1,%2,%3};\n"
    : "+f"(d0), "+f"(d1), "+f"(d2), "+f"(d3)
    : "r"(a0), "r"(a1), "r"(a2), "r"(a3), "r"(b0), "r"(b1));
  D[lane * 4 + 0] = d0; D[lane * 4 + 1] = d1; D[lane * 4 + 2] = d2; D[lane * 4 + 3] = d3;
}
