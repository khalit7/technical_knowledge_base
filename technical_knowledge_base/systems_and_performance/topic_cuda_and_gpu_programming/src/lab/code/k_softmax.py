"""Row softmax, the optimisation ladder, as Metal kernel bodies for mx.fast.metal_kernel.

Input x: R rows x C columns, float32, row-major. Output y = softmax(x) along each row.
Every body below is shown verbatim on the page (Kernel lab tab), so keep them short and commented.
CUDA names in comments: threadgroup = block, SIMD-group = warp (32 threads on both),
threadgroup memory = shared memory, simd_max/simd_sum = warp shuffle reductions.
"""

# S1: one thread per row. Each thread walks its own row three times (max, sum, write).
# Neighbouring threads read addresses C floats apart: nothing is coalesced.
S1_NAIVE = """
uint row = thread_position_in_grid.x;          // one thread = one row
uint C = x_shape[1];
const device float* r = x + row * C;
float m = -INFINITY;
for (uint i = 0; i < C; ++i) m = max(m, r[i]);            // pass 1: max
float s = 0.0f;
for (uint i = 0; i < C; ++i) s += exp(r[i] - m);          // pass 2: sum of exp
for (uint i = 0; i < C; ++i) y[row * C + i] = exp(r[i] - m) / s;  // pass 3: write
"""

# S2: one threadgroup of 256 threads per row; thread t reads elements t, t+256, ...
# so the 32 threads of a SIMD-group read 32 neighbouring floats (coalesced).
# Partial results are combined with a tree in threadgroup (shared) memory.
S2_COALESCED = """
threadgroup float red[256];
uint row = threadgroup_position_in_grid.x, t = thread_position_in_threadgroup.x;
uint C = x_shape[1];
const device float* r = x + row * C;
float m = -INFINITY;
for (uint i = t; i < C; i += 256) m = max(m, r[i]);
red[t] = m; threadgroup_barrier(mem_flags::mem_threadgroup);
for (uint h = 128; h > 0; h >>= 1) {                       // tree: 8 steps, 8 barriers
  if (t < h) red[t] = max(red[t], red[t + h]);
  threadgroup_barrier(mem_flags::mem_threadgroup);
}
m = red[0]; threadgroup_barrier(mem_flags::mem_threadgroup);
float s = 0.0f;
for (uint i = t; i < C; i += 256) s += exp(r[i] - m);
red[t] = s; threadgroup_barrier(mem_flags::mem_threadgroup);
for (uint h = 128; h > 0; h >>= 1) {
  if (t < h) red[t] += red[t + h];
  threadgroup_barrier(mem_flags::mem_threadgroup);
}
s = red[0];
for (uint i = t; i < C; i += 256) y[row * C + i] = exp(r[i] - m) / s;
"""

# S3: same, but each SIMD-group (warp) reduces in registers with simd_max/simd_sum
# (CUDA: __shfl_xor_sync), so only 8 partials go through threadgroup memory.
S3_SIMD = """
threadgroup float red[8];
uint row = threadgroup_position_in_grid.x, t = thread_position_in_threadgroup.x;
uint lane = thread_index_in_simdgroup, sg = simdgroup_index_in_threadgroup;
uint C = x_shape[1];
const device float* r = x + row * C;
float m = -INFINITY;
for (uint i = t; i < C; i += 256) m = max(m, r[i]);
m = simd_max(m);                                          // 32 lanes -> 1, no memory
if (lane == 0) red[sg] = m;
threadgroup_barrier(mem_flags::mem_threadgroup);
m = red[0]; for (uint k = 1; k < 8; ++k) m = max(m, red[k]);
threadgroup_barrier(mem_flags::mem_threadgroup);
float s = 0.0f;
for (uint i = t; i < C; i += 256) s += exp(r[i] - m);
s = simd_sum(s);
if (lane == 0) red[sg] = s;
threadgroup_barrier(mem_flags::mem_threadgroup);
s = 0.0f; for (uint k = 0; k < 8; ++k) s += red[k];
for (uint i = t; i < C; i += 256) y[row * C + i] = exp(r[i] - m) / s;
"""

