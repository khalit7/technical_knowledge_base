"""Writes the small tensor-core kernels in kernels/ (one instruction family each).
Each kernel is compiled for eight targets by compile_all.sh; none is run (no NVIDIA GPU).
Register lists for the wide instructions are generated here so the .cu files stay exact."""
import os
K = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kernels")
os.makedirs(K, exist_ok=True)

def regs(first, n):
    return "{" + ",".join("%%%d" % i for i in range(first, first + n)) + "}"

HEAD = "#include <cstdint>\n#include <cuda_fp16.h>\n"

def mma_sync(name, comment, ptx, na, nb, acc="f", nacc=4):
    # one warp, operands in registers: d = a*b + c, c and d the same registers
    t = "float" if acc == "f" else "int"
    cons = '"+f"' if acc == "f" else '"+r"'
    s = HEAD + "// " + comment + "\n// Compiled here for eight targets, not run (no NVIDIA GPU).\n"
    s += 'extern "C" __global__ void %s(const uint32_t* A, const uint32_t* B, %s* D) {\n' % (name, t)
    s += "  int lane = threadIdx.x & 31;\n"
    s += "  uint32_t a[%d], b[%d]; %s d[%d];\n" % (na, nb, t, nacc)
    s += "  for (int i = 0; i < %d; ++i) a[i] = A[lane * %d + i];\n" % (na, na)
    s += "  for (int i = 0; i < %d; ++i) b[i] = B[lane * %d + i];\n" % (nb, nb)
    s += "  for (int i = 0; i < %d; ++i) d[i] = 0;\n" % nacc
    s += '  asm volatile("%s %s, %s, %s, %s;\\n"\n' % (ptx, regs(0, nacc), regs(nacc, na), regs(nacc + na, nb), regs(0, nacc))
    s += "    : " + ", ".join('%s(d[%d])' % (cons, i) for i in range(nacc)) + "\n"
    s += "    : " + ", ".join('"r"(a[%d])' % i for i in range(na)) + ", " + ", ".join('"r"(b[%d])' % i for i in range(nb)) + ");\n"
    s += "  for (int i = 0; i < %d; ++i) D[lane * %d + i] = d[i];\n}\n" % (nacc, nacc)
    return s

files = {}
files["i01_mma_f16"] = mma_sync("mma_f16", "mma.sync m16n8k16, FP16 inputs, FP32 accumulate: the Ampere tensor-core instruction (HMMA).",
    "mma.sync.aligned.m16n8k16.row.col.f32.f16.f16.f32", 4, 2)
files["i02_mma_bf16"] = mma_sync("mma_bf16", "mma.sync m16n8k16, BF16 inputs, FP32 accumulate.",
    "mma.sync.aligned.m16n8k16.row.col.f32.bf16.bf16.f32", 4, 2)
files["i03_mma_tf32"] = mma_sync("mma_tf32", "mma.sync m16n8k8, TF32 inputs (FP32 storage, 10-bit mantissa), FP32 accumulate.",
    "mma.sync.aligned.m16n8k8.row.col.f32.tf32.tf32.f32", 4, 2)
files["i04_mma_s8"] = mma_sync("mma_s8", "mma.sync m16n8k32, INT8 inputs, INT32 accumulate (IMMA).",
    "mma.sync.aligned.m16n8k32.row.col.s32.s8.s8.s32", 4, 2, acc="r")
files["i05_mma_e4m3"] = mma_sync("mma_e4m3", "mma.sync m16n8k32, FP8 E4M3 inputs, FP32 accumulate (PTX: sm_89 and later).",
    "mma.sync.aligned.m16n8k32.row.col.f32.e4m3.e4m3.f32", 4, 2)
files["i06_mma_f8f6f4_e2m1"] = mma_sync("mma_e2m1", "mma.sync m16n8k32 kind::f8f6f4 with FP4 E2M1 inputs (consumer Blackwell, sm_120a).",
    "mma.sync.aligned.m16n8k32.row.col.kind::f8f6f4.f32.e2m1.e2m1.f32", 4, 2)

