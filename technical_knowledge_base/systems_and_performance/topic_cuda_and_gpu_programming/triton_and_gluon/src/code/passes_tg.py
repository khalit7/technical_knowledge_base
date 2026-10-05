"""Every compiler pass Triton runs, in order, with the IR before each one (MLIR_ENABLE_DUMP=1).
For the tutorial-style fp16 matmul (128x128x32 tiles, 4 warps, 4 stages) on sm_80 and sm_90a, and the vector add
on sm_90a. Records each pass's name, the stage it belongs to, the IR size before and after, and whether the IR
changed; keeps the IR (comments and debug locations stripped) at a few points for the page.
Usage: python passes_tg.py -> ../out/passes.json
"""
import os, re, sys, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
CHILD = r'''
import sys
sys.path.insert(0, %r)
import triton
from triton.compiler import ASTSource
from triton.backends.compiler import GPUTarget
import compile_tg as c
job = {"matmul": c.job_matmul(128, 128, 32), "vadd": c.job_vadd()}[sys.argv[1]]
fn, sig, cx, attrs = job
opts = {"num_warps": 4}
if sys.argv[1] == "matmul":
    opts["num_stages"] = 4
triton.compile(ASTSource(fn=fn, signature=sig, constexprs=cx, attrs=attrs), target=GPUTarget("cuda", int(sys.argv[2]), 32), options=opts)
''' % HERE


def clean(ir):
    keep = []
    for l in ir.splitlines():
        if l.startswith("#loc") or not l.strip():
            continue
        l = re.sub(r"\s*loc\((#loc\d*|\"[^\"]*\"\(#loc\d*\)|unknown|callsite\([^)]*\))\)", "", l)
        l = re.sub(r" loc\(#loc\d*\)", "", l)
        keep.append(l)
    return "\n".join(keep)


res = {}
for kern, cc in (("matmul", 90), ("matmul", 80), ("vadd", 90)):
    env = dict(os.environ, MLIR_ENABLE_DUMP="1", TRITON_ALWAYS_COMPILE="1")
    p = subprocess.run([sys.executable, "-c", CHILD, kern, str(cc)], capture_output=True, text=True, env=env)
    txt = p.stderr + p.stdout
    parts = re.split(r"// -----// IR Dump Before ([A-Za-z0-9_]+)(?:: ([\w.-]+))?[^\n]*//----- //\n", txt)
    passes = []
    for i in range(1, len(parts) - 2, 3):
        name, arg, body = parts[i], parts[i + 1], parts[i + 2]
        passes.append({"pass": name, "arg": arg or "", "ir": clean(body)})
    rows = []
    for j, ps in enumerate(passes):
        after = passes[j + 1]["ir"] if j + 1 < len(passes) else None
        rows.append({"i": j, "pass": ps["pass"], "arg": ps["arg"], "lines_before": ps["ir"].count("\n") + 1,
                     "changed": None if after is None else (after != ps["ir"])})
    key = f"{kern}.sm_{cc}{'a' if cc == 90 else ''}"
    snaps = {}
    for want in ("tritongpu-coalesce", "tritongpu-accelerate-matmul", "tritongpu-pipeline", "tritongpu-schedule-loops",
                 "convert-triton-to-tritongpu", "tritongpu-remove-layout-conversions", "convert-triton-gpu-to-llvm",
                 "tritongpu-assign-latencies", "tritongpu-optimize-dot-operands", "tritongpu-reduce-data-duplication"):
        for j, r in enumerate(rows):
            if r["arg"] == want:
                snaps["before " + want] = passes[j]["ir"]
                if j + 1 < len(passes):
                    snaps["after " + want] = passes[j + 1]["ir"]
                break
    keep = {"vadd.sm_90a": ["before convert-triton-to-tritongpu", "after convert-triton-to-tritongpu", "after tritongpu-coalesce",
                            "after tritongpu-remove-layout-conversions"],
            "matmul.sm_90a": ["before tritongpu-accelerate-matmul", "after tritongpu-accelerate-matmul", "before tritongpu-pipeline",
                              "after tritongpu-pipeline"]}.get(key, [])
    snaps = {k: v for k, v in snaps.items() if k in keep}   # the page uses these; the rest is regenerated on demand
    res[key] = {"n_passes": len(rows), "passes": rows, "snapshots": snaps, "returncode": p.returncode,
                "tail": txt[-400:] if p.returncode else ""}
    print(key, len(rows), "passes", sum(1 for r in rows if r["changed"]), "changed", p.returncode)
json.dump(res, open(os.path.join(OUT, "passes.json"), "w"), indent=1)
