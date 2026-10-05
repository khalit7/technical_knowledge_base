"""Sum reduction, Mark Harris's ladder re-run as Metal kernel bodies for mx.fast.metal_kernel.

Input x: N float32. Kernels R1..R5 write one partial sum per threadgroup (part[]); the partials are then
summed by a second, tiny launch (mx.sum over a few thousand floats), as in Harris's deck.
CUDA names: threadgroup = block, threadgroup memory = __shared__, threadgroup_barrier = __syncthreads,
simd_sum = a warp shuffle reduction (__shfl_down_sync five times), SIMD-group = warp (32 lanes on both).
Every body is shown verbatim on the page; keep them short.
"""

# R1: interleaved addressing, divergent branch. At step s only threads with tid % (2s) == 0 work,
# so every SIMD-group stays busy (some lanes on) long after most of its lanes are idle.
R1_INTERLEAVED = """
threadgroup float sh[256];
uint t = thread_position_in_threadgroup.x, g = threadgroup_position_in_grid.x;
sh[t] = x[g * 256 + t];
threadgroup_barrier(mem_flags::mem_threadgroup);
for (uint s = 1; s < 256; s *= 2) {
  if (t % (2 * s) == 0) sh[t] += sh[t + s];        // divergent: lanes 0, 2s, 4s, ... work
  threadgroup_barrier(mem_flags::mem_threadgroup);
}
if (t == 0) part[g] = sh[0];
"""

# R2: interleaved addressing, strided index. The working threads are now contiguous (no divergence),
# but thread t touches sh[2*s*t]: at s = 16 a SIMD-group's lanes hit addresses 32 floats apart (bank conflicts).
R2_STRIDED = """
threadgroup float sh[256];
uint t = thread_position_in_threadgroup.x, g = threadgroup_position_in_grid.x;
sh[t] = x[g * 256 + t];
threadgroup_barrier(mem_flags::mem_threadgroup);
for (uint s = 1; s < 256; s *= 2) {
  uint i = 2 * s * t;
  if (i < 256) sh[i] += sh[i + s];                 // contiguous threads, strided addresses
  threadgroup_barrier(mem_flags::mem_threadgroup);
}
if (t == 0) part[g] = sh[0];
"""

# R3: sequential addressing. Halve the active range each step: thread t adds sh[t + s].
# Contiguous threads, contiguous addresses: no divergence inside a SIMD-group, no bank conflicts.
R3_SEQUENTIAL = """
threadgroup float sh[256];
uint t = thread_position_in_threadgroup.x, g = threadgroup_position_in_grid.x;
sh[t] = x[g * 256 + t];
threadgroup_barrier(mem_flags::mem_threadgroup);
for (uint s = 128; s > 0; s >>= 1) {
  if (t < s) sh[t] += sh[t + s];
  threadgroup_barrier(mem_flags::mem_threadgroup);
}
if (t == 0) part[g] = sh[0];
"""

# R4: first add during the load. Half the threadgroups, each thread loads two values and adds them,
# so no thread is idle in the first step.
R4_FIRSTADD = """
threadgroup float sh[256];
uint t = thread_position_in_threadgroup.x, g = threadgroup_position_in_grid.x;
sh[t] = x[g * 512 + t] + x[g * 512 + t + 256];
threadgroup_barrier(mem_flags::mem_threadgroup);
for (uint s = 128; s > 0; s >>= 1) {
  if (t < s) sh[t] += sh[t + s];
  threadgroup_barrier(mem_flags::mem_threadgroup);
}
if (t == 0) part[g] = sh[0];
"""

# R5: the last 32 values are summed by one SIMD-group in registers (simd_sum; CUDA: __shfl_down_sync),
# replacing five barrier-separated shared-memory steps. Harris's 2007 version did this with "warp-synchronous"
# volatile shared memory, which is no longer safe since Volta's independent thread scheduling.
R5_SIMD_TAIL = """
threadgroup float sh[256];
uint t = thread_position_in_threadgroup.x, g = threadgroup_position_in_grid.x;
sh[t] = x[g * 512 + t] + x[g * 512 + t + 256];
threadgroup_barrier(mem_flags::mem_threadgroup);
for (uint s = 128; s > 16; s >>= 1) {
  if (t < s) sh[t] += sh[t + s];
  threadgroup_barrier(mem_flags::mem_threadgroup);
}
if (t < 32) { float v = sh[t]; v = simd_sum(v); if (t == 0) part[g] = v; }
"""

# R6: many elements per thread. A fixed grid of G threadgroups; each thread sums a strided slice of x
# in a register (grid-stride loop, 16-byte float4 loads), then simd_sum, then 8 partials per threadgroup.
# Almost all the work is now coalesced loads and register adds; shared memory is touched 8 times.
R6_GRIDSTRIDE = """
threadgroup float sh[8];
uint t = thread_position_in_threadgroup.x, g = threadgroup_position_in_grid.x;
uint G = threadgroups_per_grid.x, n4 = x_shape[0] / 4;
const device float4* x4 = (const device float4*)x;
float4 acc = 0.0f;
for (uint i = g * 256 + t; i < n4; i += G * 256) acc += x4[i];
float v = simd_sum(acc.x + acc.y + acc.z + acc.w);
if (thread_index_in_simdgroup == 0) sh[simdgroup_index_in_threadgroup] = v;
threadgroup_barrier(mem_flags::mem_threadgroup);
if (t == 0) { float s = 0.0f; for (uint k = 0; k < 8; ++k) s += sh[k]; part[g] = s; }
"""

# A1: same as R6, but each threadgroup adds its partial into ONE output with an atomic: a single launch.
# The order in which threadgroups arrive changes from run to run, so the float result can change too.
A1_ATOMIC = """
threadgroup float sh[8];
uint t = thread_position_in_threadgroup.x, g = threadgroup_position_in_grid.x;
uint G = threadgroups_per_grid.x, n4 = x_shape[0] / 4;
const device float4* x4 = (const device float4*)x;
float4 acc = 0.0f;
for (uint i = g * 256 + t; i < n4; i += G * 256) acc += x4[i];
float v = simd_sum(acc.x + acc.y + acc.z + acc.w);
if (thread_index_in_simdgroup == 0) sh[simdgroup_index_in_threadgroup] = v;
threadgroup_barrier(mem_flags::mem_threadgroup);
if (t == 0) { float s = 0.0f; for (uint k = 0; k < 8; ++k) s += sh[k];
  atomic_fetch_add_explicit(&out[0], s, memory_order_relaxed); }
"""
