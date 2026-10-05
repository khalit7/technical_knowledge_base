"""Python reference for every simulator on the GPU simulator tab (t-sim).

The page's JavaScript (../parts/31_js_sim_0core.js) is a line-by-line port of these functions;
code/check_js.mjs runs it on the cases below and compares with out/expected.json.
The occupancy function is also checked against NVIDIA's own calculator (cuda_occupancy.h, CUDA 13.4.2)
on every case in occ/occ_nvidia.csv.

Sources:
  CUDA Programming Guide (docs.nvidia.com/cuda/cuda-programming-guide, last updated 2026-09-10):
    2.3.4.1 Coalesced Global Memory Access (32-byte transactions), 2.3.4.2 shared memory (32 banks of 32-bit words),
    3.2.2.1 SIMT Execution Model (divergence), Compute Capabilities appendix Tables 30 and 31 (per-SM limits).
  cuda_occupancy.h (CUDA 13.4.2): register allocation unit 256 per warp, 4 sub-partitions, 128-byte shared memory
    granularity, 1 KB reserved per block, barrier limits.
"""
import csv, json, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# ------------------------------------------------------------------ divergence
def diverge(mask_bits, pre=3, len_a=4, len_b=4, post=1):
    """One warp. mask_bits: 32 booleans, True = lane takes branch A. Returns issue slots and lane utilisation."""
    na = sum(1 for b in mask_bits if b)
    nb = 32 - na
    slots = pre + post + (len_a if na else 0) + (len_b if nb else 0)
    useful = 32 * (pre + post) + na * len_a + nb * len_b
    return {"slots": slots, "useful": useful, "eff": useful / (32 * slots)}