# block-scaled FP4 mma.sync: every 32 K-elements share one UE8M0 scale (MXFP4)
s = HEAD + """// mma.sync m16n8k64 kind::mxf4 block_scale: FP4 (E2M1) inputs, one 8-bit power-of-two
// scale (UE8M0) per 32 elements along K for A and for B, FP32 accumulate. sm_120a.
// Compiled here for eight targets, not run (no NVIDIA GPU).
extern "C" __global__ void mma_mxf4(const uint32_t* A, const uint32_t* B, const uint32_t* S, float* D) {
  int lane = threadIdx.x & 31;
  uint32_t a0 = A[lane*4], a1 = A[lane*4+1], a2 = A[lane*4+2], a3 = A[lane*4+3], b0 = B[lane*2], b1 = B[lane*2+1];
  uint32_t sa = S[lane], sb = S[32 + lane];
  float d0 = 0, d1 = 0, d2 = 0, d3 = 0;
  asm volatile("mma.sync.aligned.m16n8k64.row.col.kind::mxf4.block_scale.scale_vec::2X.f32.e2m1.e2m1.f32.ue8m0 "
               "{%0,%1,%2,%3}, {%4,%5,%6,%7}, {%8,%9}, {%0,%1,%2,%3}, %10, {0, 0}, %11, {0, 0};\\n"
               : "+f"(d0), "+f"(d1), "+f"(d2), "+f"(d3)
               : "r"(a0), "r"(a1), "r"(a2), "r"(a3), "r"(b0), "r"(b1), "r"(sa), "r"(sb));
  D[lane*4] = d0; D[lane*4+1] = d1; D[lane*4+2] = d2; D[lane*4+3] = d3;
}
"""
files["i07_mma_mxf4_blockscale"] = s

files["i08_ldmatrix"] = HEAD + """// ldmatrix: one warp loads four 8x8 tiles of 16-bit values from shared memory straight into
// the register fragment layout mma.sync expects (LDSM); .trans transposes on the way.
// stmatrix (sm_90 and later) is the reverse, used by epilogues. Compiled here, not run.
extern "C" __global__ void ldsm(const half* G, uint32_t* out) {
  __shared__ alignas(128) half s[64 * 8];
  for (int i = threadIdx.x; i < 64 * 8; i += 32) s[i] = G[i];
  __syncwarp();
  int lane = threadIdx.x & 31;
  uint32_t addr = static_cast<uint32_t>(__cvta_generic_to_shared(&s[lane * 8]));  // lane i gives row i's address
  uint32_t r0, r1, r2, r3, t0, t1, t2, t3;
  asm volatile("ldmatrix.sync.aligned.m8n8.x4.shared.b16 {%0,%1,%2,%3}, [%4];\\n" : "=r"(r0), "=r"(r1), "=r"(r2), "=r"(r3) : "r"(addr));
  asm volatile("ldmatrix.sync.aligned.m8n8.x4.trans.shared.b16 {%0,%1,%2,%3}, [%4];\\n" : "=r"(t0), "=r"(t1), "=r"(t2), "=r"(t3) : "r"(addr));
  out[lane * 8 + 0] = r0; out[lane * 8 + 1] = r1; out[lane * 8 + 2] = r2; out[lane * 8 + 3] = r3;
  out[lane * 8 + 4] = t0; out[lane * 8 + 5] = t1; out[lane * 8 + 6] = t2; out[lane * 8 + 7] = t3;
#if __CUDA_ARCH__ >= 900
  __syncwarp();
  asm volatile("stmatrix.sync.aligned.m8n8.x4.shared.b16 [%0], {%1,%2,%3,%4};\\n" :: "r"(addr), "r"(r0), "r"(r1), "r"(r2), "r"(r3) : "memory");
  __syncwarp();
  out[256 + lane] = reinterpret_cast<const uint32_t*>(s)[lane];
#endif
}
"""

