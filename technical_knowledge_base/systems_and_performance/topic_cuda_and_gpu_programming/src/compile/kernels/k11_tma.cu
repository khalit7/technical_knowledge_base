// TMA (Tensor Memory Accelerator): one thread asks the copy engine to move a whole
// 2D tile from global to shared memory, described by a CUtensorMap built on the host.
// Completion is tracked by an mbarrier (a hardware barrier object in shared memory).
// The kernel is also launched as a 2-block cluster (__cluster_dims__), Hopper's grouping
// of blocks that can read each other's shared memory. Compiled here, not run.
#include <cuda.h>
#include <cstdint>
extern "C" __global__ void __cluster_dims__(2, 1, 1) __launch_bounds__(128)
tma_tile(const __grid_constant__ CUtensorMap map, float* out) {
  __shared__ alignas(128) float tile[32 * 32];
  __shared__ alignas(8) uint64_t bar;
  uint32_t bar_s = static_cast<uint32_t>(__cvta_generic_to_shared(&bar));
  uint32_t dst = static_cast<uint32_t>(__cvta_generic_to_shared(tile));
  if (threadIdx.x == 0) {
    asm volatile("mbarrier.init.shared::cta.b64 [%0], 1;\n" :: "r"(bar_s));
    asm volatile("fence.proxy.async.shared::cta;\n" ::: "memory");
    asm volatile("mbarrier.arrive.expect_tx.shared::cta.b64 _, [%0], %1;\n" :: "r"(bar_s), "r"(32 * 32 * 4));
    int x = 0, y = blockIdx.x * 32;                  // tile coordinates in the tensor
    asm volatile("cp.async.bulk.tensor.2d.shared::cluster.global.mbarrier::complete_tx::bytes"
                 " [%0], [%1, {%2, %3}], [%4];\n"
                 :: "r"(dst), "l"(&map), "r"(x), "r"(y), "r"(bar_s) : "memory");
  }
  __syncthreads();
  asm volatile("{\n.reg .pred P1;\nWAIT:\n"
               "mbarrier.try_wait.parity.shared::cta.b64 P1, [%0], 0;\n"
               "@!P1 bra WAIT;\n}\n" :: "r"(bar_s));
  for (int i = threadIdx.x; i < 32 * 32; i += 128) out[blockIdx.x * 1024 + i] = tile[i];
}
