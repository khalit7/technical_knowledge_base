"""Python reference for every derived number on the page. Reads ../out/*.json, writes ../out/expected.json.
The page's JavaScript is checked against it by ../check/check_js.mjs. Run: python3 recompute.py (no dependencies).
"""
import os, json, math

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
comp = json.load(open(os.path.join(OUT, "compile.json")))
glu = json.load(open(os.path.join(OUT, "gluon.json")))
exp = {}


# 1. Grouped program ordering (tutorial 03): tiles of A and B a run of programs must load.
def order(pid, nm, nn, group):
    """(pid_m, pid_n) for program pid; group=None means row-major."""
    if group is None:
        return pid // nn, pid % nn
    in_group = group * nn
    first = (pid // in_group) * group
    gsize = min(nm - first, group)
    return first + (pid % in_group) % gsize, (pid % in_group) // gsize


def tiles_loaded(nm, nn, nk, group, n_programs):
    rows, cols = set(), set()
    for p in range(n_programs):
        m, n = order(p, nm, nn, group)
        rows.add(m)
        cols.add(n)
    return len(rows) * nk + len(cols) * nk  # each output-tile row needs nk tiles of A, each column nk tiles of B


exp["grouped"] = {"row_major_9": tiles_loaded(9, 9, 9, None, 9), "grouped_9": tiles_loaded(9, 9, 9, 3, 9),
                  "tutorial_claim": [90, 54]}
assert exp["grouped"]["row_major_9"] == 90 and exp["grouped"]["grouped_9"] == 54
# a full sequence for the animation check: cumulative tiles after each program
exp["grouped_seq"] = {k: [tiles_loaded(9, 9, 9, g, p + 1) for p in range(81)] for k, g in (("row", None), ("grouped", 3))}


# 2. Shared memory of the pipelined matmul against num_stages (sweep 128x128x64 fp16, 4 warps)
def async_mma(r):
    """True when the matmul uses an asynchronous MMA that reads its operands from shared memory (wgmma, tcgen05)."""
    s = r.get("sass") or {}
    return bool(s.get("HGMMA") or s.get("UTCHMMA"))


def smem_model(asyncmma, ns, bm=128, bn=128, bk=64, bytes_=2):
    # observed rule: num_stages buffers when wgmma/tcgen05 read shared memory directly,
    # num_stages - 1 (at least 1) when mma.sync loads operands into registers first
    per_stage = (bm * bk + bk * bn) * bytes_
    bufs = ns if asyncmma else max(ns - 1, 1)
    return bufs * per_stage


rows = []
for r in comp["sweep"]:
    if r["key"].startswith("mmstages_") and r["ok"]:
        ns = int(r["key"].split("_s")[1])
        m = smem_model(async_mma(r), ns)
        rows.append({"target": r["target"], "ns": ns, "async": async_mma(r), "observed": r["shared"], "model": m, "residual": r["shared"] - m})
exp["smem_stages"] = rows
assert all(0 <= x["residual"] <= 16 for x in rows), rows  # sm_100a adds 8 or 16 bytes of mbarriers

# tutorial configs: model with each target's buffer rule, and fit against the per-block limit
LIMIT = {"sm_80": 163 * 1024, "sm_90a": 227 * 1024, "sm_100a": 227 * 1024, "sm_120": 99 * 1024}
tut = []
for r in comp["sweep"]:
    if r["key"].startswith("mm_") and r["ok"]:
        bm, bn, bk = map(int, r["key"].split("_")[1].split("x"))
        ns = int(r["key"].split("_s")[1].split("_")[0])
        m = smem_model(async_mma(r), ns, bm, bn, bk)
        tut.append({"key": r["key"], "target": r["target"], "async": async_mma(r), "observed": r["shared"], "model": m,
                    "fits": r["shared"] <= LIMIT[r["target"]]})
exp["tutorial_configs"] = tut
assert all(0 <= t["observed"] - t["model"] <= 16 for t in tut), [t for t in tut if not 0 <= t["observed"] - t["model"] <= 16]
exp["tutorial_fit_counts"] = {t: sum(1 for x in tut if x["target"] == t and x["fits"]) for t in LIMIT}

# 3. Tensor-core instructions per K step for the 128x128x32 tile (4 warps): derived from the instruction shapes
SHAPES = {"sm_80": (16, 8, 16, "per warp", 4), "sm_120": (16, 8, 16, "per warp", 4), "sm_90a": (64, 128, 16, "per warpgroup", 1),
          "sm_100a": (128, 128, 16, "per CTA (one thread issues)", 1),
          "gfx942": (32, 32, 8, "per wave", 4), "gfx950": (32, 32, 16, "per wave", 4)}
mma = {}
for t, (m, n, k, unit, div) in SHAPES.items():
    total = (128 * 128 * 32) // (m * n * k)
    mma[t] = {"instr_shape": [m, n, k], "per_cta_per_kstep": total, "per_issuer": total // div, "unit": unit}
exp["mma_per_kstep"] = mma
exp["mma_static"] = {r["target"]: (r.get("sass") or {}).get("HMMA") or (r.get("sass") or {}).get("HGMMA") or
                     (r.get("sass") or {}).get("UTCHMMA") or (r.get("amd") or {}).get("v_mfma")
                     for r in comp["main"] if r["key"] == "matmul"}

# 4. Vector add: elements per thread and vector loads
for r in comp["main"]:
    if r["key"] in ("vadd", "vadd_nohints") and r["target"] == "sm_90a":
        exp[r["key"] + "_sm_90a"] = {"LDG": r["sass"], "regs": r["regs"]}
exp["vadd_elems_per_thread"] = 1024 // (32 * 4)          # 8
exp["vadd_v4_per_input"] = exp["vadd_elems_per_thread"] // 4  # 2


# 5. Occupancy, ported from NVIDIA's cuda_occupancy.h by the parent page (src/compile/occ/occ.py)
ARCH = {"sm_80": dict(cc=(8, 0), maxW=64, maxB=32, smemSM=164 * 1024, smemBlock=163 * 1024),
        "sm_90a": dict(cc=(9, 0), maxW=64, maxB=32, smemSM=228 * 1024, smemBlock=227 * 1024),
        "sm_100a": dict(cc=(10, 0), maxW=64, maxB=32, smemSM=228 * 1024, smemBlock=227 * 1024),
        "sm_120": dict(cc=(12, 0), maxW=48, maxB=24, smemSM=100 * 1024, smemBlock=99 * 1024)}


def ru(x, y):
    return -(-x // y) * y


def occupancy(arch, regs, smem, warps):
    a = ARCH[arch]
    lim_w = a["maxW"] // warps
    rpw = ru(regs * 32, 256)
    if rpw * ru(warps, 4) > 65536 or rpw * warps > 65536 or regs > 256:
        lim_r = 0
    else:
        lim_r = ((65536 // 4) // rpw) * 4 // warps
    per = ru(smem + 1024, 128)
    lim_s = 0 if smem > a["smemBlock"] else a["smemSM"] // per
    lim = min(lim_r, lim_s, lim_w, a["maxB"])
    lim = min(lim, a["maxB"] * (2 if a["cc"] in ((8, 0), (9, 0), (10, 0)) else 1))
    return lim


occ = []
for r in comp["sweep"]:
    if r["ok"] and r["target"] in ARCH:
        occ.append({"key": r["key"], "target": r["target"], "blocks": occupancy(r["target"], r["regs"], r["shared"], r["num_warps"])})
exp["occupancy"] = occ


# 6. Blocked layout -> element owners, and Triton's own linear layout (Gluon to_linear_layout)
def blocked_bases(spt, tpw, wpc, order, shape):
    """Bases (row, col) for registers, lanes and warps, built the way Triton converts a blocked layout."""
    def mk(d, v):
        b = [0, 0]
        b[d] = v if v < shape[d] else 0
        return b
    reg, lane, warp = [], [], []
    for d in order:
        for i in range(int(math.log2(spt[d]))):
            reg.append(mk(d, 1 << i))
    for d in order:
        for i in range(int(math.log2(tpw[d]))):
            lane.append(mk(d, spt[d] << i))
    for d in order:
        for i in range(int(math.log2(wpc[d]))):
            warp.append(mk(d, (spt[d] * tpw[d]) << i))
    for d in order:
        block = spt[d] * tpw[d] * wpc[d]
        reps = max(shape[d] // block, 1)
        for i in range(int(math.log2(reps))):
            reg.append(mk(d, block << i))
    return reg, lane, warp


def parse_ll(s):
    import re
    out = {}
    for k in ("reg_bases", "lane_bases", "warp_bases"):
        m = re.search(k + r"=(\[\[.*?\]\]|\[\])", s)
        out[k] = json.loads(m.group(1)) if m else []
    return out


lay = []
for c in glu["layouts"]:
    reg, lane, warp = blocked_bases(c["spt"], c["tpw"], c["wpc"], c["order"], c["shape"])
    tri = parse_ll(c["printed"])
    lay.append({"case": [c["spt"], c["tpw"], c["wpc"], c["order"], c["shape"]], "ours": [reg, lane, warp],
                "triton": [tri["reg_bases"], tri["lane_bases"], tri["warp_bases"]],
                "match": [reg, lane, warp] == [tri["reg_bases"], tri["lane_bases"], tri["warp_bases"]]})
exp["layouts"] = lay
assert all(x["match"] for x in lay), [x for x in lay if not x["match"]]


def owners(bases, shape):
    reg, lane, warp = bases
    grid = {}
    for w in range(1 << len(warp)):
        for l in range(1 << len(lane)):
            for r in range(1 << len(reg)):
                y = x = 0
                for bits, bs in ((r, reg), (l, lane), (w, warp)):
                    for i, b in enumerate(bs):
                        if bits >> i & 1:
                            y ^= b[0]
                            x ^= b[1]
                grid.setdefault((y, x), []).append((w * 32 + l, r))
    return grid


# the tutorial's printed table for spt [2,4], tpw [16,2], wpc [2,2], order [1,0]: first rows
g = owners(blocked_bases([2, 4], [16, 2], [2, 2], [1, 0], [64, 16]), [64, 16])
exp["tutorial_table_row0"] = [f"T{t}:{r}" for (t, r) in (g[(0, x)][0] for x in range(8))]
assert exp["tutorial_table_row0"] == ["T0:0", "T0:1", "T0:2", "T0:3", "T1:0", "T1:1", "T1:2", "T1:3"]
g2 = owners(blocked_bases([2, 4], [16, 2], [2, 2], [1, 0], [32, 8]), [32, 8])
exp["broadcast_32x8_owners_of_0_0"] = [f"T{t}:{r}" for (t, r) in sorted(g2[(0, 0)])]
assert exp["broadcast_32x8_owners_of_0_0"] == ["T0:0", "T32:0", "T64:0", "T96:0"]

# 7. Causal attention: fraction of K/V tiles a program visits, BM = BN
for n, bm in ((8192, 128), (1024, 64)):
    nb = n // bm
    exp[f"causal_tiles_{n}_{bm}"] = {"visited": nb * (nb + 1) // 2, "full": nb * nb, "fraction": round((nb + 1) / (2 * nb), 4)}

# 8. Gluon memcpy: load instruction per thread vs R, from the compiled SASS
exp["gluon_R"] = [{"target": r["target"], "R": r["R"], "loads": [o["op"] for o in r["ldst"] if o["op"].startswith("LDG")]}
                  for r in glu["memcpy"] if r["ok"]]
json.dump(exp, open(os.path.join(OUT, "expected.json"), "w"), indent=1)
print("ok", exp["grouped"], exp["tutorial_fit_counts"], exp["causal_tiles_8192_128"])
