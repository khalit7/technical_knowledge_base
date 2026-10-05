#include <cstdint>
#include <cuda_fp16.h>
// setmaxnreg: Hopper's register hand-off between warpgroups in a warp-specialised kernel.
// The producer warpgroup (TMA only) gives registers back; the consumer warpgroups (MMA) take them.
// Compiled here for eight targets, not run.
extern "C" __global__ void __launch_bounds__(384, 1) wspec(float* out) {
  int wg = threadIdx.x / 128;
  if (wg == 0) {
    asm volatile("setmaxnreg.dec.sync.aligned.u32 40;\n");
    out[threadIdx.x] = 1.f;
  } else {
    asm volatile("setmaxnreg.inc.sync.aligned.u32 232;\n");
    out[threadIdx.x] = 2.f;
  }
}
