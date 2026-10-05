"""Decode the scheduling ("control") bits of real SASS, and check the decoding against the code itself.
Input: out/nvcc/<kernel>.<arch>.hex.txt (nvdisasm -hex) and .plr.txt (nvdisasm -plr, live registers).
Layout (Jia et al. 2018, "Dissecting the NVIDIA Volta GPU Architecture via Microbenchmarking", section 2.1,
reverse engineered, not documented by NVIDIA): in the 128-bit word the top 2 bits are zero and the next 21 bits are,
from the most significant: reuse flags (4), wait barrier mask (6), read barrier (3), write barrier (3), yield (1),
stall cycles (4). Barrier 7 means none. nvdisasm prints the word as two 64-bit halves, low first, so the 21 bits
are bits 41..61 of the second half.
Check: every register written by an instruction that sets a write barrier must not be read (or overwritten) by a
later instruction before some instruction waits on that barrier. A straight-line scan; a loop's back edge can only
make it stricter. Writes ../out/sass.json."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NV = os.path.join(HERE, "..", "out", "nvcc")
LINE = re.compile(r"/\*([0-9a-f]{4,5})\*/\s+(@!?U?P[T0-9])?\s*([A-Z0-9_.]+)\s*(.*?)\s*;\s*/\*\s*0x([0-9a-f]{16})\s*\*/")
HI = re.compile(r"^\s*/\*\s*0x([0-9a-f]{16})\s*\*/\s*$")
NOWRITE = ("ST", "STG", "STS", "STL", "RED", "BRA", "EXIT", "BAR", "BSSY", "BSYNC", "MEMBAR", "WARPSYNC", "RET", "CALL",
           "NOP", "DEPBAR", "ERRBAR", "CCTL", "FENCE", "UTMASTG", "UTMALDG", "SYNCS", "WARPGROUP", "REDG", "STSM")


SHIFT = 41                     # the negative control below moves this to show the check can fail


def ctrl(hi):
    c = (hi >> SHIFT) & 0x1FFFFF
    return {"stall": c & 0xF, "yield": (c >> 4) & 1, "wbar": (c >> 5) & 7, "rbar": (c >> 8) & 7,
            "wait": (c >> 11) & 0x3F, "reuse": (c >> 17) & 0xF}


def split_ops(s):
    out, depth, cur = [], 0, ""
    for ch in s:
        if ch in "[(": depth += 1
        if ch in "])": depth -= 1
        if ch == "," and depth == 0: out.append(cur.strip()); cur = ""
        else: cur += ch
    if cur.strip(): out.append(cur.strip())
    return out


def regs(op):
    r = set()
    for m in re.finditer(r"(?<![A-Z])R(\d+)(\.64|\.128)?", op):
        n = int(m.group(1)); w = {".64": 2, ".128": 4}.get(m.group(2) or "", 1)
        r.update(range(n, n + w))
    return r


def parse(path):
    rows, lines = [], open(path).read().splitlines()
    for i, ln in enumerate(lines):
        m = LINE.search(ln)
        if not m: continue
        h = HI.match(lines[i + 1]); hi = int(h.group(1), 16)
        off, pred, opc, ops = m.group(1), m.group(2) or "", m.group(3), m.group(4)
        rows.append({"off": int(off, 16), "pred": pred, "op": opc, "args": ops, "lo": m.group(5), "hi": h.group(1), **ctrl(hi)})
    return rows


def live(path):
    out = {}
    for ln in open(path):
        m = re.search(r"/\*([0-9a-f]{4,5})\*/.*//\s*\|\s*(\d*)[^|]*\|\s*(\d*)[^|]*\|\s*(\d*)", ln)
        if m: out[int(m.group(1), 16)] = [int(x) if x else 0 for x in m.group(2, 3, 4)]
    return out


def check(rows):
    pending, ok, bad, examples = {}, 0, 0, []
    for k, r in enumerate(rows):
        for b in range(6):
            if r["wait"] >> b & 1:
                pending = {g: bb for g, bb in pending.items() if bb != b}
        ops = split_ops(r["args"]); base = r["op"].split(".")[0]
        dst = set()
        if base not in NOWRITE and ops:
            first = 1 if (re.fullmatch(r"!?U?P[T0-9]", ops[0]) and len(ops) > 1 and base in ("SHFL",)) else 0
            if not ops[first].startswith("["): dst = regs(ops[first].split("[")[0])
            src_ops = ops[:first] + ops[first + 1:]
        else:
            src_ops = ops
        src = set()
        for o in src_ops: src |= regs(o)
        for o in ops:                                    # address registers inside brackets are always read
            for a in re.findall(r"\[([^\]]*)\]", o): src |= regs(a)
        for g in (src | dst) & set(pending):
            bad += 1
            if len(examples) < 5: examples.append({"at": hex(r["off"]), "op": r["op"], "reg": "R%d" % g, "barrier": pending[g]})
        if r["wbar"] != 7:
            for g in dst: pending[g] = r["wbar"]
            r["_sets"] = sorted(dst)
    return bad, examples


def consumers(rows):
    """For each barrier-setting instruction, find the first later reader of its result and whether that reader
    (or an instruction between them) waits on the barrier. Returns (protected, total)."""
    prot = tot = 0
    for i, r in enumerate(rows):
        if r["wbar"] == 7 or not r.get("_sets"): continue
        b, regs_w = r["wbar"], set(r["_sets"])
        waited = False
        for j in range(i + 1, len(rows)):
            q = rows[j]
            if q["wait"] >> b & 1: waited = True
            ops = split_ops(q["args"]); reads = set()
            for o in ops[1:] if q["op"].split(".")[0] not in NOWRITE else ops: reads |= regs(o)
            for o in ops:
                for a in re.findall(r"\[([^\]]*)\]", o): reads |= regs(a)
            if reads & regs_w:
                tot += 1; prot += waited; break
    return prot, tot


if __name__ == "__main__":
    out = {"layout_source": "Jia et al. 2018, arXiv 1804.06826, section 2.1", "kernels": {}}
    for f in sorted(os.listdir(NV)):
        if not f.endswith(".hex.txt"): continue
        key = f[:-8]
        rows = parse(os.path.join(NV, f)); lv = live(os.path.join(NV, key + ".plr.txt"))
        bad, ex = check(rows); prot, tot = consumers(rows)
        for r in rows:
            r["live"] = lv.get(r["off"], [None, None, None])
            r.pop("_sets", None)
        out["kernels"][key] = {"n": len(rows), "violations": bad, "examples": ex, "consumers_protected": prot,
                               "consumers": tot, "max_live_gpr": max((r["live"][0] or 0) for r in rows), "rows": rows}
        print(key, "instr", len(rows), "violations", bad, "first-consumer protected", prot, "/", tot, "max live", out["kernels"][key]["max_live_gpr"], ex[:2])
    # negative control: the same check with the field read one or two bits off finds violations
    neg = {}
    for sh in (40, 42, 43):
        SHIFT = sh; tot = 0
        for key in out["kernels"]:
            rows = parse(os.path.join(NV, key + ".hex.txt")); tot += check(rows)[0]
        neg[str(sh)] = tot
    SHIFT = 41
    out["negative_control"] = neg
    print("negative control (violations with the field misplaced):", neg)
    json.dump(out, open(os.path.join(HERE, "..", "out", "sass.json"), "w"))
