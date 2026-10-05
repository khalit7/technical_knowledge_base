"""Fused kernels: softmax followed by a matmul, then attention (FlashAttention-style), as Metal bodies.

O = softmax(S) V with S: N x N, V: N x 64, O: N x 64 (float32). One threadgroup = 4 SIMD-groups = 128
threads owns 64 rows of O; each SIMD-group owns 16 rows and keeps its 16 x 64 slice of O in registers
as 2 x 8 tiles of 8 x 8 (simdgroup_float8x8, Apple's matrix instructions; see k_matmul.M7).
Columns of S (keys) are visited 32 at a time. P = softmax(S) never goes to device memory.

ONLINE = 0: two passes over S. Pass 1 computes each row's max m and sum l; pass 2 forms
            p = exp(s - m) / l tile by tile and multiplies it into O.
ONLINE = 1: one pass. Each tile updates a running max; when it grows, the running sum and the
            partial O rows are rescaled by alpha = exp(m_old - m_new) (O is multiplied by the
            diagonal matrix of alphas, an 8x8 matrix product); at the end O is divided by l.
            This is the online softmax of Milakov and Gimelshein (2018) used by FlashAttention.

A bug worth keeping: the first version synchronised the SIMD-group's own writes to Dm and Ps with
simdgroup_barrier(mem_flags::mem_threadgroup). At 4096 rows it gave wrong answers in 1 to 5 random rows
per run (always the 8th row of an 8 x 8 block, a whole row off by a constant factor); small tests passed.
Every such barrier is now a threadgroup_barrier, and the outputs match the float64 reference in every run.
We did not establish the cause.
"""
from k_matmul import HEADER  # includes <metal_simdgroup_matrix> and defines UNROLL

