"""Compile the page's Triton kernels for NVIDIA and AMD targets WITHOUT a GPU.
triton.compile with an explicit GPUTarget runs the whole pipeline: Python AST -> TTIR -> TTGIR -> LLVM IR ->
PTX -> cubin (NVIDIA, ptxas bundled in the wheel) or AMDGCN -> hsaco (AMD, LLVM bundled in the wheel).
Usage (inside kb-gpu-lab:1): python compile_tg.py [main|sweep|all]   -> ../out/ir/*, ../out/compile.json
"""
import os, re, sys, json, subprocess, traceback
import triton
from triton.compiler import ASTSource
from triton.backends.compiler import GPUTarget
from kernels_tg import vadd, softmax, matmul, attn_fwd, matmul_tma

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
IR = os.path.join(OUT, "ir")
os.makedirs(IR, exist_ok=True)
NV = {"sm_80": 80, "sm_90a": 90, "sm_100a": 100, "sm_120": 120}
AMD = {"gfx942": "gfx942", "gfx950": "gfx950"}
D16 = [["tt.divisibility", 16]]


def target(t):
    return GPUTarget("cuda", NV[t], 32) if t in NV else GPUTarget("hip", AMD[t], 64)


# A normal launch on contiguous tensors whose sizes are multiples of 16 specialises like this:
# pointers and integers divisible by 16 get tt.divisibility=16, integers equal to 1 become constants.
def job_vadd(hints=True, block=1024, n_hint=True):
    sig = {"a_ptr": "*fp32", "b_ptr": "*fp32", "c_ptr": "*fp32", "n": "i32", "BLOCK": "constexpr"}
    attrs = {(i,): D16 for i in range(4 if n_hint else 3)} if hints else {}
    return vadd, sig, {"BLOCK": block}, attrs


def job_softmax(block=1024):
    sig = {"x_ptr": "*fp32", "y_ptr": "*fp32", "n_cols": "i32", "stride": "i32", "BLOCK": "constexpr"}
    return softmax, sig, {"BLOCK": block}, {(i,): D16 for i in range(4)}


MM_ORDER = ["a_ptr", "b_ptr", "c_ptr", "M", "N", "K", "stride_am", "stride_ak", "stride_bk", "stride_bn",
            "stride_cm", "stride_cn", "BM", "BN", "BK", "GROUP_M"]


def job_matmul(bm, bn, bk, group=8, dt="fp16"):
    sig = {"a_ptr": "*" + dt, "b_ptr": "*" + dt, "c_ptr": "*fp16"}
    for k in ["M", "N", "K", "stride_am", "stride_bk", "stride_cm"]:
        sig[k] = "i32"
    for k in ["stride_ak", "stride_bn", "stride_cn", "BM", "BN", "BK", "GROUP_M"]:
        sig[k] = "constexpr"
    cx = {"stride_ak": 1, "stride_bn": 1, "stride_cn": 1, "BM": bm, "BN": bn, "BK": bk, "GROUP_M": group}
    attrs = {(MM_ORDER.index(k),): D16 for k in ["a_ptr", "b_ptr", "c_ptr", "M", "N", "K", "stride_am", "stride_bk", "stride_cm"]}
    return matmul, sig, cx, attrs


def job_attn(bm=128, bn=64, d=64, causal=True):
    sig = {"q_ptr": "*fp16", "k_ptr": "*fp16", "v_ptr": "*fp16", "o_ptr": "*fp16", "N": "i32", "sm_scale": "fp32",
           "D": "constexpr", "BM": "constexpr", "BN": "constexpr", "CAUSAL": "constexpr"}
    return attn_fwd, sig, {"D": d, "BM": bm, "BN": bn, "CAUSAL": causal}, {(i,): D16 for i in range(5)}


def job_tma(ws):
    sig = {"a_ptr": "*fp16", "b_ptr": "*fp16", "c_ptr": "*fp16", "M": "i32", "N": "i32", "K": "i32",
           "BM": "constexpr", "BN": "constexpr", "BK": "constexpr", "WS": "constexpr"}
    return matmul_tma, sig, {"BM": 128, "BN": 128, "BK": 64, "WS": ws}, {(i,): D16 for i in range(6)}


