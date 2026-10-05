"""Gluon without a GPU (Triton 3.8.0, kb-gpu-lab:1).
1. The memcpy kernel of Gluon tutorial 02 (python/tutorials/gluon/02-layouts.py, v3.8.0), compiled for sm_100a
   (GB200, the tutorial's GPU) and sm_90a with BlockedLayout([R], [32], [4], [0]) for R = 1..16, XBLOCK 2048:
   counts the global load and store instructions in the SASS, to compare with the tutorial's table.
2. Triton's own element-to-(register, lane, warp) mapping for several layouts, printed with
   gl.to_linear_layout at compile time; the page's layout explorer is checked against it (check/check_layout.mjs).
3. The same vector add written in Triton and in Gluon: the TTGIR each produces.
Usage: python gluon_tg.py  -> ../out/gluon.json, ../out/ir/gluon_*.ttgir
"""
import os, re, io, json, contextlib, subprocess, traceback
import triton
from triton.backends.compiler import GPUTarget
from triton.experimental import gluon
from triton.experimental.gluon import language as gl
from triton.experimental.gluon._runtime import GluonASTSource

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
os.makedirs(os.path.join(OUT, "ir"), exist_ok=True)
D16 = [["tt.divisibility", 16]]


@gluon.jit
def memcpy_1d_kernel(in_ptr, out_ptr, xnumel, XBLOCK: gl.constexpr, layout: gl.constexpr):
    pid = gl.program_id(0)
    start = pid * XBLOCK
    indices = gl.arange(0, XBLOCK, layout=layout)   # Gluon: the layout is part of the type
    offsets = start + indices
    mask = offsets < xnumel
    value = gl.load(in_ptr + offsets, mask=mask)
    gl.store(out_ptr + offsets, value, mask=mask)


@gluon.jit
def show_layout(layout: gl.constexpr, M: gl.constexpr, N: gl.constexpr):
    gl.static_print(gl.to_linear_layout(layout, [M, N]))


@gluon.jit
def gvadd(a_ptr, b_ptr, c_ptr, n, BLOCK: gl.constexpr):
    layout: gl.constexpr = gl.BlockedLayout([4], [32], [gl.num_warps()], [0])
    pid = gl.program_id(0)
    offs = pid * BLOCK + gl.arange(0, BLOCK, layout=layout)
    mask = offs < n
    a = gl.load(a_ptr + offs, mask=mask)
    b = gl.load(b_ptr + offs, mask=mask)
    gl.store(c_ptr + offs, a + b, mask=mask)


def tgt(cc):
    return GPUTarget("cuda", cc, 32)


def ldst(sass):
    ops = []
    for line in sass.splitlines():
        m = re.search(r"/\*[0-9a-f]{4,}\*/\s+(@!?P\w+\s+)?((LDG|STG)\.E[A-Z0-9.]*)\s+([^;]*);", line)
        if m:
            ops.append({"op": m.group(2), "args": m.group(4).strip()})
    return ops


res = {"triton": triton.__version__, "memcpy": [], "layouts": [], "vadd": {}}
# 1. layouts R = 1..16
sig = {"in_ptr": "*fp32", "out_ptr": "*fp32", "xnumel": "i32", "XBLOCK": "constexpr", "layout": "constexpr"}
for cc, name in ((100, "sm_100a"), (90, "sm_90a")):
    for i in range(5):
        R = 2 ** i
        L = gl.BlockedLayout([R], [32], [4], [0])
        try:
            k = triton.compile(GluonASTSource(memcpy_1d_kernel, sig, {"XBLOCK": 2048, "layout": L},
                                              {(0,): D16, (1,): D16, (2,): D16}), target=tgt(cc), options={"num_warps": 4})
            cub = os.path.join(OUT, "ir", f"_tmp_{name}_{R}.cubin")
            open(cub, "wb").write(k.asm["cubin"])
            sass = subprocess.run(["cuobjdump", "-sass", cub], capture_output=True, text=True).stdout
            os.remove(cub)
            ops = ldst(sass)
            res["memcpy"].append({"target": name, "R": R, "ok": True, "ldst": ops,
                                  "ttgir_layout": re.search(r"#blocked = (#ttg\.blocked<[^>]*>)", k.asm["ttgir"]).group(1)})
        except Exception:
            res["memcpy"].append({"target": name, "R": R, "ok": False, "error": traceback.format_exc()[-800:]})

# 2. Triton's own linear-layout description of several blocked layouts
CASES = [([2, 4], [16, 2], [2, 2], [1, 0], 64, 16), ([2, 4], [16, 2], [2, 2], [0, 1], 64, 16),
         ([2, 4], [16, 2], [2, 2], [1, 0], 128, 128), ([2, 4], [16, 2], [2, 2], [1, 0], 32, 8),
         ([1, 8], [2, 16], [4, 1], [1, 0], 128, 32), ([1, 8], [8, 4], [4, 1], [1, 0], 32, 128),
         ([1, 1], [1, 32], [4, 1], [1, 0], 16, 64), ([4, 1], [8, 4], [1, 4], [0, 1], 32, 32)]
for spt, tpw, wpc, order, M, N in CASES:
    L = gl.BlockedLayout(spt, tpw, wpc, order)
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            triton.compile(GluonASTSource(show_layout, {"layout": "constexpr", "M": "constexpr", "N": "constexpr"},
                                          {"layout": L, "M": M, "N": N}, {}), target=tgt(90),
                           options={"num_warps": wpc[0] * wpc[1]})
        res["layouts"].append({"spt": spt, "tpw": tpw, "wpc": wpc, "order": order, "shape": [M, N], "printed": buf.getvalue().strip()})
    except Exception:
        res["layouts"].append({"spt": spt, "tpw": tpw, "wpc": wpc, "order": order, "shape": [M, N],
                               "error": traceback.format_exc()[-800:], "printed": buf.getvalue()})

# 3. Gluon vector add for sm_90a: its TTGIR next to Triton's
gsig = {"a_ptr": "*fp32", "b_ptr": "*fp32", "c_ptr": "*fp32", "n": "i32", "BLOCK": "constexpr"}
try:
    k = triton.compile(GluonASTSource(gvadd, gsig, {"BLOCK": 1024}, {(i,): D16 for i in range(4)}), target=tgt(90),
                       options={"num_warps": 4})
    open(os.path.join(OUT, "ir", "gluon_vadd.sm_90a.ttgir"), "w").write(k.asm["ttgir"])
    open(os.path.join(OUT, "ir", "gluon_vadd.sm_90a.source"), "w").write(k.asm.get("source", ""))
    res["vadd"] = {"ok": True, "stages": list(k.asm.keys()), "shared": k.metadata.shared}
except Exception:
    res["vadd"] = {"ok": False, "error": traceback.format_exc()[-800:]}
json.dump(res, open(os.path.join(OUT, "gluon.json"), "w"), indent=1)
for r in res["memcpy"]:
    print(r["target"], r["R"], r.get("ttgir_layout"), [o["op"] for o in r.get("ldst", [])] if r["ok"] else r["error"][-300:])
for r in res["layouts"]:
    print(r["spt"], r["tpw"], r["wpc"], r["order"], r["shape"], r["printed"][:300], r.get("error", "")[-300:])
print(res["vadd"])
