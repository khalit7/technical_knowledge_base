// Cache operators: the same load with different hints. Each kernel is one load and one store.
extern "C" __global__ void ld_plain(const float* a, float* b) { int i = threadIdx.x + blockIdx.x * blockDim.x; b[i] = a[i]; }
extern "C" __global__ void ld_restrict(const float* __restrict__ a, float* __restrict__ b) { int i = threadIdx.x + blockIdx.x * blockDim.x; b[i] = a[i]; }
extern "C" __global__ void ld_ldg(const float* a, float* b) { int i = threadIdx.x + blockIdx.x * blockDim.x; b[i] = __ldg(a + i); }
extern "C" __global__ void ld_ldcg(const float* a, float* b) { int i = threadIdx.x + blockIdx.x * blockDim.x; b[i] = __ldcg(a + i); }
extern "C" __global__ void ld_ldcs(const float* a, float* b) { int i = threadIdx.x + blockIdx.x * blockDim.x; b[i] = __ldcs(a + i); }
extern "C" __global__ void ld_ldlu(const float* a, float* b) { int i = threadIdx.x + blockIdx.x * blockDim.x; b[i] = __ldlu(a + i); }
extern "C" __global__ void ld_ldcv(const float* a, float* b) { int i = threadIdx.x + blockIdx.x * blockDim.x; b[i] = __ldcv(a + i); }
extern "C" __global__ void st_stcs(const float* a, float* b) { int i = threadIdx.x + blockIdx.x * blockDim.x; __stcs(b + i, a[i]); }
extern "C" __global__ void st_stwt(const float* a, float* b) { int i = threadIdx.x + blockIdx.x * blockDim.x; __stwt(b + i, a[i]); }
