# Plain-words notes for the Compiler explorer, with every number computed from the data.
import re
from collections import Counter


def opof(ins):
    t = re.sub(r"^@!?U?P[T0-9]+\s+", "", ins)
    m = re.match(r"([A-Z0-9_]+)", t)
    return m.group(1) if m else ""


def width(ins):
    op = re.sub(r"^@!?U?P[T0-9]+\s+", "", ins).split(" ")[0]
    m = re.search(r"\.(64|128)(\.|$)", op)
    return int(m.group(1)) // 8 if m else 4


def unpack(x):
    if isinstance(x, list) and len(x) == 2 and isinstance(x[0], str):
        return [[t, []] for t in x[0].split("\n")]
    return x


def counts(sass):
    return Counter(opof(l[0]) for l in unpack(sass))


def add_notes(data, occupancy):
    A = data["archs"]
    K = {k["id"]: k for k in data["kernels"]}
    R = lambda kid, a: K[kid]["arch"][a]
    regs = lambda kid, a: R(kid, a)["res"]["regs"]
    occ = lambda kid, a: occupancy(a, regs(kid, a), R(kid, a)["res"]["smem"], K[kid]["block"], 0, R(kid, a)["res"]["bars"])
    pct = lambda x: f"{round(x * 100)}%"

    K["k1_vadd"]["note"] = (f"{regs('k1_vadd', 'sm_90a')} registers per thread on every target, no shared memory: nothing limits occupancy except the warp slots. "
                            "Click line 5 of the source: two <code>LDG</code> (global loads), one <code>FADD</code>, one <code>STG</code>. The rest is index arithmetic and the bounds check (<code>ISETP</code> sets a predicate, <code>@P0 EXIT</code> retires out-of-range threads).")
    c = {a: counts(R("k2_matmul_naive", a)["sass"]) for a in A}
    K["k2_matmul_naive"]["note"] = (f"ptxas unrolled the K loop: on sm_80 and sm_90a the loop body holds {data['loopStats']['k2_matmul_naive']['sm_90a']['FFMA']} FFMA and "
                                    f"{data['loopStats']['k2_matmul_naive']['sm_90a']['LDG']} LDG, on sm_100a and sm_120 {data['loopStats']['k2_matmul_naive']['sm_120']['FFMA']} FFMA and {data['loopStats']['k2_matmul_naive']['sm_120']['LDG']} LDG. "
                                    "Either way: two global loads for every multiply-add. Section 3 animates that loop.")
    o120 = occ("k3_matmul_tiled", "sm_120")
    o90 = occ("k3_matmul_tiled", "sm_90a")
    K["k3_matmul_tiled"]["note"] = (f"{R('k3_matmul_tiled', 'sm_90a')['res']['smem']:,} bytes of shared memory per block (two 32 x 32 FP32 tiles). Look for <code>STS</code> (fill the tile), <code>BAR.SYNC</code> (wait), then a run of <code>LDS</code> and <code>FFMA</code>; some loads are <code>LDS.128</code>, four floats of A's row at once. "
                                    f"On sm_120 ptxas used {regs('k3_matmul_tiled', 'sm_120')} registers instead of {regs('k3_matmul_tiled', 'sm_90a')}: with 1,024-thread blocks that leaves room for {o120['blocks']} block ({pct(o120['occ'])} occupancy) against {o90['blocks']} ({pct(o90['occ'])}) on sm_90a.")
    shfl = counts(R("k4_reduce_warp", "sm_90a")["sass"])["SHFL"]
    red = [l[0] for l in unpack(R("k4_reduce_warp", "sm_90a")["sass"]) if opof(l[0]) in ("RED", "REDG", "ATOMG")]
    K["k4_reduce_warp"]["note"] = (f"{shfl} <code>SHFL</code> instructions: two warp sums of five steps each, fully unrolled. The block's final <code>atomicAdd</code> became <code>{red[0].split(' ')[0] if red else 'RED'}</code>, a reduction that does not return the old value, because the result is never read.")
    sm = unpack(R("k5_softmax", "sm_90a")["sass"])
    ex2 = sum(1 for l in sm if l[0].startswith("MUFU.EX2") or " MUFU.EX2" in l[0])
    rcp = sum(1 for l in sm if "MUFU.RCP" in l[0])
    K["k5_softmax"]["note"] = (f"Each <code>__expf</code> becomes an <code>FMUL</code> by log2(e) and a <code>MUFU.EX2</code> on the special-function unit ({ex2} <code>MUFU.EX2</code>, one per exponential pass). The single division <code>1.f / s</code> accounts for {rcp} <code>MUFU.RCP</code>: by default nvcc compiles division to be IEEE-exact, a reciprocal estimate plus refinement, with a slower subroutine (the <code>CALL</code>) for awkward inputs; <code>--use_fast_math</code> would make it one approximate instruction. "
                               "The row is read from global memory three times (passes 1, 2 and 3): this is the version a fused, single-pass softmax improves on, and the Kernel lab tab measures that.")
    hm = {a: counts(R("k6_wmma", a)["sass"])["HMMA"] for a in A}
    K["k6_wmma"]["note"] = (f"Each 16 x 16 x 16 <code>mma_sync</code> becomes two <code>HMMA.16816</code> (two 16 x 8 halves of the output); the loop is unrolled, so {hm['sm_90a']} HMMA appear on sm_90a. "
                            "The same HMMA on all four targets: WMMA is the portable path, but on sm_90a it cannot reach the Hopper-only wgmma instruction.")
    K["k7_mma_fp8"]["note"] = ("The FP8 instruction compiled three different ways: an error on sm_80 (FP8 needs sm_89 or later), FP8-to-FP16 conversions (<code>F2FP.F16.E4M3.UNPACK_B</code>) followed by two FP16 <code>HMMA</code> on sm_90a and sm_100a, "
                               "and one native <code>QMMA.16832.F32.E4M3.E4M3</code> on sm_120. Switch the target to compare.")
    K["k8_wgmma"]["note"] = (f"One <code>HGMMA.64x64x16.F32</code> with <code>gdesc[UR4]</code>: the descriptor in uniform registers points at shared memory; there is no per-thread operand register for A or B. "
                             f"Each thread still holds 32 accumulator registers (64 x 64 FP32 results over 128 threads), part of its {regs('k8_wgmma', 'sm_90a')} registers. <code>WARPGROUP.ARRIVE</code> and <code>WARPGROUP.DEPBAR</code> are the fence and wait.")
    K["k9_tcgen05"]["note"] = (f"Find <code>UTCHMMA</code> (the MMA, issued by one elected thread: see <code>ELECT</code>), <code>UTCBAR</code> (commit to the mbarrier), <code>LDTM</code> (Tensor Memory to registers) and <code>UTCATOMSWS</code> (TMEM allocation). "
                               f"Only {regs('k9_tcgen05', 'sm_100a')} registers per thread: the 128 x 64 FP32 accumulator (32 KB) lives in Tensor Memory, not in registers, which is the point of tcgen05.")
    K["k11_tma"]["note"] = (f"<code>UTMALDG.2D</code> is the whole tile copy in one instruction from one thread; <code>SYNCS</code> instructions are the mbarrier waits. It compiles for sm_90a, sm_100a <b>and sm_120</b>: consumer Blackwell has TMA and clusters. "
                            f"sm_80 fails on the cluster attribute first (clusters and TMA are Hopper features). Registers: {regs('k11_tma', 'sm_90a')} on sm_90a, {regs('k11_tma', 'sm_100a')} on sm_100a, {regs('k11_tma', 'sm_120')} on sm_120 for the same source.")
    for kid in ("k7_mma_fp8", "k8_wgmma", "k9_tcgen05", "k11_tma"):
        K[kid].setdefault("whyfail", {})
    K["k8_wgmma"]["whyfail"] = {a: " wgmma exists only with the sm_90a target: architecture-specific, so not on Blackwell either." for a in ("sm_100a", "sm_120")}
    K["k9_tcgen05"]["whyfail"] = {a: " tcgen05 exists on datacenter Blackwell (sm_100a and its family), not on Hopper or consumer Blackwell." for a in ("sm_80", "sm_90a", "sm_120")}

    L = data["loopStats"]
    for kid in ("k2_matmul_naive", "k3_matmul_tiled"):
        for a in A:
            s = L[kid][a]
            data["loops"][kid][a]["note"] = (f"Real loop body for {a}: {s['n']} instructions, of which {s['FFMA']} FFMA, {s['LDG']} LDG ({s['gB']} bytes per thread), {s['LDS']} LDS ({s['sB']} bytes)"
                                             + (f", {s['STS']} STS and {s['BAR']} barriers" if s['STS'] else "") + ".")
    sp = data["spill"]
    for n in sp["ns"]:
        d = sp["data"][n]
        if all(d[a]["spillSt"] == 0 for a in A):
            sp["caps"][n] = f"N = {n}: {d['sm_90a']['regs']} registers per thread on sm_90a, no spills on any target. Each thread does N FFMA per loaded x value."
        else:
            parts = ", ".join(f"{a} {d[a]['regs']} registers and {d[a]['spillSt']:,} B of spill stores" for a in A)
            sp["caps"][n] = f"N = {n}: {parts}. The excess lives in local memory, reached with STL and LDL."
            if d["sm_80"]["regs"] < 100:
                sp["caps"][n] += (f" On sm_80 ptxas changed strategy: it moved the array to local memory (a {d['sm_80']['stack']:,}-byte stack frame per thread) and used only {d['sm_80']['regs']} registers ({d['sm_80']['spillSt']:,} B of spill stores), "
                                  f"while for sm_90a it used {d['sm_90a']['regs']} registers and spilled {d['sm_90a']['spillSt']:,} B. Same source, same flags, different heuristics per target.")
    data["whereNote"] = ("Green: compiled (ptxas register count, and the tensor-core SASS instruction when there is one). Red: the compiler refused; click for its message. "
                         "The pattern is the hardware's: wgmma only on sm_90a, tcgen05 only on sm_100a, FP8 mma.sync from sm_89, clusters and TMA from sm_90 (including sm_120).")
    t = data["triton"]
    T = {r["title"]: r for r in t["rows"]}
    data["triton"]["note"] = (
        "Registers from <code>cuobjdump -res-usage</code>; shared memory is the dynamic amount Triton requests; instruction counts are static counts in the SASS. Observations: "
        "(1) Triton picked a different tensor-core instruction for each target from the same <code>tl.dot</code>: HMMA (sm_80, sm_120), HGMMA, i.e. wgmma (sm_90a), UTCHMMA, i.e. tcgen05 (sm_100a). "
        "(2) With FP32 inputs, <code>tl.dot</code> defaults to TF32 tensor cores (<code>input_precision=\"tf32\"</code> in Triton's documentation): the FP32 matmul uses TF32 instructions, not FFMA, which rounds inputs to a 10-bit mantissa. "
        "(3) Global-to-shared copies use <code>LDGSTS</code> (cp.async) on every target here; Triton did not choose TMA for this simple kernel. "
        "(4) The last row shows why launch specialisation matters: without the alignment hints the FP16 matmul loads 2 bytes at a time (<code>LDG.E.U16</code>), uses up to 255 registers and spills on sm_80 and sm_120. "
        f"CPU interpreter check against PyTorch (TRITON_INTERPRET=1, Triton {t['interp']['triton']}, PyTorch {t['interp']['torch']}): max abs error vadd {t['interp']['vadd_max_abs_err']:.1g}, "
        f"matmul FP32 {t['interp']['matmul_float32_max_abs_err']:.1e}, FP16 {t['interp']['matmul_float16_max_abs_err']:.1e}, softmax {t['interp']['softmax_max_abs_err']:.1e}. "
        "The interpreter computes in NumPy FP32, so it checks the indexing and masking, not TF32 or FP16 tensor-core rounding.")
    oc = data["occCheck"]
    data["occCheck"]["note"] = (f"Validation: the page's occupancy function was ported from NVIDIA's <code>cuda_occupancy.h</code> (CUDA {data['meta']['cuda']}), and NVIDIA's own header, compiled and run on the CPU, "
                                f"agrees on all {oc['match']:,} of {oc['n']:,} cases (every kernel here at every block size from 32 to 1,024, the register ladder, and a sweep of register and shared-memory sizes). "
                                "Two details the header encodes: registers are split between 4 sub-partitions of the SM, so warps are counted per quarter; and every block costs 1 KB of reserved shared memory even if it declares none.")