DESC = """__device__ __forceinline__ uint64_t desc(const void* smem, uint32_t lbo, uint32_t sbo, int version) {
  uint32_t a = static_cast<uint32_t>(__cvta_generic_to_shared(smem));
  uint64_t d = 0;
  d |= (uint64_t)((a & 0x3FFFF) >> 4);            // start address / 16
  d |= (uint64_t)((lbo & 0x3FFFF) >> 4) << 16;    // leading-dimension byte offset / 16
  d |= (uint64_t)((sbo & 0x3FFFF) >> 4) << 32;    // stride-dimension byte offset / 16
  d |= (uint64_t)version << 46;                   // Blackwell descriptors carry version 1; Hopper 0
  return d;                                       // top bits 0: no swizzle
}
"""

def wgmma(name, comment, ptx, n, ab_bytes_k, rs=False, trans=True):
    nacc = n // 2   # m64nN: 64*N fp32 values over 128 threads
    s = HEAD + DESC + "// " + comment + "\n// sm_90a only by design. Compiled here for eight targets, not run (no NVIDIA GPU).\n"
    s += 'extern "C" __global__ void __launch_bounds__(128) %s(const uint32_t* A, const uint32_t* B, float* C) {\n' % name
    s += "  __shared__ alignas(128) uint32_t As[64 * 8];\n  __shared__ alignas(128) uint32_t Bs[%d * 8];\n" % n
    s += "  for (int i = threadIdx.x; i < 64 * 8; i += 128) As[i] = A[i];\n"
    s += "  for (int i = threadIdx.x; i < %d * 8; i += 128) Bs[i] = B[i];\n  __syncthreads();\n" % n
    s += '  asm volatile("fence.proxy.async.shared::cta;\\n" ::: "memory");\n'
    s += "  uint64_t da = desc(As, 128, 256, 0), db = desc(Bs, 128, 256, 0);\n"
    s += "  float d[%d];\n#pragma unroll\n  for (int i = 0; i < %d; ++i) d[i] = 0.f;\n" % (nacc, nacc)
    if rs:
        s += "  uint32_t a[4];\n  for (int i = 0; i < 4; ++i) a[i] = A[threadIdx.x * 4 + i];\n"
    s += '  asm volatile("wgmma.fence.sync.aligned;\\n" ::: "memory");\n'
    if rs:
        args = "%s, %s, %s, p, 1, 1, 1" % (regs(0, nacc), regs(nacc, 4), "%%%d" % (nacc + 4))
        pidx = nacc + 5
    else:
        # FP8 wgmma takes no transpose immediates: both operands must be K-major
        args = "%s, %%%d, %%%d, p, 1, 1%s" % (regs(0, nacc), nacc, nacc + 1, ", 0, 0" if trans else "")
        pidx = nacc + 2
    s += '  asm volatile("{\\n.reg .pred p;\\nsetp.ne.b32 p, %%%d, 0;\\n"\n' % pidx
    s += '    "%s %s;\\n}\\n"\n' % (ptx, args)
    s += "    : " + ", ".join('"+f"(d[%d])' % i for i in range(nacc)) + "\n"
    if rs:
        s += '    : "r"(a[0]), "r"(a[1]), "r"(a[2]), "r"(a[3]), "l"(db), "r"(1));\n'
    else:
        s += '    : "l"(da), "l"(db), "r"(1));\n'
    s += '  asm volatile("wgmma.commit_group.sync.aligned;\\n" ::: "memory");\n'
    s += '  asm volatile("wgmma.wait_group.sync.aligned 0;\\n" ::: "memory");\n'
    s += "#pragma unroll\n  for (int i = 0; i < %d; ++i) C[threadIdx.x * %d + i] = d[i];   // fragment order\n}\n" % (nacc, nacc)
    return s

files["i10_wgmma_f16_ss"] = wgmma("wgmma_f16_ss", "wgmma m64n128k16 FP16 -> FP32, both operands from shared memory (SS): one warpgroup (4 warps), asynchronous.",
    "wgmma.mma_async.sync.aligned.m64n128k16.f32.f16.f16", 128, 32)
