#include <cstdint>
#include <cuda_fp16.h>
// mma.sync m16n8k16, BF16 inputs, FP32 accumulate.
// Compiled here for eight targets, not run (no NVIDIA GPU).
extern "C" __global__ void mma_bf16(const uint32_t* A, const uint32_t* B, float* D) {
  int lane = threadIdx.x & 31;
  uint32_t a[4], b[2]; float d[4];
  for (int i = 0; i < 4; ++i) a[i] = A[lane * 4 + i];
  for (int i = 0; i < 2; ++i) b[i] = B[lane * 2 + i];
  for (int i = 0; i < 4; ++i) d[i] = 0;
  asm volatile("mma.sync.aligned.m16n8k16.row.col.f32.bf16.bf16.f32 {%0,%1,%2,%3}, {%4,%5,%6,%7}, {%8,%9}, {%0,%1,%2,%3};\n"
    : "+f"(d[0]), "+f"(d[1]), "+f"(d[2]), "+f"(d[3])
    : "r"(a[0]), "r"(a[1]), "r"(a[2]), "r"(a[3]), "r"(b[0]), "r"(b[1]));
  for (int i = 0; i < 4; ++i) D[lane * 4 + i] = d[i];
}
