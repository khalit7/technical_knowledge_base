"""Matmul C = A B (float32, square N x N), the optimisation ladder, as Metal kernel bodies.
M2 and M3 are the hardware root's Roofline lab kernels, verbatim (topic_hardware/src/roof/code/roof_gpu.py).
Every body is shown on the page. CUDA names: threadgroup = block, SIMD-group = warp,
threadgroup memory = shared memory, simdgroup_matrix = Apple's 8x8 matrix instructions
(the role mma.sync plays on NVIDIA tensor cores, at a far smaller scale).
"""

# M1: one thread per output, but the thread's x index walks DOWN the rows: the 32 threads of a
# SIMD-group read 32 different rows of A and write 32 different rows of C (addresses N floats apart).
M1_UNCOALESCED = """
uint row = thread_position_in_grid.x, col = thread_position_in_grid.y;   // x -> row: the mistake
uint K = A_shape[1], N = B_shape[1];
float acc = 0;
for (uint k = 0; k < K; ++k) acc = fma(A[row * K + k], B[k * N + col], acc);
C[row * N + col] = acc;
"""

# M2: the same kernel with x -> column: neighbouring threads read neighbouring B and C elements
# and the same A element (a broadcast). Roofline lab's "naive".
M2_COALESCED = """
uint col = thread_position_in_grid.x, row = thread_position_in_grid.y;
uint K = A_shape[1], N = B_shape[1];
float acc = 0;
for (uint k = 0; k < K; ++k) acc = fma(A[row * K + k], B[k * N + col], acc);
C[row * N + col] = acc;
"""

# M3 (TS = 16) and M4 (TS = 32): stage TS x TS tiles of A and B in threadgroup memory; every value
# loaded from device memory is then used TS times. Roofline lab's "tiled".
M3_TILED = """
threadgroup float As[TS][TS];
threadgroup float Bs[TS][TS];
uint tx = thread_position_in_threadgroup.x, ty = thread_position_in_threadgroup.y;
uint col = threadgroup_position_in_grid.x * TS + tx, row = threadgroup_position_in_grid.y * TS + ty;
uint K = A_shape[1], N = B_shape[1];
float acc = 0;
for (uint k0 = 0; k0 < K; k0 += TS) {
    As[ty][tx] = A[row * K + k0 + tx];
    Bs[ty][tx] = B[(k0 + ty) * N + col];
    threadgroup_barrier(mem_flags::mem_threadgroup);
    for (uint k = 0; k < TS; ++k) acc = fma(As[ty][k], Bs[k][tx], acc);
    threadgroup_barrier(mem_flags::mem_threadgroup);
}
C[row * N + col] = acc;
"""

# M5: register blocking. A threadgroup of 256 threads computes a 64 x 64 block of C; each thread
# owns a 4 x 4 patch held in 16 registers. Per k step a thread loads 4 + 4 values from threadgroup
# memory and does 16 FMAs (one load per 2 FMAs, against two loads per FMA in M3).
M5_REG4 = """
threadgroup float As[16][64];        // A tile stored transposed: As[k][row]
threadgroup float Bs[16][64];        // B tile: Bs[k][col]
uint tid = thread_position_in_threadgroup.x;
uint tx = tid % 16, ty = tid / 16;
uint r0 = threadgroup_position_in_grid.y * 64, c0 = threadgroup_position_in_grid.x * 64;
uint K = A_shape[1], N = B_shape[1];
float acc[4][4] = {};
for (uint k0 = 0; k0 < K; k0 += 16) {
    UNROLL for (uint j = 0; j < 4; ++j) {
        uint i = tid + 256 * j;
        As[i % 16][i / 16] = A[(r0 + i / 16) * K + k0 + i % 16];
        Bs[i / 64][i % 64] = B[(k0 + i / 64) * N + c0 + i % 64];
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    UNROLL for (uint k = 0; k < 16; ++k) {
        float a[4], b[4];
        UNROLL for (uint i = 0; i < 4; ++i) { a[i] = As[k][ty * 4 + i]; b[i] = Bs[k][tx * 4 + i]; }
        UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) acc[i][j] = fma(a[i], b[j], acc[i][j]);
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
}
UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) C[(r0 + ty * 4 + i) * N + c0 + tx * 4 + j] = acc[i][j];
"""

# M6: as M5 but each thread owns an 8 x 8 patch (64 registers) of a 128 x 128 block, and moves
# data in float4 (16-byte) loads and stores: 16 FMAs per float4 pair read from threadgroup memory.
M6_REG8_VEC = """
threadgroup float4 As[8][32];        // As[k][row/4]: 8 x 128 floats, transposed
threadgroup float4 Bs[8][32];        // Bs[k][col/4]: 8 x 128 floats
uint tid = thread_position_in_threadgroup.x;
uint tx = tid % 16, ty = tid / 16;
uint r0 = threadgroup_position_in_grid.y * 128, c0 = threadgroup_position_in_grid.x * 128;
uint K = A_shape[1], N = B_shape[1];
float4 acc[8][2] = {};
threadgroup float* Af = (threadgroup float*)As;
for (uint k0 = 0; k0 < K; k0 += 8) {
    {   // A: 128 rows x 8 k = 256 float4 (one per thread), stored transposed
        uint r = tid / 2, kk = (tid % 2) * 4;
        float4 v = *((const device float4*)(A + (r0 + r) * K + k0 + kk));
        Af[(kk + 0) * 128 + r] = v.x; Af[(kk + 1) * 128 + r] = v.y;
        Af[(kk + 2) * 128 + r] = v.z; Af[(kk + 3) * 128 + r] = v.w;
        // B: 8 k x 128 cols = 256 float4 (one per thread)
        uint br = tid / 32, bc = tid % 32;
        Bs[br][bc] = *((const device float4*)(B + (k0 + br) * N + c0) + bc);
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    UNROLL for (uint k = 0; k < 8; ++k) {
        float4 a0 = As[k][ty * 2], a1 = As[k][ty * 2 + 1];
        float4 b0 = Bs[k][tx * 2], b1 = Bs[k][tx * 2 + 1];
        float a[8] = {a0.x, a0.y, a0.z, a0.w, a1.x, a1.y, a1.z, a1.w};
        UNROLL for (uint i = 0; i < 8; ++i) { acc[i][0] = fma(a[i], b0, acc[i][0]); acc[i][1] = fma(a[i], b1, acc[i][1]); }
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
}
UNROLL for (uint i = 0; i < 8; ++i) {
    device float4* out = (device float4*)(C + (r0 + ty * 8 + i) * N + c0) + tx * 2;
    out[0] = acc[i][0]; out[1] = acc[i][1];
}
"""

