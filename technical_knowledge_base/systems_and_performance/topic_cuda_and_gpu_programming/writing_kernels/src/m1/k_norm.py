"""LayerNorm and RMSNorm over rows, as Metal kernel bodies for mx.fast.metal_kernel.

x: R rows x C columns float32, C = 4096. One threadgroup of 256 threads per row; each thread keeps its
16 values (4 float4) in registers, so x is read once and y written once whatever the statistics need.
The three LayerNorm kernels differ ONLY in how the variance is computed, which is a numerical question,
not a speed one:
  L_TWOPASS  mean first, then the mean of (x - mean)^2, both from registers (exact enough, the default)
  L_NAIVE    one pass of sum(x) and sum(x^2); var = E[x^2] - E[x]^2 (cancels catastrophically when |mean| >> std)
  L_WELFORD  one pass of Welford's running (count, mean, M2), merged across lanes and SIMD-groups with
             Chan et al.'s pairwise formula (the same "merge two partial results" shape as online softmax)
RMS_RESID   the fused residual-add + RMSNorm of a pre-norm transformer block: h = x + r is written out
            (it is the next residual) and y = h / rms(h) * gamma, in one kernel.
"""

COMMON_LOAD = """
uint row = threadgroup_position_in_grid.x, t = thread_position_in_threadgroup.x;
uint lane = thread_index_in_simdgroup, sg = simdgroup_index_in_threadgroup;
uint C4 = x_shape[1] / 4;
const device float4* r = (const device float4*)x + row * C4;
device float4* o = (device float4*)y + row * C4;
const device float4* g4 = (const device float4*)gamma;
const device float4* b4 = (const device float4*)beta;
float4 v[4];
for (uint k = 0; k < 4; ++k) v[k] = r[t + 256 * k];
"""

L_TWOPASS = """
threadgroup float sh[8];
""" + COMMON_LOAD + """
float s = 0.0f; for (uint k = 0; k < 4; ++k) s += v[k].x + v[k].y + v[k].z + v[k].w;
s = simd_sum(s); if (lane == 0) sh[sg] = s;
threadgroup_barrier(mem_flags::mem_threadgroup);
float mean = 0.0f; for (uint k = 0; k < 8; ++k) mean += sh[k]; mean /= (4.0f * C4);
threadgroup_barrier(mem_flags::mem_threadgroup);
float q = 0.0f; for (uint k = 0; k < 4; ++k) { float4 d = v[k] - mean; q += dot(d, d); }
q = simd_sum(q); if (lane == 0) sh[sg] = q;
threadgroup_barrier(mem_flags::mem_threadgroup);
float var = 0.0f; for (uint k = 0; k < 8; ++k) var += sh[k]; var /= (4.0f * C4);
float inv = rsqrt(var + 1e-5f);
for (uint k = 0; k < 4; ++k) { uint i = t + 256 * k; o[i] = (v[k] - mean) * inv * g4[i] + b4[i]; }
"""

L_NAIVE = """
threadgroup float sh[16];
""" + COMMON_LOAD + """
float s = 0.0f, q = 0.0f;
for (uint k = 0; k < 4; ++k) { s += v[k].x + v[k].y + v[k].z + v[k].w; q += dot(v[k], v[k]); }
s = simd_sum(s); q = simd_sum(q); if (lane == 0) { sh[sg] = s; sh[8 + sg] = q; }
threadgroup_barrier(mem_flags::mem_threadgroup);
float S = 0.0f, Q = 0.0f; for (uint k = 0; k < 8; ++k) { S += sh[k]; Q += sh[8 + k]; }
float n = 4.0f * C4, mean = S / n, var = max(Q / n - mean * mean, 0.0f);   // E[x^2] - E[x]^2
float inv = rsqrt(var + 1e-5f);
for (uint k = 0; k < 4; ++k) { uint i = t + 256 * k; o[i] = (v[k] - mean) * inv * g4[i] + b4[i]; }
"""

# Welford: per thread over its 16 values, then merge (n, mean, M2) pairs:
#   n = na + nb, delta = mb - ma, mean = ma + delta * nb / n, M2 = M2a + M2b + delta^2 * na * nb / n
L_WELFORD = """
threadgroup float shm[8], shM[8];
""" + COMMON_LOAD + """
float n = 0.0f, mean = 0.0f, M2 = 0.0f;
for (uint k = 0; k < 4; ++k) for (uint c = 0; c < 4; ++c) {
  float xv = v[k][c]; n += 1.0f; float d = xv - mean; mean += d / n; M2 += d * (xv - mean); }
for (uint off = 16; off > 0; off >>= 1) {                    // merge across the SIMD-group (equal counts)
  float mb = simd_shuffle_xor(mean, off), Mb = simd_shuffle_xor(M2, off);
  float d = mb - mean; M2 = M2 + Mb + d * d * n * 0.5f; mean = mean + d * 0.5f; n = 2.0f * n; }
if (lane == 0) { shm[sg] = mean; shM[sg] = M2; }
threadgroup_barrier(mem_flags::mem_threadgroup);
float N = n, mu = shm[0], Mt = shM[0];
for (uint k = 1; k < 8; ++k) { float d = shm[k] - mu; float tot = N + n;
  Mt = Mt + shM[k] + d * d * N * n / tot; mu = mu + d * n / tot; N = tot; }
float inv = rsqrt(Mt / N + 1e-5f);
for (uint k = 0; k < 4; ++k) { uint i = t + 256 * k; o[i] = (v[k] - mu) * inv * g4[i] + b4[i]; }
"""

# Fused residual add + RMSNorm (pre-norm block): h = x + res, written out; y = h * rsqrt(mean(h^2) + eps) * gamma
RMS_RESID = """
threadgroup float sh[8];
uint row = threadgroup_position_in_grid.x, t = thread_position_in_threadgroup.x;
uint lane = thread_index_in_simdgroup, sg = simdgroup_index_in_threadgroup;
uint C4 = x_shape[1] / 4;
const device float4* a = (const device float4*)x + row * C4;
const device float4* b = (const device float4*)res + row * C4;
device float4* ho = (device float4*)h + row * C4;
device float4* o = (device float4*)y + row * C4;
const device float4* g4 = (const device float4*)gamma;
float4 v[4]; float q = 0.0f;
for (uint k = 0; k < 4; ++k) { uint i = t + 256 * k; v[k] = a[i] + b[i]; ho[i] = v[k]; q += dot(v[k], v[k]); }
q = simd_sum(q); if (lane == 0) sh[sg] = q;
threadgroup_barrier(mem_flags::mem_threadgroup);
float Q = 0.0f; for (uint k = 0; k < 8; ++k) Q += sh[k];
float inv = rsqrt(Q / (4.0f * C4) + 1e-5f);
for (uint k = 0; k < 4; ++k) { uint i = t + 256 * k; o[i] = v[k] * inv * g4[i]; }
"""