files["i11_wgmma_f16_rs"] = wgmma("wgmma_f16_rs", "wgmma m64n128k16 FP16 -> FP32 with A from registers (RS), B from shared memory.",
    "wgmma.mma_async.sync.aligned.m64n128k16.f32.f16.f16", 128, 32, rs=True)
files["i12_wgmma_e4m3"] = wgmma("wgmma_e4m3", "wgmma m64n128k32 FP8 E4M3 -> FP32 (Hopper's native FP8 path).",
    "wgmma.mma_async.sync.aligned.m64n128k32.f32.e4m3.e4m3", 128, 32, trans=False)
files["i13_wgmma_f16_n256"] = wgmma("wgmma_f16_n256", "wgmma m64n256k16 FP16 -> FP32: the widest N, 128 accumulator registers per thread.",
    "wgmma.mma_async.sync.aligned.m64n256k16.f32.f16.f16", 256, 32)

def tcgen05(name, comment, kind_line, scale=False, pair=False):
    cg = "cta_group::2" if pair else "cta_group::1"
    s = HEAD + DESC + "// " + comment + "\n// Compiled here for eight targets, not run (no NVIDIA GPU); numerical result not verified.\n"
    if pair:
        s += 'extern "C" __global__ void __cluster_dims__(2, 1, 1) __launch_bounds__(128) '
    else:
        s += 'extern "C" __global__ void __launch_bounds__(128) '
    s += "%s(const uint32_t* A, const uint32_t* B, const uint32_t* SF, float* C, uint32_t idesc) {\n" % name
    s += """  __shared__ alignas(128) uint32_t As[128 * 8];
  __shared__ alignas(128) uint32_t Bs[128 * 8];
  __shared__ uint32_t tmem_base;
  __shared__ alignas(8) uint64_t mbar;
  int warp = threadIdx.x >> 5;
  for (int i = threadIdx.x; i < 128 * 8; i += 128) { As[i] = A[i]; Bs[i] = B[i]; }
  uint32_t mbar_s = static_cast<uint32_t>(__cvta_generic_to_shared(&mbar));
  if (threadIdx.x == 0) asm volatile("mbarrier.init.shared::cta.b64 [%0], 1;\\n" :: "r"(mbar_s));
  if (warp == 0) {                                 // one warp allocates TMEM columns (a power of two, at least 32)
    uint32_t dst = static_cast<uint32_t>(__cvta_generic_to_shared(&tmem_base));
    asm volatile("tcgen05.alloc.CG.sync.aligned.shared::cta.b32 [%0], 256;\\n" :: "r"(dst));
    asm volatile("tcgen05.relinquish_alloc_permit.CG.sync.aligned;\\n");
  }
  asm volatile("fence.proxy.async.shared::cta;\\n" ::: "memory");
  asm volatile("tcgen05.fence::before_thread_sync;\\n" ::: "memory");
  __syncthreads();
  asm volatile("tcgen05.fence::after_thread_sync;\\n" ::: "memory");
  uint32_t tmem = tmem_base;
  if (threadIdx.x == 0) {                          // a single thread issues the MMA for the whole CTA
    uint64_t da = desc(As, 128, 256, 1), db = desc(Bs, 128, 256, 1);
""".replace("CG", cg)
    if scale:
        s += """    uint32_t sfa = tmem + 128, sfb = tmem + 160;   // scale factors live in TMEM too (copied there by tcgen05.cp)
    asm volatile("{\\n.reg .pred p;\\nsetp.ne.b32 p, %6, 0;\\n"
                 "KIND [%0], %1, %2, %3, [%4], [%5], p;\\n}\\n"
                 :: "r"(tmem), "l"(da), "l"(db), "r"(idesc), "r"(sfa), "r"(sfb), "r"(0));
"""
    else:
        s += """    asm volatile("{\\n.reg .pred p;\\nsetp.ne.b32 p, %4, 0;\\n"
                 "KIND [%0], %1, %2, %3, p;\\n}\\n"
                 :: "r"(tmem), "l"(da), "l"(db), "r"(idesc), "r"(0));
"""
    s = s.replace("KIND", kind_line)
    s += """    asm volatile("tcgen05.commit.CG.mbarrier::arrive::one.shared::cluster.b64 [%0];\\n" :: "r"(mbar_s));
  }
  asm volatile("{\\n.reg .pred P1;\\nWAIT:\\n"
               "mbarrier.try_wait.parity.shared::cta.b64 P1, [%0], 0;\\n"
               "@!P1 bra WAIT;\\n}\\n" :: "r"(mbar_s));
  asm volatile("tcgen05.fence::after_thread_sync;\\n" ::: "memory");
  uint32_t r[8];                                   // the epilogue: each warp reads its 32 TMEM lanes, 8 columns
  uint32_t taddr = tmem + ((warp * 32) << 16);
  asm volatile("tcgen05.ld.sync.aligned.32x32b.x8.b32 {%0,%1,%2,%3,%4,%5,%6,%7}, [%8];\\n"
               : "=r"(r[0]), "=r"(r[1]), "=r"(r[2]), "=r"(r[3]), "=r"(r[4]), "=r"(r[5]), "=r"(r[6]), "=r"(r[7])
               : "r"(taddr));
  asm volatile("tcgen05.wait::ld.sync.aligned;\\n" ::: "memory");
#pragma unroll
  for (int i = 0; i < 8; ++i) C[threadIdx.x * 8 + i] = __uint_as_float(r[i]);
  __syncthreads();
  if (warp == 0) asm volatile("tcgen05.dealloc.CG.sync.aligned.b32 %0, 256;\\n" :: "r"(tmem));
}
""".replace("CG", cg)
    return s