def run(tool, *args):
    p = subprocess.run([tool, *args], capture_output=True, text=True)
    return p.stdout + p.stderr


SASS_OPS = ["UTMASTG", "UTMALDG", "HMMA", "HGMMA", "UTCHMMA", "UTCQMMA", "LDGSTS", "UTMALDG", "LDG.E.128", "LDG.E.64", "LDG.E", "STG.E.128",
            "STG.E", "LDS", "LDSM", "STS", "SHFL.BFLY", "BAR.SYNC", "SYNCS", "MUFU.EX2", "WARPGROUP", "LDTM", "STTM"]
PTX_OPS = {"ld.global.v4": r"ld\.global(\.[a-z]+)*\.v4", "ld.global (scalar)": r"ld\.global(\.(?!v[24])[a-z0-9]+)*\.b32 ",
           "cp.async": r"cp\.async\.(ca|cg)", "cp.async.bulk.tensor": r"cp\.async\.bulk\.tensor",
           "mma.sync": r"mma\.sync", "wgmma.mma_async": r"wgmma\.mma_async", "tcgen05.mma": r"tcgen05\.mma",
           "shfl.sync": r"shfl\.sync", "bar.sync": r"bar\.sync", "ex2.approx": r"ex2\.approx", "mbarrier": r"mbarrier\."}
AMD_OPS = {"v_mfma": r"v_mfma_", "global_load_dwordx4": r"global_load_dwordx4", "buffer_load_dwordx4": r"buffer_load_dwordx4",
           "global_load (any)": r"global_load_", "buffer_load (any)": r"buffer_load_", "ds_read": r"ds_read", "ds_write": r"ds_write",
           "s_barrier": r"s_barrier", "v_exp_f32": r"v_exp_f32", "ds_swizzle/dpp": r"ds_swizzle|row_shr|quad_perm|ds_bpermute"}


def sass_counts(txt):
    c = {}
    for line in txt.splitlines():
        m = re.search(r"/\*[0-9a-f]{4,}\*/\s+(@!?U?P\w+\s+)?([A-Z][A-Z0-9_.]+)", line)
        if not m:
            continue
        op = m.group(2)
        for k in SASS_OPS:
            if op == k or op.startswith(k + "."):
                if k == "LDG.E" and (op.startswith("LDG.E.128") or op.startswith("LDG.E.64")):
                    continue
                if k == "STG.E" and op.startswith("STG.E.128"):
                    continue
                c[k] = c.get(k, 0) + 1
                break
    return c


def compile_one(key, job, tgt, nw, ns=None, save=True):
    fn, sig, cx, attrs = job
    opts = {"num_warps": nw}
    if ns is not None:
        opts["num_stages"] = ns
    rec = {"key": key, "target": tgt, "num_warps": nw, "num_stages_req": ns, "constexprs": {k: v for k, v in cx.items()}}
    try:
        k = triton.compile(ASTSource(fn=fn, signature=sig, constexprs=cx, attrs=attrs), target=target(tgt), options=opts)
    except Exception as e:
        rec.update(ok=False, error=(type(e).__name__ + ": " + str(e))[-600:])
        return rec
    md = k.metadata
    rec.update(ok=True, shared=md.shared, num_stages=getattr(md, "num_stages", None))
    stem = os.path.join(IR, f"{key}.{tgt}")
    if save:
        for ext in ("ttir", "ttgir", "llir", "ptx", "amdgcn"):
            if ext in k.asm:
                open(f"{stem}.{ext}", "w").write(k.asm[ext])
    if tgt in NV:
        cub = stem + ".cubin"
        open(cub, "wb").write(k.asm["cubin"])
        res = run("cuobjdump", "-res-usage", cub)
        m = re.search(r"REG:(\d+) STACK:(\d+) SHARED:(\d+) LOCAL:(\d+)", res)
        if m:
            rec.update(regs=int(m.group(1)), stack=int(m.group(2)), static_shared=int(m.group(3)), local=int(m.group(4)))
        sass = run("cuobjdump", "-sass", cub)
        rec["sass"] = sass_counts(sass)
        rec["sass_lines"] = sum(1 for l in sass.splitlines() if re.search(r"/\*[0-9a-f]{4,}\*/\s+\S", l))
        ptx = k.asm["ptx"]
        rec["ptx"] = {n: len(re.findall(p, ptx)) for n, p in PTX_OPS.items()}
        rec["ptx_lines"] = ptx.count("\n")
        if save:
            open(stem + ".sass", "w").write(sass)
        else:
            os.remove(cub)
    else:
        asm = k.asm["amdgcn"]
        rec["amd"] = {n: len(re.findall(p, asm)) for n, p in AMD_OPS.items()}
        for f, pat in (("vgpr", r"\.vgpr_count:\s+(\d+)"), ("sgpr", r"\.sgpr_count:\s+(\d+)"),
                       ("lds", r"\.group_segment_fixed_size:\s+(\d+)"), ("scratch", r"\.private_segment_fixed_size:\s+(\d+)"),
                       ("agpr", r"\.agpr_count:\s+(\d+)")):
            m = re.search(pat, asm)
            if m:
                rec[f] = int(m.group(1))
    for ext in ("ttir", "ttgir", "llir"):
        if ext in k.asm:
            rec[ext + "_lines"] = k.asm[ext].count("\n")
    return rec


