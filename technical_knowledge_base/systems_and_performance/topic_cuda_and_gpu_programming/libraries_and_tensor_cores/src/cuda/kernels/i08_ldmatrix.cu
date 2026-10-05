#include <cstdint>
#include <cuda_fp16.h>
// ldmatrix: one warp loads four 8x8 tiles of 16-bit values from shared memory straight into
// the register fragment layout mma.sync expects (LDSM); .trans transposes on the way.
// stmatrix (sm_90 and later) is the reverse, used by epilogues. Compiled here, not run.
extern "C" __global__ void ldsm(const half* G, uint32_t* out) {
  __shared__ alignas(128) half s[64 * 8];
  for (int i = threadIdx.x; i < 64 * 8; i += 32) s[i] = G[i];
  __syncwarp();
  int lane = threadIdx.x & 31;
  uint32_t addr = static_cast<uint32_t>(__cvta_generic_to_shared(&s[lane * 8]));  // lane i gives row i's address
  uint32_t r0, r1, r2, r3, t0, t1, t2, t3;
  asm volatile("ldmatrix.sync.aligned.m8n8.x4.shared.b16 {%0,%1,%2,%3}, [%4];\n" : "=r"(r0), "=r"(r1), "=r"(r2), "=r"(r3) : "r"(addr));
  asm volatile("ldmatrix.sync.aligned.m8n8.x4.trans.shared.b16 {%0,%1,%2,%3}, [%4];\n" : "=r"(t0), "=r"(t1), "=r"(t2), "=r"(t3) : "r"(addr));
  out[lane * 8 + 0] = r0; out[lane * 8 + 1] = r1; out[lane * 8 + 2] = r2; out[lane * 8 + 3] = r3;
  out[lane * 8 + 4] = t0; out[lane * 8 + 5] = t1; out[lane * 8 + 6] = t2; out[lane * 8 + 7] = t3;
#if __CUDA_ARCH__ >= 900
  __syncwarp();
  asm volatile("stmatrix.sync.aligned.m8n8.x4.shared.b16 [%0], {%1,%2,%3,%4};\n" :: "r"(addr), "r"(r0), "r"(r1), "r"(r2), "r"(r3) : "memory");
  __syncwarp();
  out[256 + lane] = reinterpret_cast<const uint32_t*>(s)[lane];
#endif
}
