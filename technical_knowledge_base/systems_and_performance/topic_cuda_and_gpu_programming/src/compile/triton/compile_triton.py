# Compile the Triton kernels for NVIDIA targets WITHOUT a GPU: triton.compile with an
# explicit GPUTarget runs the whole pipeline (Triton IR -> TritonGPU IR -> LLVM IR -> PTX -> cubin).
# Outputs go to ../out/triton/.
import os, json, shutil, subprocess, traceback
# ptxas: Triton uses the copies bundled in its wheel (versions in out/versions.json)
import triton
from triton.compiler import ASTSource
from triton.backends.compiler import GPUTarget
from kernels_tl import vadd, matmul, softmax

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "triton")
os.makedirs(OUT, exist_ok=True)
P32, P16 = "*fp32", "*fp16"
# Specialise exactly as a normal launch on contiguous tensors whose sizes are multiples of 16 would:
# Triton turns integer arguments equal to 1 into constants and marks pointers and integers divisible
# by 16 with tt.divisibility=16 (triton/runtime/jit.py, backends/compiler.py parse_attr).
D16 = [["tt.divisibility", 16]]
MM_INTS = ["M", "N", "K", "sam", "sbk", "scm"]
def mm_job(pt, bm, bn, bk):
    sig = {"a_ptr": pt, "b_ptr": pt, "c_ptr": P32}
    sig.update({k: "i32" for k in MM_INTS})
    sig.update({"sak": "constexpr", "sbn": "constexpr", "scn": "constexpr", "BM": "constexpr", "BN": "constexpr", "BK": "constexpr"})
    order = ["a_ptr", "b_ptr", "c_ptr", "M", "N", "K", "sam", "sak", "sbk", "sbn", "scm", "scn", "BM", "BN", "BK"]
    attrs = {(order.index(k),): D16 for k in ["a_ptr", "b_ptr", "c_ptr"] + MM_INTS}
    return (matmul, sig, {"sak": 1, "sbn": 1, "scn": 1, "BM": bm, "BN": bn, "BK": bk}, 4, attrs)
JOBS = {
    "vadd": (vadd, {"a_ptr": P32, "b_ptr": P32, "c_ptr": P32, "n": "i32", "BLOCK": "constexpr"},
             {"BLOCK": 1024}, 4, {(0,): D16, (1,): D16, (2,): D16, (3,): D16}),
    "matmul_fp16": mm_job(P16, 128, 128, 32),
    "matmul_fp32": mm_job(P32, 64, 64, 32),
    # the same fp16 matmul compiled WITHOUT the launch specialisation (strides unknown, no divisibility hints)
    "matmul_fp16_nohints": (matmul, dict({"a_ptr": P16, "b_ptr": P16, "c_ptr": P32},
                            **{k: "i32" for k in ["M", "N", "K", "sam", "sak", "sbk", "sbn", "scm", "scn"]},
                            BM="constexpr", BN="constexpr", BK="constexpr"),
                            {"BM": 128, "BN": 128, "BK": 32}, 4, {}),
    "softmax": (softmax, {"x_ptr": P32, "y_ptr": P32, "ncols": "i32", "stride": "i32", "BLOCK": "constexpr"},
                {"BLOCK": 1024}, 4, {(0,): D16, (1,): D16, (2,): D16, (3,): D16}),
}
ARCHS = {"sm_80": 80, "sm_90a": 90, "sm_100a": 100, "sm_120": 120}
summary = {"triton": triton.__version__, "results": {}}
for name, (fn, sig, cx, nw, attrs) in JOBS.items():
    for an, cc in ARCHS.items():
        key = f"{name}.{an}"
        try:
            src = ASTSource(fn=fn, signature=sig, constexprs=cx, attrs=attrs)
            k = triton.compile(src, target=GPUTarget("cuda", cc, 32), options={"num_warps": nw})
            for ext in ("ttir", "ttgir", "llir", "ptx"):
                if ext in k.asm:
                    open(os.path.join(OUT, f"{key}.{ext}"), "w").write(k.asm[ext])
            open(os.path.join(OUT, f"{key}.cubin"), "wb").write(k.asm["cubin"])
            md = k.metadata
            summary["results"][key] = {"ok": True, "num_warps": md.num_warps, "shared": md.shared,
                                       "num_stages": getattr(md, "num_stages", None),
                                       "target": str(md.target)}
        except Exception as e:
            summary["results"][key] = {"ok": False, "error": traceback.format_exc()[-1500:]}
json.dump(summary, open(os.path.join(OUT, "summary.json"), "w"), indent=1)
# resource usage and SASS from the toolkit, as for the CUDA kernels
for key, r in summary["results"].items():
    if not r["ok"]:
        continue
    cub = os.path.join(OUT, f"{key}.cubin")
    for tool, args, ext in (("cuobjdump", ["-res-usage", cub], "res"), ("cuobjdump", ["-sass", cub], "sass"),
                            ("nvdisasm", ["-gi", "-c", cub], "sassline")):
        p = subprocess.run([tool] + args, capture_output=True, text=True)
        open(os.path.join(OUT, f"{key}.{ext}.txt"), "w").write(p.stdout + p.stderr)
print(json.dumps({k: v["ok"] for k, v in summary["results"].items()}))