def main_jobs():
    out = []
    for t in list(NV) + list(AMD):
        out.append(compile_one("vadd", job_vadd(), t, 4))
        out.append(compile_one("softmax", job_softmax(), t, 4))
        out.append(compile_one("matmul", job_matmul(128, 128, 32), t, 4, 4))
        out.append(compile_one("attn", job_attn(), t, 4, 2 if t in AMD else 3))
    for t in NV:
        out.append(compile_one("vadd_nohints", job_vadd(hints=False), t, 4))
        out.append(compile_one("vadd_n1000", job_vadd(n_hint=False), t, 4))  # aligned pointers, n = 1,000 (not a multiple of 16)
    for t in ("sm_90a", "sm_100a"):
        out.append(compile_one("mm_tma", job_tma(False), t, 4, 3))
    out.append(compile_one("mm_tma_ws", job_tma(True), "sm_100a", 4, 3))
    return out


TUT_CFGS = [(128, 256, 64, 3, 8), (64, 256, 32, 4, 4), (128, 128, 32, 4, 4), (128, 64, 32, 4, 4), (64, 128, 32, 4, 4),
            (128, 32, 32, 4, 4), (64, 32, 32, 5, 2), (32, 64, 32, 5, 2), (128, 256, 128, 3, 8), (256, 128, 128, 3, 8),
            (256, 64, 128, 4, 4), (64, 256, 128, 4, 4), (128, 128, 128, 4, 4), (128, 64, 64, 4, 4), (64, 128, 64, 4, 4),
            (128, 32, 64, 4, 4)]


def sweep_jobs():
    out = []
    for t in NV:
        for (bm, bn, bk, ns, nw) in TUT_CFGS:
            out.append(compile_one(f"mm_{bm}x{bn}x{bk}_s{ns}_w{nw}", job_matmul(bm, bn, bk), t, nw, ns, save=False))
        for ns in (1, 2, 3, 4, 5, 6):
            out.append(compile_one(f"mmstages_s{ns}", job_matmul(128, 128, 64), t, 4, ns, save=False))
        for nw in (1, 2, 4, 8, 16):
            out.append(compile_one(f"mmwarps_w{nw}", job_matmul(128, 128, 64), t, nw, 3, save=False))
    for t in ("sm_90a",):
        for blk in (1024, 2048, 4096, 8192, 16384, 32768, 65536):
            for nw in (1, 4, 8, 16):
                out.append(compile_one(f"smx_{blk}_w{nw}", job_softmax(blk), t, nw, save=False))
    return out


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    path = os.path.join(OUT, "compile.json")
    data = json.load(open(path)) if os.path.exists(path) else {}
    data["triton"] = triton.__version__
    if what in ("main", "all"):
        data["main"] = main_jobs()
    if what in ("sweep", "all"):
        data["sweep"] = sweep_jobs()
    json.dump(data, open(path, "w"), indent=1)
    for part in ("main", "sweep"):
        for r in data.get(part, []):
            print(part, r["key"], r["target"], "ok" if r["ok"] else "FAIL " + r["error"][:120],
                  r.get("regs", r.get("vgpr")), r.get("shared"), r.get("local", r.get("scratch")))
