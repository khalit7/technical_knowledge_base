#include <cstdint>
#include <cuda_fp16.h>
#include <cuda.h>
// TMA from the programmer's side, three forms in one kernel launched as a 2-block cluster:
// (1) a 2D tile load into shared memory, completion counted in bytes on an mbarrier;
// (2) the same load multicast: one copy lands in the shared memory of every CTA in ctaMask;
// (3) a 2D tile store from shared memory back to global, tracked by a bulk group.
// The CUtensorMap (shape, strides, box size, swizzle) is built on the host. Compiled here, not run.
extern "C" __global__ void __cluster_dims__(2, 1, 1) __launch_bounds__(128)
tma_forms(const __grid_constant__ CUtensorMap in, const __grid_constant__ CUtensorMap out) {
  __shared__ alignas(1024) half tile[64 * 64];
  __shared__ alignas(1024) half tile2[64 * 64];
  __shared__ alignas(8) uint64_t bar;
  uint32_t bar_s = static_cast<uint32_t>(__cvta_generic_to_shared(&bar));
  uint32_t dst = static_cast<uint32_t>(__cvta_generic_to_shared(tile));
  uint32_t dst2 = static_cast<uint32_t>(__cvta_generic_to_shared(tile2));
  int x = 0, y = blockIdx.x * 64;
  if (threadIdx.x == 0) {
    asm volatile("mbarrier.init.shared::cta.b64 [%0], 1;\n" :: "r"(bar_s));
    asm volatile("fence.mbarrier_init.release.cluster;\n" ::: "memory");
  }
  asm volatile("barrier.cluster.arrive.release.aligned;\nbarrier.cluster.wait.acquire.aligned;\n" ::: "memory");
  if (threadIdx.x == 0) {
    asm volatile("mbarrier.arrive.expect_tx.shared::cta.b64 _, [%0], %1;\n" :: "r"(bar_s), "r"(2 * 64 * 64 * 2));
    asm volatile("cp.async.bulk.tensor.2d.shared::cluster.global.mbarrier::complete_tx::bytes [%0], [%1, {%2, %3}], [%4];\n"
                 :: "r"(dst), "l"(&in), "r"(x), "r"(y), "r"(bar_s) : "memory");
    uint16_t mask = 0x3;                           // both CTAs of the cluster receive the tile
    if (blockIdx.x % 2 == 0)
      asm volatile("cp.async.bulk.tensor.2d.shared::cluster.global.mbarrier::complete_tx::bytes.multicast::cluster [%0], [%1, {%2, %3}], [%4], %5;\n"
                   :: "r"(dst2), "l"(&in), "r"(x + 64), "r"(y), "r"(bar_s), "h"(mask) : "memory");
  }
  asm volatile("{\n.reg .pred P1;\nWAIT:\n"
               "mbarrier.try_wait.parity.shared::cta.b64 P1, [%0], 0;\n"
               "@!P1 bra WAIT;\n}\n" :: "r"(bar_s));
  for (int i = threadIdx.x; i < 64 * 64; i += 128) tile[i] = __hadd(tile[i], tile2[i]);
  asm volatile("fence.proxy.async.shared::cta;\n" ::: "memory");
  __syncthreads();
  if (threadIdx.x == 0) {
    asm volatile("cp.async.bulk.tensor.2d.global.shared::cta.bulk_group [%0, {%1, %2}], [%3];\n"
                 :: "l"(&out), "r"(x), "r"(y), "r"(dst) : "memory");
    asm volatile("cp.async.bulk.commit_group;\ncp.async.bulk.wait_group.read 0;\n" ::: "memory");
  }
  asm volatile("barrier.cluster.arrive.release.aligned;\nbarrier.cluster.wait.acquire.aligned;\n" ::: "memory");
}