# M7a: Apple's matrix instructions straight from device memory. Each SIMD-group (32 threads,
# cooperatively) owns a 32 x 32 block of C as 4 x 4 tiles of 8 x 8 (simdgroup_float8x8) and per
# k step of 8 does 16 8x8x8 multiply-accumulates, loading its 8 x 8 operands from device memory.
M7A_SIMDMAT_DEVICE = """
uint sg = simdgroup_index_in_threadgroup;
uint r0 = threadgroup_position_in_grid.y * 64 + (sg / 2) * 32;
uint c0 = threadgroup_position_in_grid.x * 64 + (sg % 2) * 32;
uint K = A_shape[1], N = B_shape[1];
simdgroup_float8x8 acc[4][4];
UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) acc[i][j] = make_filled_simdgroup_matrix<float, 8, 8>(0.0f);
for (uint k = 0; k < K; k += 8) {
    simdgroup_float8x8 a[4], b[4];
    UNROLL for (uint i = 0; i < 4; ++i) simdgroup_load(a[i], A + (r0 + 8 * i) * K + k, K);
    UNROLL for (uint j = 0; j < 4; ++j) simdgroup_load(b[j], B + k * N + c0 + 8 * j, N);
    UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) simdgroup_multiply_accumulate(acc[i][j], a[i], b[j], acc[i][j]);
}
UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) simdgroup_store(acc[i][j], C + (r0 + 8 * i) * N + c0 + 8 * j, N);
"""

# M7: the same matrix instructions fed from threadgroup memory: the 128 threads first copy a
# 64 x 16 tile of A and a 16 x 64 tile of B with float4 loads, then each SIMD-group runs its
# 4 x 4 grid of 8x8x8 multiply-accumulates out of threadgroup memory (what MLX and CUTLASS do).
M7_SIMDMAT = """
threadgroup float As[64][16];
threadgroup float Bs[16][64];
uint tid = thread_position_in_threadgroup.x, sg = simdgroup_index_in_threadgroup;
uint R0 = threadgroup_position_in_grid.y * 64, C0 = threadgroup_position_in_grid.x * 64;
uint rs = (sg / 2) * 32, cs = (sg % 2) * 32;
uint K = A_shape[1], N = B_shape[1];
simdgroup_float8x8 acc[4][4];
UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) acc[i][j] = make_filled_simdgroup_matrix<float, 8, 8>(0.0f);
for (uint k0 = 0; k0 < K; k0 += 16) {
    UNROLL for (uint q = 0; q < 2; ++q) {
        uint f = tid + 128 * q;                         // 256 float4 per tile
        uint ar = f / 4, ac = (f % 4) * 4;
        *((threadgroup float4*)&As[ar][ac]) = *((const device float4*)(A + (R0 + ar) * K + k0 + ac));
        uint br = f / 16, bc = (f % 16) * 4;
        *((threadgroup float4*)&Bs[br][bc]) = *((const device float4*)(B + (k0 + br) * N + C0 + bc));
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    UNROLL for (uint kk = 0; kk < 16; kk += 8) {
        simdgroup_float8x8 a[4], b[4];
        UNROLL for (uint i = 0; i < 4; ++i) simdgroup_load(a[i], &As[rs + 8 * i][kk], 16);
        UNROLL for (uint j = 0; j < 4; ++j) simdgroup_load(b[j], &Bs[kk][cs + 8 * j], 64);
        UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) simdgroup_multiply_accumulate(acc[i][j], a[i], b[j], acc[i][j]);
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
}
UNROLL for (uint i = 0; i < 4; ++i) UNROLL for (uint j = 0; j < 4; ++j) simdgroup_store(acc[i][j], C + (R0 + rs + 8 * i) * N + C0 + cs + 8 * j, N);
"""
# Every loop with a fixed trip count is fully unrolled (UNROLL). Without it the Metal compiler kept
# the arrays of 8x8 matrices in memory and M7 ran at about 100 GFLOP/s instead of about 3,400
# (measured; kept as the lesson case "M7, loops not unrolled").
HEADER = '#include <metal_simdgroup_matrix>\n#define UNROLL _Pragma("clang loop unroll(full)")\n'
HEADER_NO_UNROLL = '#include <metal_simdgroup_matrix>\n#define UNROLL\n'
SIMD_HEADER = HEADER
