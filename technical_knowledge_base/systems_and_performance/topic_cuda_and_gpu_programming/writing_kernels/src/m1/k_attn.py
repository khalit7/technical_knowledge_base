"""Attention variants built on the Kernel lab's FlashAttention-style Metal kernel (topic root, src/lab/code/k_fused.py).

The lab kernel: one threadgroup of 4 SIMD-groups owns 64 query rows (each SIMD-group 16 rows, the
FlashAttention-2 "split Q across warps" layout), streams K and V past them 32 keys at a time, keeps the
running max m, running sum l and the unnormalised output in registers, rescales by exp(m_old - m_new),
and divides by l once at the end (FlashAttention-2's deferred normalisation). Head dimension 64, float32.

Template switches added here (the arithmetic is otherwise the lab's, line for line):
  CAUSAL = 0   no mask
  CAUSAL = 1   causal mask applied to every score, but every key tile is still computed (masking only)
  CAUSAL = 2   causal, and key tiles wholly above the diagonal are never loaded or computed (block skipping)
  SEQPAR = 1   one threadgroup per (64-row query block, head): the FlashAttention-2 grid
  SEQPAR = 0   one threadgroup per head, looping over all its query blocks: FlashAttention-1's grid
               (parallel over batch x heads only)

DECODE_SPLIT / DECODE_COMBINE: one query token per head against a long KV cache (float16), Flash-Decoding
style: the keys are cut into S splits, each threadgroup runs the online softmax over its split and writes a
partial (m, l, o); a second tiny launch merges the S partials with the same rescaling. S = 1 is the
unsplit kernel (one threadgroup per head).
"""

HEADER = '#include <metal_simdgroup_matrix>\n#define UNROLL _Pragma("clang loop unroll(full)")\n'

FLASH = """
threadgroup float Ss[4][16][32];
threadgroup float Ks[32][64];
threadgroup float Vs[32][64];
threadgroup float Dm[64][8];
uint tid = thread_position_in_threadgroup.x, sg = simdgroup_index_in_threadgroup, lane = thread_index_in_simdgroup;
uint N = Q_shape[1], h = threadgroup_position_in_grid.y;
const device float* Qh = Q + h * N * 64; const device float* Kh = K + h * N * 64; const device float* Vh = V + h * N * 64;
uint row = lane / 2, side = lane % 2;
float scale = rsqrt(64.0f);
uint qb0 = SEQPAR ? threadgroup_position_in_grid.x : 0, qstep = SEQPAR ? N : 64;
for (uint qb = qb0 * 64; qb < N; qb += qstep) {               // SEQPAR = 1: exactly one block
uint r0 = qb + sg * 16;
simdgroup_float8x8 q[2][8], acc[2][8];
UNROLL for (uint i = 0; i < 2; ++i) UNROLL for (uint d = 0; d < 8; ++d) {
    simdgroup_load(q[i][d], Qh + (r0 + 8 * i) * 64 + 8 * d, 64);
    acc[i][d] = make_filled_simdgroup_matrix<float, 8, 8>(0.0f);
}
float m = -INFINITY, l = 0.0f;
uint kend = (CAUSAL == 2) ? qb + 64 : N;                       // block skipping: stop at the diagonal
for (uint k0 = 0; k0 < kend; k0 += 32) {
    UNROLL for (uint c = 0; c < 4; ++c) {
        uint f = tid + 128 * c, tr = f / 16, tc = (f % 16) * 4;
        *((threadgroup float4*)&Ks[tr][tc]) = *((const device float4*)(Kh + (k0 + tr) * 64 + tc));
        *((threadgroup float4*)&Vs[tr][tc]) = *((const device float4*)(Vh + (k0 + tr) * 64 + tc));
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    UNROLL for (uint i = 0; i < 2; ++i) UNROLL for (uint j = 0; j < 4; ++j) {
        simdgroup_float8x8 s = make_filled_simdgroup_matrix<float, 8, 8>(0.0f), kt;
        UNROLL for (uint d = 0; d < 8; ++d) {
            simdgroup_load(kt, &Ks[8 * j][8 * d], 64, ulong2(0, 0), true);
            simdgroup_multiply_accumulate(s, q[i][d], kt, s);
        }
        simdgroup_store(s, &Ss[sg][8 * i][8 * j], 32);
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    threadgroup float4* p4 = (threadgroup float4*)&Ss[sg][row][side * 16];
    float4 x[4]; float mt = -INFINITY;
    uint qi = r0 + row, kb = k0 + side * 16;
    UNROLL for (uint c = 0; c < 4; ++c) {
        x[c] = p4[c] * scale;
        if (CAUSAL) { uint kc = kb + 4 * c;                       // mask keys after the query
            x[c] = select(x[c], float4(-INFINITY), bool4(kc > qi, kc + 1 > qi, kc + 2 > qi, kc + 3 > qi)); }
        mt = max(mt, max(max(x[c].x, x[c].y), max(x[c].z, x[c].w)));
    }
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
threadgroup_barrier(mem_flags::mem_threadgroup);
}
"""

