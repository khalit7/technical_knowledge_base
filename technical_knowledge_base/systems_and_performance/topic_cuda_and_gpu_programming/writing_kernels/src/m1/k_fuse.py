"""Fusion around a matmul, as Metal kernel bodies for mx.fast.metal_kernel.

Base: the Kernel lab's M7 matmul (64 x 64 output tile per threadgroup of 4 SIMD-groups, 8 x 8 simdgroup
matrix instructions, A and B tiles staged in threadgroup memory), C = A B, A: M x K, B: K x N, float32.
  MM_PLAIN      the base, stores C                                  (then a separate bias + GELU kernel)
  BIAS_GELU     the separate elementwise kernel: y = gelu(c + bias), one read and one write of C
  MM_EPI        first attempt at epilogue fusion (16 KB staging tile, kept as a lesson; see MM_EPI3)
  MM_EPI3       epilogue fusion: the output tile goes to threadgroup memory, bias + GELU are applied there,
                and only the final y is written: C never exists in device memory
  MM_RMS        RMSNorm fused into the matmul: rmsnorm(x) W = diag(1 / rms(x)) (x (diag(gamma) W)).
                gamma is folded into W once, offline (W' = diag(gamma) W); the sum of squares of each row of A
                is accumulated from the A tiles the matmul loads anyway; the epilogue scales each output row.
  RMS_ONLY      the unfused alternative's first kernel: y = x / rms(x) * gamma, one row per threadgroup
GELU is the tanh approximation, 0.5 x (1 + tanh(0.79788456 (x + 0.044715 x^3))), in both paths, with Metal's fast::tanh
(HEADER_PRECISE swaps in precise::tanh for the lesson case).
"""

HEADER = '#include <metal_simdgroup_matrix>\n#define UNROLL _Pragma("clang loop unroll(full)")\n' + """
inline float gelu_t(float v) { return 0.5f * v * (1.0f + fast::tanh(0.79788456f * (v + 0.044715f * v * v * v))); }
"""
# The lesson case: the same epilogue with the IEEE-accurate tanh. Inside a memory-bound elementwise kernel its cost
# hides behind the memory traffic; inside a compute-bound matmul it is added to the matmul's own time (measured).
HEADER_PRECISE = HEADER.replace("fast::tanh", "precise::tanh")

_MAIN = """
uint tid = thread_position_in_threadgroup.x, sg = simdgroup_index_in_threadgroup;
uint R0 = threadgroup_position_in_grid.y * 64, C0 = threadgroup_position_in_grid.x * 64;
uint rs = (sg / 2) * 32, cs = (sg % 2) * 32;
uint K = A_shape[1], N = B_shape[1];
simdgroup_float8x8 acc[4][4];
UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) acc[i][j] = make_filled_simdgroup_matrix<float, 8, 8>(0.0f);
for (uint k0 = 0; k0 < K; k0 += 16) {
    UNROLL for (uint q = 0; q < 2; ++q) {
        uint f = tid + 128 * q;
        uint ar = f / 4, ac = (f % 4) * 4;
        *((threadgroup float4*)&As[ar][ac]) = *((const device float4*)(A + (R0 + ar) * K + k0 + ac));
        uint br = f / 16, bc = (f % 16) * 4;
        *((threadgroup float4*)&Bs[br][bc]) = *((const device float4*)(B + (k0 + br) * N + C0 + bc));
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    PROLOGUE
    UNROLL for (uint kk = 0; kk < 16; kk += 8) {
        simdgroup_float8x8 a[4], b[4];
        UNROLL for (uint i = 0; i < 4; ++i) simdgroup_load(a[i], &As[rs + 8 * i][kk], 16);
        UNROLL for (uint j = 0; j < 4; ++j) simdgroup_load(b[j], &Bs[kk][cs + 8 * j], 64);
        UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) simdgroup_multiply_accumulate(acc[i][j], a[i], b[j], acc[i][j]);
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
}
"""

MM_PLAIN = "threadgroup float As[64][16];\nthreadgroup float Bs[16][64];\n" + _MAIN.replace("PROLOGUE", "") + """
UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) simdgroup_store(acc[i][j], C + (R0 + rs + 8 * i) * N + C0 + cs + 8 * j, N);
"""

BIAS_GELU = """
uint i = thread_position_in_grid.x, N4 = C_shape[1] / 4;
const device float4* c4 = (const device float4*)C; const device float4* b4 = (const device float4*)bias;
device float4* y4 = (device float4*)Y;
float4 v = c4[i] + b4[i % N4];
y4[i] = float4(gelu_t(v.x), gelu_t(v.y), gelu_t(v.z), gelu_t(v.w));
"""

_EPI_STORE = """
UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) simdgroup_store(acc[i][j], &Cs[rs + 8 * i][cs + 8 * j], 64);
threadgroup_barrier(mem_flags::mem_threadgroup);
UNROLL for (uint q = 0; q < 8; ++q) {                     // 128 threads x 8 float4 = the 64 x 64 tile
    uint f = tid + 128 * q, r = f / 16, c = (f % 16) * 4;
    float4 v = *((threadgroup float4*)&Cs[r][c]) * ROWSCALE + EPIBIAS;
    *((device float4*)(Y + (R0 + r) * N + C0 + c)) = EPIACT;
}
"""

