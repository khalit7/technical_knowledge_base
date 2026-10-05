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
// tcgen05.mma kind::f16 (FP16/BF16 inputs, FP32 accumulator in TMEM), one CTA.
// Compiled here for eight targets, not run (no NVIDIA GPU); numerical result not verified.
extern "C" __global__ void __launch_bounds__(128) tc05_f16(const uint32_t* A, const uint32_t* B, const uint32_t* SF, float* C, uint32_t idesc) {
  __shared__ alignas(128) uint32_t As[128 * 8];
  __shared__ alignas(128) uint32_t Bs[128 * 8];
  __shared__ uint32_t tmem_base;
  __shared__ alignas(8) uint64_t mbar;
  int warp = threadIdx.x >> 5;
  for (int i = threadIdx.x; i < 128 * 8; i += 128) { As[i] = A[i]; Bs[i] = B[i]; }
  uint32_t mbar_s = static_cast<uint32_t>(__cvta_generic_to_shared(&mbar));
  if (threadIdx.x == 0) asm volatile("mbarrier.init.shared::cta.b64 [%0], 1;\n" :: "r"(mbar_s));
  if (warp == 0) {                                 // one warp allocates TMEM columns (a power of two, at least 32)
    uint32_t dst = static_cast<uint32_t>(__cvta_generic_to_shared(&tmem_base));
    asm volatile("tcgen05.alloc.cta_group::1.sync.aligned.shared::cta.b32 [%0], 256;\n" :: "r"(dst));
    asm volatile("tcgen05.relinquish_alloc_permit.cta_group::1.sync.aligned;\n");
  }
  asm volatile("fence.proxy.async.shared::cta;\n" ::: "memory");
  asm volatile("tcgen05.fence::before_thread_sync;\n" ::: "memory");
  __syncthreads();
  asm volatile("tcgen05.fence::after_thread_sync;\n" ::: "memory");
  uint32_t tmem = tmem_base;
  if (threadIdx.x == 0) {                          // a single thread issues the MMA for the whole CTA
    uint64_t da = desc(As, 128, 256, 1), db = desc(Bs, 128, 256, 1);
    asm volatile("{\n.reg .pred p;\nsetp.ne.b32 p, %4, 0;\n"
                 "tcgen05.mma.cta_group::1.kind::f16 [%0], %1, %2, %3, p;\n}\n"
                 :: "r"(tmem), "l"(da), "l"(db), "r"(idesc), "r"(0));
    asm volatile("tcgen05.commit.cta_group::1.mbarrier::arrive::one.shared::cluster.b64 [%0];\n" :: "r"(mbar_s));
  }
  asm volatile("{\n.reg .pred P1;\nWAIT:\n"
               "mbarrier.try_wait.parity.shared::cta.b64 P1, [%0], 0;\n"
               "@!P1 bra WAIT;\n}\n" :: "r"(mbar_s));
  asm volatile("tcgen05.fence::after_thread_sync;\n" ::: "memory");
  uint32_t r[8];                                   // the epilogue: each warp reads its 32 TMEM lanes, 8 columns
  uint32_t taddr = tmem + ((warp * 32) << 16);
  asm volatile("tcgen05.ld.sync.aligned.32x32b.x8.b32 {%0,%1,%2,%3,%4,%5,%6,%7}, [%8];\n"
               : "=r"(r[0]), "=r"(r[1]), "=r"(r[2]), "=r"(r[3]), "=r"(r[4]), "=r"(r[5]), "=r"(r[6]), "=r"(r[7])
               : "r"(taddr));
  asm volatile("tcgen05.wait::ld.sync.aligned;\n" ::: "memory");
#pragma unroll
  for (int i = 0; i < 8; ++i) C[threadIdx.x * 8 + i] = __uint_as_float(r[i]);
  __syncthreads();
  if (warp == 0) asm volatile("tcgen05.dealloc.cta_group::1.sync.aligned.b32 %0, 256;\n" :: "r"(tmem));
}
