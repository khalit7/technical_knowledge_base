// Inline PTX: reading registers CUDA C++ has no name for, and choosing an exact instruction.
#include <cstdint>
__device__ __forceinline__ uint32_t smid() { uint32_t r; asm volatile("mov.u32 %0, %%smid;" : "=r"(r)); return r; }
__device__ __forceinline__ uint32_t laneid() { uint32_t r; asm("mov.u32 %0, %%laneid;" : "=r"(r)); return r; }
__device__ __forceinline__ uint64_t globaltimer() { uint64_t t; asm volatile("mov.u64 %0, %%globaltimer;" : "=l"(t)); return t; }
// a load that streams past L1 (evict-first), spelled as one PTX instruction
__device__ __forceinline__ float ld_stream(const float* p) { float v; asm volatile("ld.global.cs.f32 %0, [%1];" : "=f"(v) : "l"(p)); return v; }
extern "C" __global__ void where_am_i(const float* x, uint32_t* sm, uint64_t* t, float* y) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (laneid() == 0) { sm[i >> 5] = smid(); t[i >> 5] = globaltimer(); }
  y[i] = ld_stream(x + i) * 2.0f;
}
