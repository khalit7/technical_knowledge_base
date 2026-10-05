// Hopper's warpgroup MMA: four warps (128 threads) issue one asynchronous
// 64x64x16 FP16 multiply-accumulate whose A and B operands are read straight
// from shared memory through 64-bit "matrix descriptors" (start address, strides, swizzle).
// sm_90a only (the "a" means architecture-specific: it will not run on Blackwell).
// Compiled here, not run (no NVIDIA GPU); the descriptor layout is the simplest
// no-swizzle form and its numerical result is not verified.
#include <cstdint>
#include <cuda_fp16.h>
__device__ __forceinline__ uint64_t desc(const void* smem, uint32_t lbo, uint32_t sbo) {
  uint32_t a = static_cast<uint32_t>(__cvta_generic_to_shared(smem));
  uint64_t d = 0;
  d |= (uint64_t)((a & 0x3FFFF) >> 4);            // bits 0-13: start address / 16
  d |= (uint64_t)((lbo & 0x3FFFF) >> 4) << 16;    // bits 16-29: leading-dimension byte offset / 16
  d |= (uint64_t)((sbo & 0x3FFFF) >> 4) << 32;    // bits 32-45: stride-dimension byte offset / 16
  return d;                                       // bits 62-63 = 0: no swizzle
}
extern "C" __global__ void __launch_bounds__(128) wgmma_tile(const half* A, const half* B, float* C) {
  __shared__ alignas(128) half As[64 * 16];
  __shared__ alignas(128) half Bs[64 * 16];
  for (int i = threadIdx.x; i < 64 * 16; i += 128) { As[i] = A[i]; Bs[i] = B[i]; }
  __syncthreads();
  asm volatile("fence.proxy.async.shared::cta;\n" ::: "memory");   // make the stores visible to the async unit
  uint64_t da = desc(As, 128, 256), db = desc(Bs, 128, 256);
  float d[32];
#pragma unroll
  for (int i = 0; i < 32; ++i) d[i] = 0.f;
  asm volatile("wgmma.fence.sync.aligned;\n" ::: "memory");
  asm volatile(
    "{\n.reg .pred p;\nsetp.ne.b32 p, %34, 0;\n"
    "wgmma.mma_async.sync.aligned.m64n64k16.f32.f16.f16 "
    "{%0,%1,%2,%3,%4,%5,%6,%7,%8,%9,%10,%11,%12,%13,%14,%15,%16,%17,%18,%19,%20,%21,%22,%23,%24,%25,%26,%27,%28,%29,%30,%31}, %32, %33, p, 1, 1, 0, 0;\n}\n"
    : "+f"(d[0]), "+f"(d[1]), "+f"(d[2]), "+f"(d[3]), "+f"(d[4]), "+f"(d[5]), "+f"(d[6]), "+f"(d[7]), "+f"(d[8]), "+f"(d[9]), "+f"(d[10]), "+f"(d[11]), "+f"(d[12]), "+f"(d[13]), "+f"(d[14]), "+f"(d[15]), "+f"(d[16]), "+f"(d[17]), "+f"(d[18]), "+f"(d[19]), "+f"(d[20]), "+f"(d[21]), "+f"(d[22]), "+f"(d[23]), "+f"(d[24]), "+f"(d[25]), "+f"(d[26]), "+f"(d[27]), "+f"(d[28]), "+f"(d[29]), "+f"(d[30]), "+f"(d[31])
    : "l"(da), "l"(db), "r"(1));
  asm volatile("wgmma.commit_group.sync.aligned;\n" ::: "memory");
  asm volatile("wgmma.wait_group.sync.aligned 0;\n" ::: "memory");
#pragma unroll
  for (int i = 0; i < 32; ++i) C[threadIdx.x * 32 + i] = d[i];   // fragment order, not row-major
}
