"""The matmul ladder of the Reading tab's hero: one row per rung, with the memory traffic each rung asks for.

Run from src/: python3 ladder.py   ->  out/ladder.json and parts/22_js_ladder.js (window.WKL)

Inputs (all already in the repo):
  cuda/kernels/m_ladder.cu      tile sizes of each rung (constants copied below, checked against the source text)
  cuda/out/stats.json           registers, FFMA and shared-load counts as compiled for sm_90a (sass_stats.py)
  out/data.json                 Boehm's published table (pub.boehm)
  inputs/root_kernel_lab_matmul.json   the topic root's Kernel lab matmul and softmax ladders on the M1 Pro (copied from
                                the root's src/lab/out/data.json, refreshed here when that file is present)

Traffic is DERIVED from the code as written, per fused multiply-add (FMA), float32, n a multiple of 128,
before any cache: what the kernel asks each level of memory for.
  global bytes asked   = bytes of A and B loaded from global memory per FMA
  global bytes moved   = the same, counted in 32-byte sectors per warp load instruction (coalescing):
                         k1: lanes read 32 different rows of A (32 sectors) and one broadcast B value (1 sector)
                             = 33 sectors x 32 B / 32 lanes = 33 B per FMA
                         k2: one broadcast A value (1 sector) and 32 neighbouring B values (4 sectors) = 5 B per FMA
                         k3 on: every load is coalesced, moved = asked
  shared bytes         = bytes read from shared memory per FMA in the inner loop
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_LAB = os.path.join(HERE, "../../src/lab/out/data.json")
COPY = os.path.join(HERE, "inputs/root_kernel_lab_matmul.json")

src = open(os.path.join(HERE, "cuda/kernels/m_ladder.cu")).read()
for pat in ("BM = 64, BN = 64, BK = 8, TM = 8;", "BM = 128, BN = 128, BK = 8, TM = 8, TN = 8;", "__shared__ float As[32][32]"):
    assert pat in src, pat  # the constants below are the source's

stats = json.load(open(os.path.join(HERE, "cuda/out/stats.json")))["stats"]
pub = json.load(open(os.path.join(HERE, "out/data.json")))["pub"]["boehm"]
boehm = {r[0]: {"gflops": r[2], "pct": r[3], "name": r[1]} for r in pub["rows"]}

if os.path.exists(ROOT_LAB):
    lab = json.load(open(ROOT_LAB))
    keep = [{k: c.get(k) for k in ("group", "step", "name", "n", "flops", "R", "C", "passes_r", "passes_w", "ms", "ms_min", "ms_max")}
            for c in lab["cases"] if c["group"] in ("matmul", "softmax")]
    json.dump({"source": "topic_cuda_and_gpu_programming/src/lab/out/data.json (the root's Kernel lab), copied by ladder.py",
               "meta": {k: lab["meta"][k] for k in ("date", "mlx", "device", "runs", "trials")}, "cases": keep},
              open(COPY, "w"), indent=1)
LAB = json.load(open(COPY))
m1 = {c["step"]: c for c in LAB["cases"] if c["group"] == "matmul"}
smx = [c for c in LAB["cases"] if c["group"] == "softmax"]


def fma_tile(bm, bn, bk):  # FMAs per k-step of one block, and global bytes loaded for it
    return bm * bn * bk, (bm * bk + bk * bn) * 4


rungs = []
def add(key, kern, title, asked, moved, shared, shared_ld_per_fma, m1_step, block, thread, warp=None):
    st = stats.get(kern, {}).get("sm_90a") if kern else None
    c = st["counts"] if st else {}
    lds = c.get("LDS", 0) + c.get("LDS.128", 0)
    r = {"key": key, "title": title, "boehm": boehm.get(int(key[1:])) if key[1:].isdigit() else None,
         "asked": asked, "moved": moved, "shared": shared, "shared_ld_per_fma": shared_ld_per_fma,
         "regs": st["regs"] if st else None, "ffma": c.get("FFMA") if st else None, "lds": lds if st else None,
         "ffma_per_lds": round(c["FFMA"] / lds, 1) if st and lds else None,
         "m1": ({"step": m1_step, "name": m1[m1_step]["name"], "ms": m1[m1_step]["ms"],
                 "gflops": m1[m1_step]["flops"] / (m1[m1_step]["ms"] * 1e-3) / 1e9} if m1_step else None),
         "block": block, "thread": thread, "warp": warp}
    rungs.append(r)

# k1, k2: one output per thread, every FMA loads one A and one B value (8 bytes asked)
add("k1", "k1_naive", "Naive", 8, 33, 0, 0, "M1", 0, 1, "col")
add("k2", "k2_coalesced", "Coalesced", 8, 5, 0, 0, "M2", 0, 1, "row")
# k3: 32 x 32 tiles; each loaded value is used 32 times; inner loop reads As and Bs: 2 shared loads (8 B) per FMA
f, b = fma_tile(32, 32, 32); add("k3", "k3_smem", "Shared-memory tiles", b / f, b / f, 8, 2, "M4", 32, 1)
# k4: 64 x 64 block, BK 8, 8 outputs per thread: per k, 1 Bs + 8 As loads feed 8 FMAs
f, b = fma_tile(64, 64, 8); add("k4", "k4_tile1d", "1D thread tile", b / f, b / f, 9 * 4 / 8, 9 / 8, None, 64, 8)
# k5: 128 x 128 block, BK 8, 8 x 8 per thread: per k, 8 + 8 loads feed 64 FMAs
f, b = fma_tile(128, 128, 8); add("k5", "k5_tile2d", "2D thread tile", b / f, b / f, 16 * 4 / 64, 16 / 64, "M5", 128, 8)
# k6: same traffic as k5, but 4 LDS.128 instead of 16 scalar loads per 64 FMAs
add("k6", "k6_vectorized", "Vectorised", b / f, b / f, 1, 4 / 64, "M6", 128, 8)
# beyond: Boehm's kernel 10 (warp tiling, autotuned); tensor cores on the M1 (Kernel lab M7)
add("k10", None, "Warp tile, autotuned", None, None, None, None, "M7", 128, 8)

out = {"rungs": rungs, "cublas": pub["cublas"], "boehm_gpu": pub["gpu"], "boehm_n": pub["n"], "boehm_src": pub["src"],
       "boehm9": boehm[9], "m1_lib": {"ms": m1["L"]["ms"], "gflops": m1["L"]["flops"] / (m1["L"]["ms"] * 1e-3) / 1e9},
       "m1_M3": {"ms": m1["M3"]["ms"]}, "m1_n": m1["M1"]["n"], "m1_meta": LAB["meta"],
       # the softmax ladder of the same lab (section 4): 16,384 rows of 4,096 float32, read and write 256 MiB each
       "softmax": [{"step": c["step"], "name": c["name"], "ms": c["ms"], "lo": c["ms_min"], "hi": c["ms_max"],
                    "passes_r": c["passes_r"], "passes_w": c["passes_w"]} for c in smx]}
json.dump(out, open(os.path.join(HERE, "out/ladder.json"), "w"), indent=1)
open(os.path.join(HERE, "parts/22_js_ladder.js"), "w").write(
    "// Generated by src/ladder.py from out/data.json, cuda/out/stats.json and the root Kernel lab's matmul runs. Do not edit.\n"
    "window.WKL=" + json.dumps(out, separators=(",", ":")) + ";\n")
# the hero's numbers as a static table inside section 1's closed block (readable without script; checked by the ledger)
def f(v, d): return f"{v:,.{d}f}"
rows = []
for j, r in enumerate(rungs):
    g = "n/a" if r["moved"] is None else (f"{r['moved']:g} ({r['asked']:g} asked)" if r["asked"] != r["moved"] else f"{r['moved']:g}")
    sh = "n/a" if r["shared"] is None else f"{r['shared']:g}"
    m = f"{r['m1']['name']}: {f(r['m1']['ms'], 2)} ms" if r["m1"] else "no matching rung"
    rows.append(f"<tr><td>{j + 1} {r['title']}</td><td class=\"num\">{g}</td><td class=\"num\">{sh}</td><td class=\"num\">{f(r['boehm']['gflops'], 1)} ({f(r['boehm']['pct'], 1)}%)</td><td>{m}</td></tr>")
others = ", ".join(f"{c['name']} {f(c['ms'], 2)} ms" for c in LAB["cases"] if c["group"] == "matmul" and c["step"] in ("M3", "M7a", "M7nu", "L"))
tbl = ("<p>The hero's numbers, rung by rung. Bytes per FMA <span class=\"rd-der\">derived</span> (<code>src/ladder.py</code>); A6000 <span class=\"rd-pub\">published</span> (Boehm, kernel 10 for rung 7); "
       f"M1 Pro <span class=\"rd-meas\">measured</span>, the root's Kernel lab, n = {m1['M1']['n']:,}, its nearest rung.</p>"
       "<div class=\"tw\"><table class=\"wk-tbl\"><tr><th>Rung</th><th class=\"num\">global bytes per FMA</th><th class=\"num\">shared bytes per FMA</th><th class=\"num\">A6000 GFLOP/s (% of cuBLAS)</th><th>M1 Pro</th></tr>"
       + "".join(rows) + "</table></div>"
       f"<p class=\"small mute\">The lab's other matmul cases: {others}. Rung 2 moves 6.6 times fewer bytes than rung 1 by this count (33 / 5), against the 6.4 times Boehm measured; from rung 1 to rung 6 global traffic falls {33 / 0.0625:,.0f} times.</p>")
part = os.path.join(HERE, "parts/20_read_a.html"); t = open(part).read()
t = re.sub(r"<!--ladder-table-->.*?<!--/ladder-table-->", lambda _: "<!--ladder-table-->" + tbl + "<!--/ladder-table-->", t, flags=re.S)
open(part, "w").write(t)
for r in rungs:
    print(r["key"], r["asked"], r["moved"], r["shared"], r["regs"], r["ffma_per_lds"], r["boehm"] and r["boehm"]["gflops"], r["m1"] and round(r["m1"]["ms"], 2))