def cond_mask(kind, warp, signs=None):
    lanes = range(32)
    tid = [warp * 32 + l for l in lanes]
    if kind == "lane_parity":
        return [t % 2 == 0 for t in tid]
    if kind == "warp_parity":
        return [(t // 32) % 2 == 0 for t in tid]
    if kind == "half":
        return [l < 16 for l in lanes]
    if kind == "all":
        return [True] * 32
    if kind == "data":
        return [signs[t] > 0 for t in tid]
    raise ValueError(kind)


def lcg_signs(n, seed, sort=False):
    """Deterministic data shared with the page: x[i] = +1 or -1 from a 32-bit LCG (Numerical Recipes constants)."""
    s = seed & 0xFFFFFFFF
    out = []
    for _ in range(n):
        s = (1664525 * s + 1013904223) & 0xFFFFFFFF
        out.append(1 if (s >> 16) & 1 else -1)
    if sort:
        out.sort(reverse=True)
    return out


# ------------------------------------------------------------------ coalescing
def lane_addresses(pattern, elem=4, param=1, base=0, seed=7):
    """Byte address of each of the 32 lanes. pattern: contiguous, offset (param elements), stride (param),
    broadcast, random (within 32*param*elem bytes)."""
    if pattern == "contiguous":
        return [base + l * elem for l in range(32)]
    if pattern == "offset":
        return [base + (l + param) * elem for l in range(32)]
    if pattern == "stride":
        return [base + l * param * elem for l in range(32)]
    if pattern == "broadcast":
        return [base] * 32
    if pattern == "random":
        span = 32 * max(1, param)
        s = seed
        out = []
        for _ in range(32):
            s = (1664525 * s + 1013904223) & 0xFFFFFFFF
            out.append(base + (s % span) * elem)
        return out
    raise ValueError(pattern)


def coalesce(addrs, elem=4):
    sectors, lines = set(), set()
    for a in addrs:
        for byte in (a, a + elem - 1):
            sectors.add(byte // 32)
            lines.add(byte // 128)
    useful = len(set(addrs)) * elem
    return {"sectors": len(sectors), "lines": len(lines), "bytes_moved": 32 * len(sectors),
            "useful": 32 * elem, "eff": min(1.0, 32 * elem / (32 * len(sectors))), "unique_bytes": useful}


def transpose_sectors(n=32, rows_per_step=8, tiled=False):
    """Sectors moved by one 32x32 thread-block tile of an fp32 transpose (block 32x8, 4 rows per thread)."""
    rd = wr = 0
    for step in range(n // rows_per_step):
        for r in range(rows_per_step):
            row = step * rows_per_step + r
            # read: warp r reads row `row` of the input tile: 32 consecutive floats
            rd += coalesce(lane_addresses("contiguous", 4, base=row * 4096 * 4))["sectors"]
            if tiled:
                wr += coalesce(lane_addresses("contiguous", 4, base=row * 4096 * 4))["sectors"]
            else:
                # naive: lane l writes out[l][row], 4096 floats apart
                wr += coalesce(lane_addresses("stride", 4, param=4096, base=row * 4))["sectors"]
    return {"read": rd, "write": wr}


# ------------------------------------------------------------------ shared memory banks
def bank_words(pattern, param=1):
    """32-bit word index requested by each lane."""
    l = range(32)
    if pattern == "row":            # tile[ty][tx], tx = lane: consecutive words
        return [x for x in l]
    if pattern == "col32":          # tile[lane][c] of float tile[32][32]
        return [x * 32 for x in l]
    if pattern == "col33":          # padded float tile[32][33]
        return [x * 33 for x in l]
    if pattern == "swizzle":        # tile[lane][c ^ lane] in a 32x32 tile (column c = 0)
        return [x * 32 + (0 ^ x) for x in l]
    if pattern == "stride":
        return [x * param for x in l]
    if pattern == "broadcast":
        return [5] * 32
    if pattern == "double":         # 64-bit elements read contiguously: each lane covers words 2l and 2l+1
        return [2 * x for x in l]
    raise ValueError(pattern)


def banks(words):
    per = {}
    for w in words:
        per.setdefault(w % 32, set()).add(w)
    degree = max(len(v) for v in per.values())
    return {"degree": degree, "banks_used": len(per)}


# ------------------------------------------------------------------ occupancy
ARCH = {  # cc, max warps/SM, max blocks/SM, smem per SM (bytes), max smem per block (bytes), barrier slots per block slot
    "sm_80": dict(cc=(8, 0), maxW=64, maxB=32, smemSM=164 * 1024, smemBlock=163 * 1024, bar=2),
    "sm_86": dict(cc=(8, 6), maxW=48, maxB=16, smemSM=100 * 1024, smemBlock=99 * 1024, bar=1),
    "sm_89": dict(cc=(8, 9), maxW=48, maxB=24, smemSM=100 * 1024, smemBlock=99 * 1024, bar=1),
    "sm_90a": dict(cc=(9, 0), maxW=64, maxB=32, smemSM=228 * 1024, smemBlock=227 * 1024, bar=2),
    "sm_100a": dict(cc=(10, 0), maxW=64, maxB=32, smemSM=228 * 1024, smemBlock=227 * 1024, bar=2),
    "sm_120": dict(cc=(12, 0), maxW=48, maxB=24, smemSM=100 * 1024, smemBlock=99 * 1024, bar=1),
}
REGS_SM, REG_GRAN, SUBPART, SMEM_GRAN, RESERVED, BIG = 65536, 256, 4, 128, 1024, 10 ** 9


def ru(x, y):
    return -(-x // y) * y


def occupancy(arch, regs, smem, block, barriers=1):
    a = ARCH[arch]
    wpb = -(-block // 32)
    lim_w = a["maxW"] // wpb
    rpw = ru(regs * 32, REG_GRAN)
    if rpw * ru(wpb, SUBPART) > REGS_SM or regs > 255:
        lim_r = 0
    elif rpw > 0:
        lim_r = ((REGS_SM // SUBPART) // rpw) * SUBPART // wpb
    else:
        lim_r = BIG
    per_cta = ru(smem + RESERVED, SMEM_GRAN)
    lim_s = a["smemSM"] // per_cta
    if smem > a["smemBlock"]:
        lim_s = 0
    lim_b = a["maxB"]
    lim = min(lim_r, lim_s, lim_w, lim_b)
    if barriers:
        lim = min(lim, lim_b * a["bar"] // barriers)
    return {"blocks": lim, "warps": lim * wpb, "occ": lim * wpb / a["maxW"],
            "lim_reg": lim_r, "lim_smem": lim_s, "lim_warps": lim_w, "lim_blocks": lim_b}


def check_occupancy():
    path = os.path.join(ROOT, "occ", "occ_nvidia.csv")
    n = bad = 0
    with open(path) as fh:
        for row in csv.reader(fh):
            arch, regs, smem, block, bars, err, blocks, lr, ls, lw, lb = row[0], *map(int, row[1:])
            o = occupancy(arch, regs, smem, block, bars)
            n += 1
            got = (o["blocks"], min(o["lim_reg"], 10 ** 9), o["lim_smem"], o["lim_warps"], o["lim_blocks"])
            want = (blocks, lr, ls, lw, lb)
            # NVIDIA reports the register limit as INT_MAX-like when no registers are used; we never pass 0
            if got != want:
                bad += 1
                if bad < 6:
                    print("MISMATCH", row, got)
    return n, bad


# ------------------------------------------------------------------ latency hiding
def latency_sim(warps, compute, lat, ilp=1, cycles=4000, trace=0):
    """One warp scheduler that issues at most one instruction per cycle, greedy then oldest.
    Each warp loops over a body of `ilp` independent loads followed by ilp * compute instructions that use them:
    after its last load the warp waits `lat` cycles. Returns issue utilisation (and Little's-law model);
    with trace>0, the first `trace` cycles as one string per warp
    ('I' issued compute, 'L' issued load, 'w' waiting on memory, 'r' ready but another warp issued)."""
    body = ilp * (compute + 1)
    ready_at = [0] * warps
    pc = [0] * warps  # 0..ilp-1: loads; ilp..body-1: compute
    last = 0
    issued = 0
    rows = [[] for _ in range(warps)]
    for t in range(cycles):
        # greedy then oldest: keep the warp that issued last while it is ready, else the ready warp
        # that has been ready longest (lowest index on a tie)
        pick = -1
        if ready_at[last] <= t and issued:
            pick = last
        else:
            for w in range(warps):
                if ready_at[w] <= t and (pick < 0 or ready_at[w] < ready_at[pick]):
                    pick = w
        if t < trace:
            for w in range(warps):
                if w == pick:
                    rows[w].append("L" if pc[w] < ilp else "I")
                else:
                    rows[w].append("r" if ready_at[w] <= t else "w")
        if pick >= 0:
            issued += 1
            last = pick
            pc[pick] += 1
            ready_at[pick] = t + 1 + (lat if pc[pick] == ilp else 0)
            if pc[pick] == body:
                pc[pick] = 0
    out = {"util": issued / cycles, "model": min(1.0, warps * body / (body + lat))}
    if trace:
        out["trace"] = ["".join(r) for r in rows]
    return out


# ------------------------------------------------------------------ tiling
def tiling(n, bm, bn, elem=4):
    """C = A @ B, n x n. Each block computes a bm x bn tile of C, staging bm x bk of A and bk x bn of B per k step.
    Global bytes = n^3 (1/bn + 1/bm) * elem; FLOPs = 2 n^3; intensity = 2 bm bn / ((bm + bn) elem)."""
    flops = 2 * n ** 3
    loads = n ** 3 * (1 / bn + 1 / bm)
    return {"flops": flops, "bytes": loads * elem, "ai": flops / (loads * elem)}


def tile_anim(n=8, t=4):
    """Element loads from global memory for the small animated example: naive (each thread loads its own row
    and column) against staged (each block loads each tile once into shared memory)."""
    blocks, ksteps = (n // t) ** 2, n // t
    naive = blocks * ksteps * (t * t) * (2 * t)
    staged = blocks * ksteps * 2 * t * t
    return {"naive": naive, "staged": staged, "steps": blocks * ksteps}


# ------------------------------------------------------------------ cases
def cases():
    ex = {}
    signs = lcg_signs(64, 12345)
    ssorted = lcg_signs(64, 12345, sort=True)
    d = {}
    for kind in ["lane_parity", "warp_parity", "half", "all"]:
        for la, lb in [(4, 4), (6, 2), (1, 8)]:
            d[f"{kind}/{la}/{lb}"] = [diverge(cond_mask(kind, w), 3, la, lb, 1) for w in (0, 1)]
    for nm, sg in [("data_random", signs), ("data_sorted", ssorted)]:
        d[f"{nm}/4/4"] = [diverge(cond_mask("data", w, sg), 3, 4, 4, 1) for w in (0, 1)]
    ex["signs"] = signs
    ex["signs_sorted"] = ssorted
    ex["diverge"] = d
    c = {}
    for elem in (2, 4, 8, 16):
        for pat, params in [("contiguous", [1]), ("offset", [1, 2, 8]), ("stride", [1, 2, 3, 4, 8, 16, 32, 64, 4096]),
                            ("broadcast", [1]), ("random", [1, 4, 32])]:
            for p in params:
                c[f"{pat}/{elem}/{p}"] = coalesce(lane_addresses(pat, elem, p), elem)
    ex["coalesce"] = c
    ex["transpose"] = {"naive": transpose_sectors(tiled=False), "tiled": transpose_sectors(tiled=True)}
    b = {}
    for pat in ["row", "col32", "col33", "swizzle", "broadcast", "double"]:
        b[pat] = banks(bank_words(pat))
    for s in [1, 2, 3, 4, 8, 16, 17, 32, 33, 64]:
        b[f"stride/{s}"] = banks(bank_words("stride", s))
    ex["banks"] = b
    o = {}
    for arch in ARCH:
        for regs in [12, 32, 38, 40, 64, 80, 128, 168, 254, 255]:
            for smem in [0, 32, 8192, 49152, 65536]:
                for block in [64, 128, 256, 512, 1024]:
                    o[f"{arch}/{regs}/{smem}/{block}/1"] = occupancy(arch, regs, smem, block, 1)
    ex["occupancy"] = o
    lt = {}
    for w in [1, 2, 4, 8, 16, 32]:
        for c_, l_ in [(4, 40), (2, 60), (8, 470), (20, 470)]:
            for k in (1, 2, 4):
                lt[f"{w}/{c_}/{l_}/{k}"] = latency_sim(w, c_, l_, k)
    lt["trace/2/4/20"] = latency_sim(2, 4, 20, 1, cycles=200, trace=60)
    lt["trace/6/4/20"] = latency_sim(6, 4, 20, 1, cycles=200, trace=60)
    ex["latency"] = lt
    tl = {}
    for bm in [1, 2, 4, 8, 16, 32, 64, 128, 256]:
        for elem in (2, 4):
            tl[f"{bm}/{bm}/{elem}"] = tiling(4096, bm, bm, elem)
    tl["128/64/2"] = tiling(4096, 128, 64, 2)
    ex["tiling"] = tl
    ex["tile_anim"] = tile_anim()
    return ex


if __name__ == "__main__":
    n, bad = check_occupancy()
    print(f"occupancy: {n} cases against cuda_occupancy.h, {bad} mismatches")
    assert bad == 0
    # sanity checks against statements in the sources
    assert coalesce(lane_addresses("contiguous", 4))["sectors"] == 4          # guide 2.3.4.1: 128 bytes in four 32-byte transactions
    assert coalesce(lane_addresses("stride", 4, 8))["bytes_moved"] == 1024    # guide: 32 x 32 bytes = 1024, 12.5%
    assert abs(coalesce(lane_addresses("stride", 4, 8))["eff"] - 0.125) < 1e-12
    assert banks(bank_words("stride", 2))["degree"] == 2                      # guide Figure 15: stride 2, two-way
    assert banks(bank_words("stride", 3))["degree"] == 1                      # stride 3, none
    assert banks(bank_words("col32"))["degree"] == 32                         # guide 2.3.4.2.2: 32-way
    assert banks(bank_words("col33"))["degree"] == 1                          # padding fixes it
    assert banks(bank_words("broadcast"))["degree"] == 1                      # Figure 16: broadcast
    ex = cases()
    with open(os.path.join(ROOT, "out", "expected.json"), "w") as fh:
        json.dump(ex, fh, indent=0, sort_keys=True)
    print("wrote out/expected.json")
    for k in ["trace/2/4/20", "trace/6/4/20"]:
        print(k, ex["latency"][k]["util"], ex["latency"][k]["model"])
        for r in ex["latency"][k]["trace"]:
            print("  ", r)
    print("transpose sectors", ex["transpose"])
    print("tile_anim", ex["tile_anim"])
