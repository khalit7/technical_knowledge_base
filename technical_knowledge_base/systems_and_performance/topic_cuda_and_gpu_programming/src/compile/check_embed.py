# Confirm the built page embeds exactly the recorded compiler outputs, that the page's occupancy
# JavaScript matches the Python reference (itself checked against NVIDIA's cuda_occupancy.h),
# and that numbers written in the tab's prose agree with the data. Needs node for the JS check.
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "occ"))
import build_data as B
from occ import occupancy
page = open(os.path.join(HERE, "..", "..", "index.html")).read()
m = re.search(r"window\.CMP=(\{.*?\});\n// unpack", page, re.S)
D = json.loads(m.group(1))
fails, n = [], 0
def un(p):
    t, l = p[0].split("\n"), p[1].split(";")
    return [[x, [int(v) for v in (l[i] if i < len(l) else "").split(",") if v]] for i, x in enumerate(t)]
for K in D["kernels"]:
    spec = next(k for k in B.KERNELS if k["id"] == K["id"])
    for a in D["archs"]:
        R = K["arch"][a]
        txt = B.rd(f"{K['id']}.{a}.ptxas.txt")
        ok = "exit=0" in txt
        n += 1
        if ok != R["ok"]:
            fails.append(f"{K['id']} {a}: ok flag")
            continue
        if not ok:
            continue
        res = B.parse_ptxas(txt)[spec["fn"]]
        for k1, k2 in (("regs", "regs"), ("smem", "smem"), ("spillSt", "spillSt"), ("spillLd", "spillLd")):
            n += 1
            if res[k2] != R["res"][k1]:
                fails.append(f"{K['id']} {a} {k1}: page {R['res'][k1]} vs ptxas {res[k2]}")
        if "sass" in R:
            n += 1
            raw = [x[0] for x in B.sass_for(K["id"], a, spec["fn"])]
            pg = [x[0] for x in un(R["sass"])]
            norm = lambda s: re.sub(r"(?<=\S)\s{2,}", " ", s)
            if [norm(x) for x in raw] != pg:
                fails.append(f"{K['id']} {a}: SASS differs")
        if "ptx" in R:
            n += 1
            raw = [re.sub(r"(?<=\S)\s{2,}", " ", x[0]) for x in B.ptx_for(K["id"], a, spec["fn"])[1]]
            if [x[0] for x in un(D["ptxPool"][R["ptx"]])] != raw:
                fails.append(f"{K['id']} {a}: PTX differs")
# spill ladder
for nn in D["spill"]["ns"]:
    for a in D["archs"]:
        r = B.parse_ptxas(B.rd(f"k10_spill.{a}.ptxas.txt"))[f"acc{nn}"]
        p = D["spill"]["data"][str(nn)][a]
        n += 1
        if (r["regs"], r["spillSt"], r["spillLd"]) != (p["regs"], p["spillSt"], p["spillLd"]):
            fails.append(f"spill {nn} {a}")
# Triton registers
for row, name in zip(D["triton"]["rows"], ["vadd", "softmax", "matmul_fp32", "matmul_fp16", "matmul_fp16_nohints"]):
    for a in D["archs"]:
        res = open(os.path.join(B.OUT, "triton", f"{name}.{a}.res.txt")).read()
        n += 1
        if int(re.search(r"REG:(\d+)", res).group(1)) != row["arch"][a]["regs"]:
            fails.append(f"triton {name} {a} regs")
# occupancy: JS vs Python on every case
cases = [l.split() for l in open(os.path.join(HERE, "occ", "cases.txt"))]
js = re.search(r"window\.CMPX\.occ=function.*?\n\};", page, re.S).group(0)
prog = "window={CMP:%s,CMPX:{}};\n%s\nconst C=%s;console.log(JSON.stringify(C.map(c=>window.CMPX.occ(c[0],+c[6],+c[7],+c[8],0,+c[9]).blocks)));" % (
    json.dumps({"archinfo": D["archinfo"]}), js.replace("window.CMPX.occ=", "window.CMPX.occ="), json.dumps(cases))
out = subprocess.run(["node", "-e", prog], capture_output=True, text=True)
jsb = json.loads(out.stdout)
for c, b in zip(cases, jsb):
    n += 1
    if occupancy(c[0], int(c[6]), int(c[7]), int(c[8]), 0, int(c[9]))["blocks"] != b:
        fails.append(f"occ JS {c}")
# prose numbers in the static HTML
tab = open(os.path.join(HERE, "..", "parts", "32_tab_compile.html")).read()
L = D["loops"]
st = B.notes  # noqa
lp = {}
for kid in L:
    K = next(k for k in D["kernels"] if k["id"] == kid)
    S = un(K["arch"]["sm_90a"]["sass"])
    body = [x[0] for x in S[L[kid]["sm_90a"]["r"][0]:L[kid]["sm_90a"]["r"][1] + 1] if not x[0].startswith(".L_x")]
    lp[kid] = (sum(B.notes.width(x) for x in body if B.opof(x) == "LDG"), sum(1 for x in body if B.opof(x) == "FFMA"))
checks = [
    ("tiled bytes per FMA 8/32 = 0.25", lp["k3_matmul_tiled"][0] / lp["k3_matmul_tiled"][1] == 0.25 and "8/32 = 0.25" in tab),
    ("naive 8 bytes per FMA", lp["k2_matmul_naive"][0] / lp["k2_matmul_naive"][1] == 8 and "8 bytes (two 4-byte floats)" in tab),
    ("65,536 registers per SM", all(v["regs"] == 65536 for v in D["archinfo"].values()) and "65,536" in tab),
    ("255 registers max", "at most 255" in tab),
    ("tiled 32 x 32 tile", "32 by 32 tile" in tab),
]
for name, okk in checks:
    n += 1
    if not okk:
        fails.append("prose: " + name)
print(f"{n - len(fails)} / {n} checks pass")
for f in fails[:30]:
    print("FAIL", f)
sys.exit(1 if fails else 0)