files["i14_tcgen05_f16"] = tcgen05("tc05_f16", "tcgen05.mma kind::f16 (FP16/BF16 inputs, FP32 accumulator in TMEM), one CTA.",
    "tcgen05.mma.cta_group::1.kind::f16")
files["i15_tcgen05_tf32"] = tcgen05("tc05_tf32", "tcgen05.mma kind::tf32.", "tcgen05.mma.cta_group::1.kind::tf32")
files["i16_tcgen05_f8f6f4"] = tcgen05("tc05_f8f6f4", "tcgen05.mma kind::f8f6f4 (FP8, FP6 or FP4 inputs; the type is in the instruction descriptor).",
    "tcgen05.mma.cta_group::1.kind::f8f6f4")
files["i17_tcgen05_mxf8f6f4"] = tcgen05("tc05_mxf8f6f4", "tcgen05.mma kind::mxf8f6f4 block_scale: MX formats, one UE8M0 scale per 32 elements, scales read from TMEM.",
    "tcgen05.mma.cta_group::1.kind::mxf8f6f4.block_scale", scale=True)
files["i18_tcgen05_nvf4"] = tcgen05("tc05_nvf4", "tcgen05.mma kind::mxf4nvf4 block_scale scale_vec::4X: NVFP4, one E4M3 scale per 16 elements.",
    "tcgen05.mma.cta_group::1.kind::mxf4nvf4.block_scale.scale_vec::4X", scale=True)
files["i19_tcgen05_pair"] = tcgen05("tc05_pair", "tcgen05.mma cta_group::2: one MMA spread over the two SMs of a cluster pair (each holds half of A and of the accumulator).",
    "tcgen05.mma.cta_group::2.kind::f16", pair=True)

