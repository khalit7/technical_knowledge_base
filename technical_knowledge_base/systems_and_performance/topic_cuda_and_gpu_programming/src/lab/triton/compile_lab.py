# Compile the lab's Triton kernels for NVIDIA targets WITHOUT a GPU (triton.compile with an explicit
# GPUTarget, as ../../compile/triton/compile_triton.py does), then read the resources and count the
# instructions that matter in the PTX and SASS. Writes ../out/triton_compile.json (and the PTX/SASS
# text files under ../out/triton/, not embedded in the page).
import os, re, json, subprocess, traceback
import triton
from triton.compiler import ASTSource
from triton.backends.compiler import GPUTarget
from lab_tl import softmax_3pass, softmax_online, softmax_row, matmul, softmax_matmul, flash_attn

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out", "triton")
os.makedirs(OUT, exist_ok=True)
D16 = [["tt.divisibility", 16]]


def attrs_for(order, names):
    return {(order.index(k),): D16 for k in names}


SM = ["x_ptr", "y_ptr", "C", "BLOCK"]
SM_SIG = {"x_ptr": "*fp32", "y_ptr": "*fp32", "C": "i32", "BLOCK": "constexpr"}
MM = ["a_ptr", "b_ptr", "c_ptr", "M", "N", "K", "BM", "BN", "BK"]
SMM = ["s_ptr", "v_ptr", "o_ptr", "N", "D", "BM", "BK"]
FA = ["q_ptr", "k_ptr", "v_ptr", "o_ptr", "N", "scale", "D", "BM", "BK"]
JOBS = {
    "softmax_3pass": (softmax_3pass, SM_SIG, {"BLOCK": 1024}, 4, attrs_for(SM, SM[:3])),
    "softmax_online": (softmax_online, SM_SIG, {"BLOCK": 1024}, 4, attrs_for(SM, SM[:3])),
    "softmax_row": (softmax_row, SM_SIG, {"BLOCK": 4096}, 8, attrs_for(SM, SM[:3])),
    "matmul_fp16": (matmul, dict({"a_ptr": "*fp16", "b_ptr": "*fp16", "c_ptr": "*fp32", "M": "i32", "N": "i32", "K": "i32"},
                                 BM="constexpr", BN="constexpr", BK="constexpr"),
                    {"BM": 128, "BN": 128, "BK": 32}, 4, attrs_for(MM, MM[:6])),
    "softmax_matmul_fp32": (softmax_matmul, {"s_ptr": "*fp32", "v_ptr": "*fp32", "o_ptr": "*fp32", "N": "i32",
                                             "D": "constexpr", "BM": "constexpr", "BK": "constexpr"},
                            {"D": 64, "BM": 64, "BK": 32}, 4, attrs_for(SMM, SMM[:4])),
    "flash_attn_fp16": (flash_attn, {"q_ptr": "*fp16", "k_ptr": "*fp16", "v_ptr": "*fp16", "o_ptr": "*fp16", "N": "i32",
                                     "scale": "fp32", "D": "constexpr", "BM": "constexpr", "BK": "constexpr"},
                        {"D": 64, "BM": 128, "BK": 64}, 4, attrs_for(FA, FA[:5])),
}
ARCHS = {"sm_80": 80, "sm_90a": 90}
PTX_PATTERNS = {"mma.sync": r"\bmma\.sync", "wgmma": r"\bwgmma\.mma_async", "ld.global": r"\bld\.global",
                "st.global": r"\bst\.global", "cp.async": r"\bcp\.async\b", "ld.shared": r"\bld\.shared", "st.shared": r"\bst\.shared",
                "ex2.approx": r"\bex2\.approx", "shfl.sync": r"\bshfl\.sync", "bar.sync": r"\bbar\.sync|\bbarrier\.sync"}
SASS_PATTERNS = {"HMMA": r"\bHMMA\b", "HGMMA": r"\bHGMMA\b", "LDG": r"\bLDG", "STG": r"\bSTG", "LDGSTS": r"\bLDGSTS",
                 "LDS": r"\bLDS\b|\bLDS\.", "LDSM": r"\bLDSM", "STS": r"\bSTS", "MUFU.EX2": r"\bMUFU\.EX2", "SHFL": r"\bSHFL", "BAR": r"\bBAR\b|\bBAR\."}
summary = {"triton": triton.__version__, "results": {}}
for name, (fn, sig, cx, nw, attrs) in JOBS.items():
    for an, cc in ARCHS.items():
        key = f"{name}.{an}"
        r = {"kernel": name, "arch": an, "num_warps": nw, "constexprs": cx}
        try:
            k = triton.compile(ASTSource(fn=fn, signature=sig, constexprs=cx, attrs=attrs), target=GPUTarget("cuda", cc, 32),
                               options={"num_warps": nw})
            ptx = k.asm["ptx"]
            open(os.path.join(OUT, f"{key}.ptx"), "w").write(ptx)
            cub = os.path.join(OUT, f"{key}.cubin"); open(cub, "wb").write(k.asm["cubin"])
            res = subprocess.run(["cuobjdump", "-res-usage", cub], capture_output=True, text=True).stdout
            sass = subprocess.run(["cuobjdump", "-sass", cub], capture_output=True, text=True).stdout
            open(os.path.join(OUT, f"{key}.sass.txt"), "w").write(sass)
            m = re.search(r"REG:(\d+).*?SHARED:(\d+)", res)
            r.update(ok=True, shared_meta=k.metadata.shared, regs=int(m.group(1)) if m else None,
                     shared_static=int(m.group(2)) if m else None,
                     ptx_lines=sum(1 for ln in ptx.splitlines() if ln.strip() and not ln.strip().startswith("//")),
                     sass_instructions=len(re.findall(r"/\*[0-9a-f]{4}\*/", sass)),
                     ptx={k2: len(re.findall(p, ptx)) for k2, p in PTX_PATTERNS.items()},
                     sass={k2: len(re.findall(p, sass)) for k2, p in SASS_PATTERNS.items()})
        except Exception:
            r.update(ok=False, error=traceback.format_exc()[-1200:])
        summary["results"][key] = r
        print(key, r.get("ok"), r.get("regs"), r.get("shared_meta"), r.get("sass"), flush=True)
json.dump(summary, open(os.path.join(HERE, "..", "out", "triton_compile.json"), "w"), indent=1)
