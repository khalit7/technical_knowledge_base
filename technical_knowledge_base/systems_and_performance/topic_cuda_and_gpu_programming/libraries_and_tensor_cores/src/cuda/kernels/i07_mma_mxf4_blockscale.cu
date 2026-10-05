#include <cstdint>
#include <cuda_fp16.h>
// mma.sync m16n8k64 kind::mxf4 block_scale: FP4 (E2M1) inputs, one 8-bit power-of-two
// scale (UE8M0) per 32 elements along K for A and for B, FP32 accumulate. sm_120a.
// Compiled here for eight targets, not run (no NVIDIA GPU).
extern "C" __global__ void mma_mxf4(const uint32_t* A, const uint32_t* B, const uint32_t* S, float* D) {
  int lane = threadIdx.x & 31;
  uint32_t a0 = A[lane*4], a1 = A[lane*4+1], a2 = A[lane*4+2], a3 = A[lane*4+3], b0 = B[lane*2], b1 = B[lane*2+1];
  uint32_t sa = S[lane], sb = S[32 + lane];
  float d0 = 0, d1 = 0, d2 = 0, d3 = 0;
  asm volatile("mma.sync.aligned.m16n8k64.row.col.kind::mxf4.block_scale.scale_vec::2X.f32.e2m1.e2m1.f32.ue8m0 "
               "{%0,%1,%2,%3}, {%4,%5,%6,%7}, {%8,%9}, {%0,%1,%2,%3}, %10, {0, 0}, %11, {0, 0};\n"
               : "+f"(d0), "+f"(d1), "+f"(d2), "+f"(d3)
               : "r"(a0), "r"(a1), "r"(a2), "r"(a3), "r"(b0), "r"(b1), "r"(sa), "r"(sb));
  D[lane*4] = d0; D[lane*4+1] = d1; D[lane*4+2] = d2; D[lane*4+3] = d3;
}