MM_EPI = ("threadgroup float As[64][16];\nthreadgroup float Bs[16][64];\nthreadgroup float Cs[64][64];\n"
          + _MAIN.replace("PROLOGUE", "")
          + _EPI_STORE.replace("ROWSCALE", "1.0f").replace("EPIBIAS", "*((const device float4*)(bias + C0 + c))")
                      .replace("EPIACT", "float4(gelu_t(v.x), gelu_t(v.y), gelu_t(v.z), gelu_t(v.w))"))

# RMSNorm in the prologue/epilogue: thread tid owns row tid / 2 of the A tile, 8 of its 16 columns per step.
_RMS_PRO = """
    { uint r = tid / 2, c = (tid % 2) * 8;
      float4 a0 = *((threadgroup float4*)&As[r][c]), a1 = *((threadgroup float4*)&As[r][c + 4]);
      ss += dot(a0, a0) + dot(a1, a1); }
"""
MM_RMS = ("threadgroup float As[64][16];\nthreadgroup float Bs[16][64];\nthreadgroup float Cs[64][64];\nthreadgroup float rinv[64];\nfloat ss = 0.0f;\n"
          + _MAIN.replace("PROLOGUE", _RMS_PRO)
          + """
ss += simd_shuffle_xor(ss, 1);                            // the two threads of a row are neighbouring lanes
if (tid % 2 == 0) rinv[tid / 2] = rsqrt(ss / float(K) + 1e-5f);
"""
          + _EPI_STORE.replace("ROWSCALE", "rinv[r]").replace("EPIBIAS", "0.0f").replace("EPIACT", "v"))

# Third version, the one that wins: no staging at all. Each lane of a SIMD-group holds 2 of the 64 values of
# every 8 x 8 accumulator (thread_elements()); which 2 is fixed by the hardware layout, read here from MLX's
# own kernels (steel/gemm/mma.h, get_coord): row fm = (q & 4) + ((lane / 2) % 4), columns fn, fn + 1 with
# fn = (q & 2) * 2 + (lane % 2) * 2, q = lane / 4. The epilogue edits the registers in place and the tile is
# stored with the same simdgroup_store as the plain matmul. This is how CUTLASS and cuBLASLt epilogues work:
# on the accumulator fragments, before the one and only store.
_EPI_REG = """
{ uint ln = thread_index_in_simdgroup, qd = ln / 4;
  uint fm = (qd & 4) + ((ln / 2) % 4), fn = (qd & 2) * 2 + (ln % 2) * 2;
  UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) {
    uint gr = R0 + rs + 8 * i + fm, gc = C0 + cs + 8 * j + fn;
    thread auto& e = acc[i][j].thread_elements();
    float2 v = float2(e[0], e[1]) * ROWSCALE + EPIBIAS;
    v = EPIACT; e[0] = v.x; e[1] = v.y;
    simdgroup_store(acc[i][j], Y + (R0 + rs + 8 * i) * N + C0 + cs + 8 * j, N);
  } }
"""
MM_EPI3 = ("threadgroup float As[64][16];\nthreadgroup float Bs[16][64];\n"
           + _MAIN.replace("PROLOGUE", "")
           + _EPI_REG.replace("ROWSCALE", "1.0f").replace("EPIBIAS", "*((const device float2*)(bias + gc))")
                     .replace("EPIACT", "float2(gelu_t(v.x), gelu_t(v.y))"))
MM_RMS3 = ("threadgroup float As[64][16];\nthreadgroup float Bs[16][64];\nthreadgroup float rinv[64];\nfloat ss = 0.0f;\n"
           + _MAIN.replace("PROLOGUE", _RMS_PRO)
           + """
ss += simd_shuffle_xor(ss, 1);
if (tid % 2 == 0) rinv[tid / 2] = rsqrt(ss / float(K) + 1e-5f);
threadgroup_barrier(mem_flags::mem_threadgroup);
"""
           + _EPI_REG.replace("ROWSCALE", "rinv[rs + 8 * i + fm]").replace("EPIBIAS", "0.0f").replace("EPIACT", "v"))

RMS_ONLY = """
threadgroup float sh[8];
uint row = threadgroup_position_in_grid.x, t = thread_position_in_threadgroup.x;
uint C4 = x_shape[1] / 4;
const device float4* a = (const device float4*)x + row * C4;
device float4* o = (device float4*)y + row * C4;
const device float4* g4 = (const device float4*)gamma;
float q = 0.0f;
for (uint i = t; i < C4; i += 256) { float4 v = a[i]; q += dot(v, v); }
q = simd_sum(q); if (thread_index_in_simdgroup == 0) sh[simdgroup_index_in_threadgroup] = q;
threadgroup_barrier(mem_flags::mem_threadgroup);
float Q = 0.0f; for (uint k = 0; k < 8; ++k) Q += sh[k];
float inv = rsqrt(Q / (4.0f * C4) + 1e-5f);
for (uint i = t; i < C4; i += 256) o[i] = a[i] * inv * g4[i];
"""
