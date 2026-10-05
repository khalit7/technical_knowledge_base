// Load width and layout: the same copy written with 4-, 8- and 16-byte accesses,
// and one field read from an array of structs (AoS) against a struct of arrays (SoA).
struct P8 { float x, y, z, vx, vy, vz, m, q; };   // 32 bytes per particle
extern "C" __global__ void copy_f1(const float* __restrict__ a, float* __restrict__ b, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x; if (i < n) b[i] = a[i]; }
extern "C" __global__ void copy_f2(const float2* __restrict__ a, float2* __restrict__ b, int n2) {
  int i = blockIdx.x * blockDim.x + threadIdx.x; if (i < n2) b[i] = a[i]; }
extern "C" __global__ void copy_f4(const float4* __restrict__ a, float4* __restrict__ b, int n4) {
  int i = blockIdx.x * blockDim.x + threadIdx.x; if (i < n4) b[i] = a[i]; }
extern "C" __global__ void field_aos(const P8* __restrict__ p, float* __restrict__ out, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x; if (i < n) out[i] = p[i].x; }
extern "C" __global__ void field_soa(const float* __restrict__ x, float* __restrict__ out, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x; if (i < n) out[i] = x[i]; }