FUSED_SMM = """
threadgroup float Ps[4][16][32];      // this SIMD-group's 16 x 32 tile of P
threadgroup float Vs[32][64];         // 32 rows of V, shared by the 4 SIMD-groups
threadgroup float Dm[64][8];          // diagonal 8x8 blocks of alpha (online rescale)
uint tid = thread_position_in_threadgroup.x, sg = simdgroup_index_in_threadgroup, lane = thread_index_in_simdgroup;
uint N = S_shape[1];
uint row = lane / 2, side = lane % 2;                  // 2 lanes per row, 16 columns each
uint grow = threadgroup_position_in_grid.x * 64 + sg * 16 + row;
float m = -INFINITY, l = 0.0f;
if (!ONLINE) {                                         // pass 1: row statistics (reads S once more)
    const device float4* s4 = (const device float4*)(S + grow * N);
    for (uint c = side; c < N / 4; c += 2) {
        float4 x = s4[c]; float mn = max(m, max(max(x.x, x.y), max(x.z, x.w)));
        float4 e = exp(x - mn); l = l * exp(m - mn) + e.x + e.y + e.z + e.w; m = mn;
    }
    float mo = simd_shuffle_xor(m, 1), lo = simd_shuffle_xor(l, 1), M = max(m, mo);
    l = l * exp(m - M) + lo * exp(mo - M); m = M;
}
simdgroup_float8x8 acc[2][8];
UNROLL for (uint i = 0; i < 2; ++i) UNROLL for (uint j = 0; j < 8; ++j) acc[i][j] = make_filled_simdgroup_matrix<float, 8, 8>(0.0f);
for (uint k0 = 0; k0 < N; k0 += 32) {
    UNROLL for (uint q = 0; q < 4; ++q) {               // V tile: 512 float4, 4 per thread
        uint f = tid + 128 * q, vr = f / 16, vc = (f % 16) * 4;
        *((threadgroup float4*)&Vs[vr][vc]) = *((const device float4*)(V + (k0 + vr) * 64 + vc));
    }
    const device float4* src = (const device float4*)(S + grow * N + k0 + side * 16);
    float4 x[4]; float mt = -INFINITY;
    UNROLL for (uint q = 0; q < 4; ++q) { x[q] = src[q]; mt = max(mt, max(max(x[q].x, x[q].y), max(x[q].z, x[q].w))); }
    threadgroup float4* p4 = (threadgroup float4*)&Ps[sg][row][side * 16];
    if (ONLINE) {
        mt = max(mt, simd_shuffle_xor(mt, 1));
        float mn = max(m, mt), alpha = exp(m - mn), ps = 0.0f;
        UNROLL for (uint q = 0; q < 4; ++q) { float4 p = exp(x[q] - mn); p4[q] = p; ps += p.x + p.y + p.z + p.w; }
        ps += simd_shuffle_xor(ps, 1);
        l = l * alpha + ps; m = mn;
        UNROLL for (uint c = 0; c < 4; ++c) Dm[sg * 16 + row][side * 4 + c] = (side * 4 + c == row % 8) ? alpha : 0.0f;
    } else {
        float inv = 1.0f / l;
        UNROLL for (uint q = 0; q < 4; ++q) p4[q] = exp(x[q] - m) * inv;
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    if (ONLINE) {                                      // O_rows *= alpha: diag(alpha) x O
        UNROLL for (uint i = 0; i < 2; ++i) {
            simdgroup_float8x8 D; simdgroup_load(D, &Dm[sg * 16 + 8 * i][0], 8);
            UNROLL for (uint j = 0; j < 8; ++j) { simdgroup_float8x8 t; simdgroup_multiply(t, D, acc[i][j]); acc[i][j] = t; }
        }
    }
    UNROLL for (uint kk = 0; kk < 4; ++kk) {            // O += P_tile x V_tile
        simdgroup_float8x8 p[2], v;
        UNROLL for (uint i = 0; i < 2; ++i) simdgroup_load(p[i], &Ps[sg][8 * i][8 * kk], 32);
        UNROLL for (uint j = 0; j < 8; ++j) {
            simdgroup_load(v, &Vs[8 * kk][8 * j], 64);
            UNROLL for (uint i = 0; i < 2; ++i) simdgroup_multiply_accumulate(acc[i][j], p[i], v, acc[i][j]);
        }
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
}
if (ONLINE) {                                          // O_rows /= l
    UNROLL for (uint c = 0; c < 4; ++c) Dm[sg * 16 + row][side * 4 + c] = (side * 4 + c == row % 8) ? 1.0f / l : 0.0f;
    threadgroup_barrier(mem_flags::mem_threadgroup);
    UNROLL for (uint i = 0; i < 2; ++i) {
        simdgroup_float8x8 D; simdgroup_load(D, &Dm[sg * 16 + 8 * i][0], 8);
        UNROLL for (uint j = 0; j < 8; ++j) { simdgroup_float8x8 t; simdgroup_multiply(t, D, acc[i][j]); acc[i][j] = t; }
    }
}
uint r0 = threadgroup_position_in_grid.x * 64 + sg * 16;
UNROLL for (uint i = 0; i < 2; ++i) UNROLL for (uint j = 0; j < 8; ++j) simdgroup_store(acc[i][j], O + (r0 + 8 * i) * 64 + 8 * j, 64);
"""

