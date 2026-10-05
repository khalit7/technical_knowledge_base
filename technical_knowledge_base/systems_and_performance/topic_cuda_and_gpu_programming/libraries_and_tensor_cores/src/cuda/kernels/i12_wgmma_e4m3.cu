#include <cstdint>
#include <cuda_fp16.h>
__device__ __forceinline__ uint64_t desc(const void* smem, uint32_t lbo, uint32_t sbo, int version) {
  uint32_t a = static_cast<uint32_t>(__cvta_generic_to_shared(smem));
  uint64_t d = 0;
  d |= (uint64_t)((a & 0x3FFFF) >> 4);            // start address / 16
  d |= (uint64_t)((lbo & 0x3FFFF) >> 4) << 16;    // leading-dimension byte offset / 16
  d |= (uint64_t)((sbo & 0x3FFFF) >> 4) << 32;    // stride-dimension byte offset / 16
  d |= (uint64_t)version << 46;                   // Blackwell descriptors carry version 1; Hopper 0
  return d;                                       // top bits 0: no swizzle
}
// wgmma m64n128k32 FP8 E4M3 -> FP32 (Hopper's native FP8 path).
// sm_90a only by design. Compiled here for eight targets, not run (no NVIDIA GPU).
extern "C" __global__ void __launch_bounds__(128) wgmma_e4m3(const uint32_t* A, const uint32_t* B, float* C) {
  __shared__ alignas(128) uint32_t As[64 * 8];
  __shared__ alignas(128) uint32_t Bs[128 * 8];
  for (int i = threadIdx.x; i < 64 * 8; i += 128) As[i] = A[i];
  for (int i = threadIdx.x; i < 128 * 8; i += 128) Bs[i] = B[i];
  __syncthreads();
  asm volatile("fence.proxy.async.shared::cta;\n" ::: "memory");
  uint64_t da = desc(As, 128, 256, 0), db = desc(Bs, 128, 256, 0);
  float d[64];
#pragma unroll
  for (int i = 0; i < 64; ++i) d[i] = 0.f;
  asm volatile("wgmma.fence.sync.aligned;\n" ::: "memory");
  asm volatile("{\n.reg .pred p;\nsetp.ne.b32 p, %66, 0;\n"
    "wgmma.mma_async.sync.aligned.m64n128k32.f32.e4m3.e4m3 {%0,%1,%2,%3,%4,%5,%6,%7,%8,%9,%10,%11,%12,%13,%14,%15,%16,%17,%18,%19,%20,%21,%22,%23,%24,%25,%26,%27,%28,%29,%30,%31,%32,%33,%34,%35,%36,%37,%38,%39,%40,%41,%42,%43,%44,%45,%46,%47,%48,%49,%50,%51,%52,%53,%54,%55,%56,%57,%58,%59,%60,%61,%62,%63}, %64, %65, p, 1, 1;\n}\n"
    : "+f"(d[0]), "+f"(d[1]), "+f"(d[2]), "+f"(d[3]), "+f"(d[4]), "+f"(d[5]), "+f"(d[6]), "+f"(d[7]), "+f"(d[8]), "+f"(d[9]), "+f"(d[10]), "+f"(d[11]), "+f"(d[12]), "+f"(d[13]), "+f"(d[14]), "+f"(d[15]), "+f"(d[16]), "+f"(d[17]), "+f"(d[18]), "+f"(d[19]), "+f"(d[20]), "+f"(d[21]), "+f"(d[22]), "+f"(d[23]), "+f"(d[24]), "+f"(d[25]), "+f"(d[26]), "+f"(d[27]), "+f"(d[28]), "+f"(d[29]), "+f"(d[30]), "+f"(d[31]), "+f"(d[32]), "+f"(d[33]), "+f"(d[34]), "+f"(d[35]), "+f"(d[36]), "+f"(d[37]), "+f"(d[38]), "+f"(d[39]), "+f"(d[40]), "+f"(d[41]), "+f"(d[42]), "+f"(d[43]), "+f"(d[44]), "+f"(d[45]), "+f"(d[46]), "+f"(d[47]), "+f"(d[48]), "+f"(d[49]), "+f"(d[50]), "+f"(d[51]), "+f"(d[52]), "+f"(d[53]), "+f"(d[54]), "+f"(d[55]), "+f"(d[56]), "+f"(d[57]), "+f"(d[58]), "+f"(d[59]), "+f"(d[60]), "+f"(d[61]), "+f"(d[62]), "+f"(d[63])
    : "l"(da), "l"(db), "r"(1));
  asm volatile("wgmma.commit_group.sync.aligned;\n" ::: "memory");
  asm volatile("wgmma.wait_group.sync.aligned 0;\n" ::: "memory");
#pragma unroll
  for (int i = 0; i < 64; ++i) C[threadIdx.x * 64 + i] = d[i];   // fragment order
}
