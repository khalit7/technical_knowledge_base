"""Summarises the SASS of CUTLASS's compiled examples (out/*.sass.txt, kept outside the repo after
summarising because they are 0.4 to 3 MB each) into out/cutlass_sass.json: per kernel function,
registers and shared memory (ptxas -v), instruction count and the counts of the opcodes that show
the kernel's structure (tensor-core MMA, TMA, barriers, register hand-off, epilogue stores)."""
import json, os, re, glob, sys
H = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(H, "out")
OPS = ["HMMA", "HGMMA", "QGMMA", "OMMA", "QMMA", "UTCHMMA", "UTCQMMA", "UTCOMMA", "UTCBAR", "UTMALDG", "UTMASTG", "UTMAPF",
       "UBLKCP", "LDGSTS", "LDSM", "STSM", "SYNCS", "USETMAXREG", "BAR", "LDTM", "STTM", "WARPGROUP", "FFMA", "LDG", "STG", "LDS", "STS"]
pat = re.compile(r"\b(" + "|".join(OPS) + r")\b")
out = {}
for f in sorted(glob.glob(os.path.join(SRC, "*.sass.txt"))):
    name = os.path.basename(f)[:-9]
    rep = open(os.path.join(H, "out", name + ".ptxas.txt")).read()
    res = {}
    for blk in rep.split("Compiling entry function ")[1:]:
        m = re.match(r"'([^']+)' for '(\w+)'", blk)
        r = re.search(r"Used (\d+) registers", blk); sm = re.search(r"(\d+) bytes smem", blk)
        res[m.group(1)] = {"arch": m.group(2), "regs": int(r.group(1)) if r else None, "smem": int(sm.group(1)) if sm else 0}
    secs = re.search(r"seconds=(\d+)", rep)
    funcs, cur = {}, None
    for line in open(f):
        m = re.match(r"\s+Function : (\S+)", line)
        if m:
            cur = m.group(1); funcs[cur] = {"n": 0, "ops": {}}; continue
        if cur and re.match(r"\s+/\*[0-9a-f]{4,6}\*/", line):
            funcs[cur]["n"] += 1
            ins = line.split("*/", 1)[1].split(";")[0].strip()
            ins = re.sub(r"^@!?U?P\w+\s+", "", ins)
            m = pat.match(ins)
            if m:
                op = m.group(1); funcs[cur]["ops"][op] = funcs[cur]["ops"].get(op, 0) + 1
    ks = []
    for fn, v in funcs.items():
        r = res.get(fn, {})
        ks.append({"fn": fn[:160], "fn_len": len(fn), "n": v["n"], "ops": v["ops"], **r})
    mm = ("HMMA", "HGMMA", "QGMMA", "OMMA", "QMMA", "UTCHMMA", "UTCQMMA", "UTCOMMA")
    ks.sort(key=lambda k: (-sum(k["ops"].get(o, 0) for o in mm), -k["n"]))
    out[name] = {"seconds": int(secs.group(1)) if secs else None, "kernels": ks[:2], "n_kernels": len(ks)}
json.dump(out, open(os.path.join(H, "out", "cutlass_sass.json"), "w"), indent=1)
for k, v in out.items():
    top = v["kernels"][0]
    print(k, v["seconds"], "s,", v["n_kernels"], "kernels; biggest:", top["n"], "instr", top.get("regs"), "regs", top.get("smem"), "smem", {a: b for a, b in top["ops"].items() if a not in ("LDG", "STG", "LDS", "STS", "FFMA")})
