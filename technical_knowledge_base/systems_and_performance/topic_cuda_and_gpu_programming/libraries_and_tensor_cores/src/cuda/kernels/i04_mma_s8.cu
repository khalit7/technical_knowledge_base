#include <cstdint>
#include <cuda_fp16.h>
// mma.sync m16n8k32, INT8 inputs, INT32 accumulate (IMMA).
// Compiled here for eight targets, not run (no NVIDIA GPU).
extern "C" __global__ void mma_s8(const uint32_t* A, const uint32_t* B, int* D) {
  int lane = threadIdx.x & 31;
  uint32_t a[4], b[2]; int d[4];
  for (int i = 0; i < 4; ++i) a[i] = A[lane * 4 + i];
  for (int i = 0; i < 2; ++i) b[i] = B[lane * 2 + i];
  for (int i = 0; i < 4; ++i) d[i] = 0;
  asm volatile("mma.sync.aligned.m16n8k32.row.col.s32.s8.s8.s32 {%0,%1,%2,%3}, {%4,%5,%6,%7}, {%8,%9}, {%0,%1,%2,%3};\n"
    : "+r"(d[0]), "+r"(d[1]), "+r"(d[2]), "+r"(d[3])
    : "r"(a[0]), "r"(a[1]), "r"(a[2]), "r"(a[3]), "r"(b[0]), "r"(b[1]));
  for (int i = 0; i < 4; ++i) D[lane * 4 + i] = d[i];
}
