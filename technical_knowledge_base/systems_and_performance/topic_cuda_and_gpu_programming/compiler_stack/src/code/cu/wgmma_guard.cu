// The same kind of Hopper-only instruction, guarded so that the generic compute_90 PTX that -arch=sm_90a also emits still compiles.
extern "C" __global__ void fence_only(int* flag) {
#if defined(__CUDA_ARCH_FEAT_SM90_ALL)
  asm volatile("wgmma.fence.sync.aligned;\n" ::: "memory");   // only in the sm_90a / compute_90a pass
  flag[0] = 1;
#else
  flag[0] = 0;                                                 // the portable compute_90 pass
#endif
}