# Decode: q (H x 128, float16), K and V (H x L x 128, float16). Threadgroup (split s, head h) = 8 SIMD-groups.
# SIMD-group g takes keys g, g + 8, ... of its split; each lane holds 4 of the 128 dimensions, so one key is a
# coalesced 256-byte read by the 32 lanes and its score is a simd_sum. Then the 8 SIMD-groups are merged.
DECODE_SPLIT = """
threadgroup float sm[8], sl[8], so[8][128];
uint s = threadgroup_position_in_grid.x, h = threadgroup_position_in_grid.y, S = threadgroups_per_grid.x;
uint sg = simdgroup_index_in_threadgroup, lane = thread_index_in_simdgroup;
uint L = K_shape[1], len = L / S, k0 = s * len;
const device half4* q4 = (const device half4*)q + h * 32;
const device half4* K4 = (const device half4*)K + h * L * 32;
const device half4* V4 = (const device half4*)V + h * L * 32;
float4 qv = float4(q4[lane]) * rsqrt(128.0f);
float m = -INFINITY, l = 0.0f; float4 o = 0.0f;
for (uint j = k0 + sg; j < k0 + len; j += 8) {
  float sc = simd_sum(dot(qv, float4(K4[j * 32 + lane])));
  float mn = max(m, sc), a = exp(m - mn), p = exp(sc - mn);
  l = l * a + p; o = o * a + p * float4(V4[j * 32 + lane]); m = mn;
}
if (lane == 0) { sm[sg] = m; sl[sg] = l; }
for (uint c = 0; c < 4; ++c) so[sg][4 * lane + c] = o[c];
threadgroup_barrier(mem_flags::mem_threadgroup);
if (sg == 0) {
  float M = sm[0]; for (uint g = 1; g < 8; ++g) M = max(M, sm[g]);
  float Lt = 0.0f; float4 Ot = 0.0f;
  for (uint g = 0; g < 8; ++g) { float a = exp(sm[g] - M); Lt += sl[g] * a;
    Ot += a * float4(so[g][4 * lane], so[g][4 * lane + 1], so[g][4 * lane + 2], so[g][4 * lane + 3]); }
  uint b = (h * S + s);
  if (lane == 0) { pm[b] = M; pl[b] = Lt; }
  for (uint c = 0; c < 4; ++c) po[b * 128 + 4 * lane + c] = Ot[c];
}
"""

DECODE_COMBINE = """
uint h = threadgroup_position_in_grid.x, d = thread_position_in_threadgroup.x, S = pm_shape[1];
const device float* m = pm + h * S; const device float* l = pl + h * S;
float M = -INFINITY; for (uint s = 0; s < S; ++s) M = max(M, m[s]);
float Lt = 0.0f, acc = 0.0f;
for (uint s = 0; s < S; ++s) { float a = exp(m[s] - M); Lt += l[s] * a; acc += a * po[(h * S + s) * 128 + d]; }
O[h * 128 + d] = acc / Lt;
"""
