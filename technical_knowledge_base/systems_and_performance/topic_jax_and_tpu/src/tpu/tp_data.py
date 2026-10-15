"""Build ../parts/35_js_tp_0data.js (window.TPD) from out/*.json and the kernel source in tp_kernels.py. Plain Python.

    python3 -I -B tp_data.py
The page embeds exactly this file; check_tab.py rebuilds it and compares.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(os.path.dirname(HERE), "parts")


def load(n):
    with open(os.path.join(HERE, "out", n)) as f:
        return json.load(f)


specs, roof, pal, tor, srcl = load("specs.json"), load("roofline.json"), load("pallas.json"), load("torus.json"), load("source.json")

# kernel code exactly as it ran: cut whole top-level functions out of tp_kernels.py
src = open(os.path.join(HERE, "tp_kernels.py")).read()


def fn(name):
    m = re.search(r"^def " + name + r"\(.*?(?=^\S)", src, re.S | re.M)
    return m.group(0).rstrip() + "\n"


code = dict(matmul=fn("matmul_kernel") + "\n\n" + fn("matmul"), flash=fn("flash_kernel") + "\n\n" + fn("flash_attention"),
            nozero=fn("matmul_kernel_nozero"))

D = dict(
    gens=specs["gens"], notes=specs["notes"], free=specs["free"], sources=specs["sources"],
    roof=dict(cfg=roof["cfg"], ops=roof["ops"], n_dots_fwd=roof["n_dots_fwd"], n_dots_step=roof["n_dots_step"],
              dot_flops=roof["dot_flops_step"], dot_bytes=roof["dot_bytes_bf16_step"], ca=roof["cost_analysis"],
              per_gen=roof["per_gen"], l7=roof["l7"], seven=roof["seven"]),
    pal=dict(matmul=pal["matmul"], flash=pal["flash"], timing=pal["timing"], hlo=pal["interp_hlo"],
             walk=pal["walk_default"]["points"], walk2=pal["walk_2core"]["points"], walk2_err=pal["walk_2core"]["err"],
             bugs=pal["bugs"], mosaic=pal["mosaic"], mosaic_flash=pal["mosaic_flash"], bad_block=pal["bad_block"],
             traffic=pal["traffic"], traffic7b=pal["traffic7b"], shapes=pal["shapes"]),
    torus=tor, code=code, src=srcl)
txt = "// ---- TPU and Pallas lab (t-tpu): data built by src/tpu/tp_data.py from src/tpu/out/*.json; do not edit ----\n" \
      "window.TPD=" + json.dumps(D, separators=(",", ":"), ensure_ascii=False) + ";\n"
with open(os.path.join(PARTS, "35_js_tp_0data.js"), "w") as f:
    f.write(txt)
print("wrote 35_js_tp_0data.js", len(txt), "bytes")