# S4: same, with 16-byte vector loads and stores (float4; CUDA: float4 / LDG.128).
S4_VEC = """
threadgroup float red[8];
uint row = threadgroup_position_in_grid.x, t = thread_position_in_threadgroup.x;
uint lane = thread_index_in_simdgroup, sg = simdgroup_index_in_threadgroup;
uint C4 = x_shape[1] / 4;
const device float4* r = (const device float4*)(x) + row * C4;
device float4* o = (device float4*)(y) + row * C4;
float m = -INFINITY;
for (uint i = t; i < C4; i += 256) { float4 v = r[i]; m = max(m, max(max(v.x, v.y), max(v.z, v.w))); }
m = simd_max(m);
if (lane == 0) red[sg] = m;
threadgroup_barrier(mem_flags::mem_threadgroup);
m = red[0]; for (uint k = 1; k < 8; ++k) m = max(m, red[k]);
threadgroup_barrier(mem_flags::mem_threadgroup);
float s = 0.0f;
for (uint i = t; i < C4; i += 256) { float4 e = exp(r[i] - m); s += e.x + e.y + e.z + e.w; }
s = simd_sum(s);
if (lane == 0) red[sg] = s;
threadgroup_barrier(mem_flags::mem_threadgroup);
s = 0.0f; for (uint k = 0; k < 8; ++k) s += red[k];
for (uint i = t; i < C4; i += 256) o[i] = exp(r[i] - m) / s;
"""

# S5: online softmax. One pass finds the max AND the sum together: when a larger value
# arrives, the running sum is rescaled by exp(old max - new max). Two passes over x, not three.
S5_ONLINE = """
threadgroup float rm[8], rl[8];
uint row = threadgroup_position_in_grid.x, t = thread_position_in_threadgroup.x;
uint lane = thread_index_in_simdgroup, sg = simdgroup_index_in_threadgroup;
uint C4 = x_shape[1] / 4;
const device float4* r = (const device float4*)(x) + row * C4;
device float4* o = (device float4*)(y) + row * C4;
float m = -INFINITY, l = 0.0f;                            // running max, running sum
for (uint i = t; i < C4; i += 256) {
  float4 v = r[i];
  float mn = max(m, max(max(v.x, v.y), max(v.z, v.w)));
  float4 e = exp(v - mn);
  l = l * exp(m - mn) + (e.x + e.y + e.z + e.w);          // rescale the old sum
  m = mn;
}
float M = simd_max(m); l = simd_sum(l * exp(m - M));      // merge 32 lanes
if (lane == 0) { rm[sg] = M; rl[sg] = l; }
threadgroup_barrier(mem_flags::mem_threadgroup);
M = rm[0]; for (uint k = 1; k < 8; ++k) M = max(M, rm[k]);
float s = 0.0f; for (uint k = 0; k < 8; ++k) s += rl[k] * exp(rm[k] - M);
for (uint i = t; i < C4; i += 256) o[i] = exp(r[i] - M) / s;
"""

# S6: the whole row stays on chip. Each thread keeps NV float4 of its row in registers
# (NV = C / 1024), reads x once and writes y once: the minimum possible traffic.
# This is what Triton's fused-softmax tutorial does (BLOCK = whole row, held in registers).
S6_ONCHIP = """
threadgroup float red[8];
uint row = threadgroup_position_in_grid.x, t = thread_position_in_threadgroup.x;
uint lane = thread_index_in_simdgroup, sg = simdgroup_index_in_threadgroup;
uint C4 = x_shape[1] / 4;
const device float4* r = (const device float4*)(x) + row * C4;
device float4* o = (device float4*)(y) + row * C4;
float4 v[NV];
float m = -INFINITY;
for (int k = 0; k < NV; ++k) { v[k] = r[t + 256 * k]; m = max(m, max(max(v[k].x, v[k].y), max(v[k].z, v[k].w))); }
m = simd_max(m);
if (lane == 0) red[sg] = m;
threadgroup_barrier(mem_flags::mem_threadgroup);
m = red[0]; for (uint k = 1; k < 8; ++k) m = max(m, red[k]);
threadgroup_barrier(mem_flags::mem_threadgroup);
float s = 0.0f;
for (int k = 0; k < NV; ++k) { v[k] = exp(v[k] - m); s += v[k].x + v[k].y + v[k].z + v[k].w; }
s = simd_sum(s);
if (lane == 0) red[sg] = s;
threadgroup_barrier(mem_flags::mem_threadgroup);
s = 0.0f; for (uint k = 0; k < 8; ++k) s += red[k];
float inv = 1.0f / s;
for (int k = 0; k < NV; ++k) o[t + 256 * k] = v[k] * inv;
"""