files["i20_tma"] = HEAD + """#include <cuda.h>
// TMA from the programmer's side, three forms in one kernel launched as a 2-block cluster:
// (1) a 2D tile load into shared memory, completion counted in bytes on an mbarrier;
// (2) the same load multicast: one copy lands in the shared memory of every CTA in ctaMask;
// (3) a 2D tile store from shared memory back to global, tracked by a bulk group.
// The CUtensorMap (shape, strides, box size, swizzle) is built on the host. Compiled here, not run.
extern "C" __global__ void __cluster_dims__(2, 1, 1) __launch_bounds__(128)
tma_forms(const __grid_constant__ CUtensorMap in, const __grid_constant__ CUtensorMap out) {
  __shared__ alignas(1024) half tile[64 * 64];
  __shared__ alignas(1024) half tile2[64 * 64];
  __shared__ alignas(8) uint64_t bar;
  uint32_t bar_s = static_cast<uint32_t>(__cvta_generic_to_shared(&bar));
  uint32_t dst = static_cast<uint32_t>(__cvta_generic_to_shared(tile));
  uint32_t dst2 = static_cast<uint32_t>(__cvta_generic_to_shared(tile2));
  int x = 0, y = blockIdx.x * 64;
  if (threadIdx.x == 0) {
    asm volatile("mbarrier.init.shared::cta.b64 [%0], 1;\\n" :: "r"(bar_s));
    asm volatile("fence.mbarrier_init.release.cluster;\\n" ::: "memory");
  }
  asm volatile("barrier.cluster.arrive.release.aligned;\\nbarrier.cluster.wait.acquire.aligned;\\n" ::: "memory");
  if (threadIdx.x == 0) {
    asm volatile("mbarrier.arrive.expect_tx.shared::cta.b64 _, [%0], %1;\\n" :: "r"(bar_s), "r"(2 * 64 * 64 * 2));
    asm volatile("cp.async.bulk.tensor.2d.shared::cluster.global.mbarrier::complete_tx::bytes [%0], [%1, {%2, %3}], [%4];\\n"
                 :: "r"(dst), "l"(&in), "r"(x), "r"(y), "r"(bar_s) : "memory");
    uint16_t mask = 0x3;                           // both CTAs of the cluster receive the tile
    if (blockIdx.x % 2 == 0)
      asm volatile("cp.async.bulk.tensor.2d.shared::cluster.global.mbarrier::complete_tx::bytes.multicast::cluster [%0], [%1, {%2, %3}], [%4], %5;\\n"
                   :: "r"(dst2), "l"(&in), "r"(x + 64), "r"(y), "r"(bar_s), "h"(mask) : "memory");
  }
  asm volatile("{\\n.reg .pred P1;\\nWAIT:\\n"
               "mbarrier.try_wait.parity.shared::cta.b64 P1, [%0], 0;\\n"
               "@!P1 bra WAIT;\\n}\\n" :: "r"(bar_s));
  for (int i = threadIdx.x; i < 64 * 64; i += 128) tile[i] = __hadd(tile[i], tile2[i]);
  asm volatile("fence.proxy.async.shared::cta;\\n" ::: "memory");
  __syncthreads();
  if (threadIdx.x == 0) {
    asm volatile("cp.async.bulk.tensor.2d.global.shared::cta.bulk_group [%0, {%1, %2}], [%3];\\n"
                 :: "l"(&out), "r"(x), "r"(y), "r"(dst) : "memory");
    asm volatile("cp.async.bulk.commit_group;\\ncp.async.bulk.wait_group.read 0;\\n" ::: "memory");
  }
  asm volatile("barrier.cluster.arrive.release.aligned;\\nbarrier.cluster.wait.acquire.aligned;\\n" ::: "memory");
}
"""

files["i21_setmaxnreg"] = HEAD + """// setmaxnreg: Hopper's register hand-off between warpgroups in a warp-specialised kernel.
// The producer warpgroup (TMA only) gives registers back; the consumer warpgroups (MMA) take them.
// Compiled here for eight targets, not run.
extern "C" __global__ void __launch_bounds__(384, 1) wspec(float* out) {
  int wg = threadIdx.x / 128;
  if (wg == 0) {
    asm volatile("setmaxnreg.dec.sync.aligned.u32 40;\\n");
    out[threadIdx.x] = 1.f;
  } else {
    asm volatile("setmaxnreg.inc.sync.aligned.u32 232;\\n");
    out[threadIdx.x] = 2.f;
  }
}
"""

for k, v in files.items():
    open(os.path.join(K, k + ".cu"), "w").write(v)
print(len(files), "kernels written")
