"""Inclusive prefix sum (scan) of N float32, as Metal kernel bodies for mx.fast.metal_kernel.

C1  Hillis-Steele over the whole array: log2(N) launches, launch k computes y[i] = x[i] + x[i - 2^k].
    Simple and fully parallel, but every launch reads and writes all of memory: O(N log N) traffic.
C2  Reduce, then scan (three launches, the classic hierarchical scan):
      a) each threadgroup sums its tile of 4,096 values           (read N)
      b) one threadgroup scans the tile sums (exclusive)          (tiny)
      c) each threadgroup scans its tile again, adding its offset (read N, write N)
    Inside a tile: each thread scans 16 values in registers, simd_prefix_exclusive_sum scans 32 lanes
    (CUDA: a warp scan with __shfl_up_sync), and 8 SIMD-group totals go through threadgroup memory.
"""

C1_STEP = """
uint i = thread_position_in_grid.x;
uint off = (uint)offs[0];
y[i] = (i >= off) ? x[i] + x[i - off] : x[i];
"""

# a) tile sums: 256 threads x 16 values = 4,096 values per threadgroup
C2_TILESUM = """
threadgroup float sh[8];
uint t = thread_position_in_threadgroup.x, g = threadgroup_position_in_grid.x;
const device float4* x4 = (const device float4*)x + g * 1024;
float s = 0.0f;
for (uint k = 0; k < 4; ++k) { float4 v = x4[t + 256 * k]; s += v.x + v.y + v.z + v.w; }
s = simd_sum(s);
if (thread_index_in_simdgroup == 0) sh[simdgroup_index_in_threadgroup] = s;
threadgroup_barrier(mem_flags::mem_threadgroup);
if (t == 0) { float a = 0.0f; for (uint k = 0; k < 8; ++k) a += sh[k]; sums[g] = a; }
"""

# b) exclusive scan of up to 1,024 x 4 tile sums by one threadgroup of 1,024 threads
C2_SCANSUMS = """
threadgroup float sh[32];
uint t = thread_position_in_threadgroup.x, n = sums_shape[0];
float v[4]; float run = 0.0f;
for (uint k = 0; k < 4; ++k) { uint i = 4 * t + k; v[k] = (i < n) ? sums[i] : 0.0f; run += v[k]; }
float ex = simd_prefix_exclusive_sum(run);               // scan across the 32 lanes
if (thread_index_in_simdgroup == 31) sh[simdgroup_index_in_threadgroup] = ex + run;
threadgroup_barrier(mem_flags::mem_threadgroup);
if (simdgroup_index_in_threadgroup == 0) { float w = sh[thread_index_in_simdgroup];
  sh[thread_index_in_simdgroup] = simd_prefix_exclusive_sum(w); }
threadgroup_barrier(mem_flags::mem_threadgroup);
float base = sh[simdgroup_index_in_threadgroup] + ex;
for (uint k = 0; k < 4; ++k) { uint i = 4 * t + k; if (i < n) offs[i] = base; base += v[k]; }
"""

# c) scan each tile and add its offset. Thread t owns 16 consecutive values (4 float4), scans them in
# registers, then the 256 thread totals are scanned with simd_prefix_exclusive_sum and 8 SIMD-group totals.
C2_TILESCAN = """
threadgroup float sh[8];
uint t = thread_position_in_threadgroup.x, g = threadgroup_position_in_grid.x;
const device float4* x4 = (const device float4*)x + g * 1024 + 4 * t;
device float4* y4 = (device float4*)y + g * 1024 + 4 * t;
float4 v[4]; float run = 0.0f;
for (uint k = 0; k < 4; ++k) { v[k] = x4[k];
  v[k].y += v[k].x; v[k].z += v[k].y; v[k].w += v[k].z; v[k] += run; run = v[k].w; }
float ex = simd_prefix_exclusive_sum(run);
if (thread_index_in_simdgroup == 31) sh[simdgroup_index_in_threadgroup] = ex + run;
threadgroup_barrier(mem_flags::mem_threadgroup);
float base = offs[g] + ex;
for (uint k = 0; k < simdgroup_index_in_threadgroup; ++k) base += sh[k];
for (uint k = 0; k < 4; ++k) y4[k] = v[k] + base;
"""
