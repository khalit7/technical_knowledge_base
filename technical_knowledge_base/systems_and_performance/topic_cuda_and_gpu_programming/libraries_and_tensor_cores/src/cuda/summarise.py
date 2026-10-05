"""Turns out/*.ptxas.txt and out/*.sass.txt into out/matrix.json: for every kernel and target,
whether it assembled (or ptxas's exact error), registers and shared memory, the matrix-related SASS
opcodes with counts, and the SASS lines of the key instruction. Temporary file names are removed."""
import json, os, re, glob
H = os.path.dirname(os.path.abspath(__file__))
TARGETS = ["sm_80", "sm_89", "sm_90a", "sm_100a", "sm_100f", "sm_103a", "sm_120", "sm_120a"]
OPS = re.compile(r"\b((?:HMMA|HGMMA|IMMA|IGMMA|QMMA|QGMMA|OMMA|UTC[A-Z0-9]*|UTMA[A-Z]*|LDSM|STSM|USETMAXREG|F2FP|SYNCS|CALL)(?:\.[A-Z0-9_x]+)*)")
KEY = re.compile(r"\b(HMMA|HGMMA|IMMA|QMMA|QGMMA|OMMA|UTC[HQO]MMA|UTMALDG|UTMASTG|LDSM|STSM|USETMAXREG|CALL)")
kernels = sorted({os.path.basename(p).split(".")[0] for p in glob.glob(os.path.join(H, "out", "*.ptxas.txt"))})
res = {"targets": TARGETS, "nvcc": open(os.path.join(H, "out", "nvcc_version.txt")).read().strip().splitlines()[-2], "kernels": {}}
for k in kernels:
    src = open(os.path.join(H, "kernels", k + ".cu")).read()
    comment = " ".join(l[3:].strip() for l in src.splitlines() if l.startswith("// ") and "Compiled here" not in l)
    ptx = os.path.join(H, "out", k + ".ptx")
    key_ptx = []
    if os.path.exists(ptx):
        for l in open(ptx):
            if re.search(r"\b(mma|wgmma|tcgen05|ldmatrix|stmatrix|cp\.async\.bulk|setmaxnreg)\b", l):
                key_ptx.append(re.sub(r"\s+", " ", l.strip())[:180])
    row = {"comment": comment, "ptx": key_ptx[:8], "t": {}}
    for t in TARGETS:
        rep = open(os.path.join(H, "out", "%s.%s.ptxas.txt" % (k, t))).read()
        rep = re.sub(r"/tmp/tmpxft_[0-9a-f_]+-\d+_", "", rep)
        ok = rep.strip().endswith("exit=0")
        e = {"ok": ok}
        m = re.search(r"Used (\d+) registers", rep); e["regs"] = int(m.group(1)) if m else None
        m = re.search(r"(\d+) bytes smem", rep); e["smem"] = int(m.group(1)) if m else None
        errs = [l.strip() for l in rep.splitlines() if "error" in l or "warning" in l or "Advisory" in l]
        e["msg"] = [re.sub(r"^(ptxas )?\S+\.ptx, line \d+; ", "", x)[:240] for x in errs[:3]]
        sp = os.path.join(H, "out", "%s.%s.sass.txt" % (k, t))
        if ok and os.path.exists(sp):
            lines = [re.sub(r"\s*/\*\s*0x[0-9a-f]+\s*\*/\s*$", "", l).rstrip() for l in open(sp) if re.match(r"\s+/\*[0-9a-f]{4,6}\*/", l)]
            ops = {}
            for l in lines:
                for m in OPS.finditer(l):
                    ops[m.group(1)] = ops.get(m.group(1), 0) + 1
            e["ops"] = ops
            e["n_sass"] = len(lines)
            e["key"] = [re.sub(r"\s+", " ", l.strip()) for l in lines if KEY.search(l)][:6]
        row["t"][t] = e
    res["kernels"][k] = row
json.dump(res, open(os.path.join(H, "out", "matrix.json"), "w"), indent=1)
print(len(kernels), "kernels;", sum(v["ok"] for r in res["kernels"].values() for v in r["t"].values()), "assembled of", len(kernels) * len(TARGETS))