# FlashAttention-style forward pass: the ONLINE kernel above, except that the 16 x 32 tile of scores
# S = Q K^T * scale is computed on chip from Q (kept in registers) and a 32 x 64 tile of K, instead
# of being read from device memory. Neither S nor P ever exists in device memory.
# Q, K, V, O: H x N x 64 (one head per threadgroup row of the grid).
FLASH_ATTN = """
threadgroup float Ss[4][16][32];      // scores, then probabilities, for this SIMD-group's rows
threadgroup float Ks[32][64];
threadgroup float Vs[32][64];
threadgroup float Dm[64][8];
uint tid = thread_position_in_threadgroup.x, sg = simdgroup_index_in_threadgroup, lane = thread_index_in_simdgroup;
uint N = Q_shape[1], h = threadgroup_position_in_grid.y;
const device float* Qh = Q + h * N * 64; const device float* Kh = K + h * N * 64; const device float* Vh = V + h * N * 64;
uint row = lane / 2, side = lane % 2;
uint r0 = threadgroup_position_in_grid.x * 64 + sg * 16;
float scale = rsqrt(64.0f);
simdgroup_float8x8 q[2][8], acc[2][8];
UNROLL for (uint i = 0; i < 2; ++i) UNROLL for (uint d = 0; d < 8; ++d) {
    simdgroup_load(q[i][d], Qh + (r0 + 8 * i) * 64 + 8 * d, 64);
    acc[i][d] = make_filled_simdgroup_matrix<float, 8, 8>(0.0f);
}
float m = -INFINITY, l = 0.0f;
for (uint k0 = 0; k0 < N; k0 += 32) {
    UNROLL for (uint c = 0; c < 4; ++c) {               // K and V tiles: 512 float4 each
        uint f = tid + 128 * c, tr = f / 16, tc = (f % 16) * 4;
        *((threadgroup float4*)&Ks[tr][tc]) = *((const device float4*)(Kh + (k0 + tr) * 64 + tc));
        *((threadgroup float4*)&Vs[tr][tc]) = *((const device float4*)(Vh + (k0 + tr) * 64 + tc));
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    UNROLL for (uint i = 0; i < 2; ++i) UNROLL for (uint j = 0; j < 4; ++j) {   // S = Q K^T
        simdgroup_float8x8 s = make_filled_simdgroup_matrix<float, 8, 8>(0.0f), kt;
        UNROLL for (uint d = 0; d < 8; ++d) {
            simdgroup_load(kt, &Ks[8 * j][8 * d], 64, ulong2(0, 0), true);       // K tile, transposed
            simdgroup_multiply_accumulate(s, q[i][d], kt, s);
        }
        simdgroup_store(s, &Ss[sg][8 * i][8 * j], 32);
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    threadgroup float4* p4 = (threadgroup float4*)&Ss[sg][row][side * 16];
    float4 x[4]; float mt = -INFINITY;
    UNROLL for (uint c = 0; c < 4; ++c) { x[c] = p4[c] * scale; mt = max(mt, max(max(x[c].x, x[c].y), max(x[c].z, x[c].w))); }
    mt = max(mt, simd_shuffle_xor(mt, 1));
    float mn = max(m, mt), alpha = exp(m - mn), ps = 0.0f;
    UNROLL for (uint c = 0; c < 4; ++c) { float4 p = exp(x[c] - mn); p4[c] = p; ps += p.x + p.y + p.z + p.w; }
    ps += simd_shuffle_xor(ps, 1);
    l = l * alpha + ps; m = mn;
    UNROLL for (uint c = 0; c < 4; ++c) Dm[sg * 16 + row][side * 4 + c] = (side * 4 + c == row % 8) ? alpha : 0.0f;
    threadgroup_barrier(mem_flags::mem_threadgroup);
    UNROLL for (uint i = 0; i < 2; ++i) {
        simdgroup_float8x8 D; simdgroup_load(D, &Dm[sg * 16 + 8 * i][0], 8);
        UNROLL for (uint j = 0; j < 8; ++j) { simdgroup_float8x8 t; simdgroup_multiply(t, D, acc[i][j]); acc[i][j] = t; }
    }
    UNROLL for (uint kk = 0; kk < 4; ++kk) {
        simdgroup_float8x8 p[2], v;
        UNROLL for (uint i = 0; i < 2; ++i) simdgroup_load(p[i], &Ss[sg][8 * i][8 * kk], 32);
        UNROLL for (uint j = 0; j < 8; ++j) {
            simdgroup_load(v, &Vs[8 * kk][8 * j], 64);
            UNROLL for (uint i = 0; i < 2; ++i) simdgroup_multiply_accumulate(acc[i][j], p[i], v, acc[i][j]);
        }
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
}
UNROLL for (uint c = 0; c < 4; ++c) Dm[sg * 16 + row][side * 4 + c] = (side * 4 + c == row % 8) ? 1.0f / l : 0.0f;
threadgroup_barrier(mem_flags::mem_threadgroup);
UNROLL for (uint i = 0; i < 2; ++i) {
    simdgroup_float8x8 D; simdgroup_load(D, &Dm[sg * 16 + 8 * i][0], 8);
    UNROLL for (uint j = 0; j < 8; ++j) { { simdgroup_float8x8 t; simdgroup_multiply(t, D, acc[i][j]); acc[i][j] = t; }
        simdgroup_store(acc[i][j], O + h * N * 64 + (r0 + 8 * i) * 64 + 8 * j, 64); }
}
"""
