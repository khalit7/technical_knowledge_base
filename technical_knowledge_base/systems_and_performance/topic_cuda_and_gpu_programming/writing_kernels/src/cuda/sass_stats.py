"""Read the compiler's own output (ptxas -v reports and cuobjdump SASS) for every kernel and target, and write
out/stats.json: registers, shared memory, spills, and static instruction counts by opcode family, plus short
verbatim SASS excerpts shown on the page. Static count = how many times an instruction appears in the binary,
not how many times it executes. Run from anywhere: python3 cuda/sass_stats.py"""
import json, os, re, glob
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
FAM = {  # opcode prefix -> family shown on the page
    "FFMA": "FFMA", "FADD": "FADD", "FMUL": "FMUL", "LDS": "LDS", "STS": "STS", "LDG": "LDG", "STG": "STG",
    "BAR": "BAR", "SHFL": "SHFL", "I2F": "I2F", "LOP3": "LOP3", "SHF": "SHF", "HADD2": "HADD2", "F2F": "F2F",
    "HFMA2": "HFMA2", "REDUX": "REDUX", "ATOM": "ATOM", "RED": "RED", "LDGSTS": "LDGSTS", "PRMT": "PRMT", "I2FP": "I2F",
}


def parse_ptxas(path):
    res, cur = {}, None
    for line in open(path):
        m = re.search(r"Compiling entry function '(\w+)'", line) or re.search(r"Function properties for (\w+)", line)
        if m:
            cur = m.group(1); res.setdefault(cur, {})
        m = re.search(r"(\d+) bytes stack frame, (\d+) bytes spill stores, (\d+) bytes spill loads", line)
        if m and cur:
            res[cur].update(stack=int(m.group(1)), spill_st=int(m.group(2)), spill_ld=int(m.group(3)))
        m = re.search(r"Used (\d+) registers", line)
        if m and cur:
            res[cur]["regs"] = int(m.group(1))
            s = re.search(r"(\d+) bytes smem", line)
            res[cur]["smem"] = int(s.group(1)) if s else 0
    return res


def parse_sass(path):
    funcs, cur = {}, None
    for line in open(path):
        m = re.search(r"Function : (\w+)", line)
        if m:
            cur = m.group(1); funcs[cur] = []
            continue
        m = re.match(r"\s*/\*([0-9a-f]{4,})\*/\s+(.*?);", line)
        if m and cur:
            ins = m.group(2).strip()
            funcs[cur].append(ins)
    return funcs


def opcode(ins):
    t = ins.split()
    if t and t[0].startswith("@"):
        t = t[1:]
    return t[0] if t else ""


stats = {}
for p in sorted(glob.glob(os.path.join(OUT, "*.ptxas.txt"))):
    base = os.path.basename(p)[:-len(".ptxas.txt")]
    fname, arch = base.rsplit(".", 1)
    info = parse_ptxas(p)
    sp = os.path.join(OUT, base + ".sass.txt")
    sass = parse_sass(sp) if os.path.exists(sp) else {}
    for fn, ins in sass.items():
        ops = [opcode(i) for i in ins]
        c = Counter()
        for o in ops:
            root = o.split(".")[0]
            if root in FAM:
                c[FAM[root]] += 1
            if o.startswith("LDS.128") or o.startswith("LDS.U.128"):
                c["LDS.128"] += 1
            if o.startswith("LDG") and ".128" in o:
                c["LDG.128"] += 1
        n = sum(1 for o in ops if o not in ("NOP", "BRA", "EXIT") )
        d = {"file": fname, "arch": arch, "instructions": n, "counts": dict(c), **info.get(fn, {})}
        stats.setdefault(fn, {})[arch] = d


def excerpt(fn, arch, start_pat, n):
    sp = glob.glob(os.path.join(OUT, f"*.{arch}.sass.txt"))
    for p in sp:
        f = parse_sass(p)
        if fn in f:
            ins = f[fn]
            for i, s in enumerate(ins):
                if re.search(start_pat, s):
                    return ins[i:i + n]
    return []


ex = {
    "warp_sum_sm90a": excerpt("r5_warptail", "sm_90a", r"SHFL", 10),
    "k5_inner_sm90a": excerpt("k5_tile2d", "sm_90a", r"^LDS", 14),
    "k6_inner_sm90a": excerpt("k6_vectorized", "sm_90a", r"^LDS\.128", 14),
    "dequant_sm90a": excerpt("dequant_gemv", "sm_90a", r"^LDG\.E\.U16", 22),
}
json.dump({"stats": stats, "excerpts": ex, "nvcc": open(os.path.join(OUT, "nvcc_version.txt")).read().strip().splitlines()[-1]},
          open(os.path.join(OUT, "stats.json"), "w"), indent=1)
for fn, a in stats.items():
    d = a.get("sm_90a") or next(iter(a.values()))
    print(f"{fn:16s} regs {d.get('regs')} smem {d.get('smem')} n {d['instructions']} {d['counts']}")
