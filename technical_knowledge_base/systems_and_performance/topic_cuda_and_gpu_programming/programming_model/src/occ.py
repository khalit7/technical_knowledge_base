"""Occupancy, ported line by line from NVIDIA's cuda_occupancy.h (CUDA 13.4.2), default device state.
The per-architecture function is the CUDA root's port (../../src/compile/occ/occ.py, checked there on
1,988 cases); added here: a kernel's maxThreadsPerBlock attribute (set by __launch_bounds__) and the
block-size suggestion of cudaOccMaxPotentialOccupancyBlockSize (largest block size reaching the
highest resident-thread count; ties keep the larger block, as the header's loop runs downwards).
Per-SM limits: CUDA Programming Guide v13.4.2, Tables 30 and 31."""
ARCH = {  # cc, max warps/SM, max blocks/SM, smem per SM (bytes), max smem per block (bytes)
    "sm_80": dict(cc=(8, 0), maxW=64, maxB=32, smemSM=164 * 1024, smemBlock=163 * 1024),
    "sm_90a": dict(cc=(9, 0), maxW=64, maxB=32, smemSM=228 * 1024, smemBlock=227 * 1024),
    "sm_100a": dict(cc=(10, 0), maxW=64, maxB=32, smemSM=228 * 1024, smemBlock=227 * 1024),
    "sm_120": dict(cc=(12, 0), maxW=48, maxB=24, smemSM=100 * 1024, smemBlock=99 * 1024),
}
REGS_SM, REG_GRAN, SUBPART, SMEM_GRAN, RESERVED, BIG = 65536, 256, 4, 128, 1024, 10 ** 9


def ru(x, y):
    return -(-x // y) * y


def blocks_per_sm(arch, regs, smem, block, barriers=1, max_threads=1024):
    if block > max_threads:
        return 0
    a = ARCH[arch]
    wc = -(-block // 32)
    lim_w = a["maxW"] // wc
    rpw = ru(regs * 32, REG_GRAN)
    if rpw * ru(wc, SUBPART) > REGS_SM or rpw * wc > REGS_SM or regs > 256:
        lim_r = 0
    elif rpw > 0:
        lim_r = ((REGS_SM // SUBPART) // rpw) * SUBPART // wc
    else:
        lim_r = BIG
    per = ru(smem + RESERVED, SMEM_GRAN)
    lim_s = a["smemSM"] // per
    if smem > a["smemBlock"]:
        lim_s = 0
    lim = min(lim_r, lim_s, lim_w, a["maxB"])
    if barriers:
        k = 2 if a["cc"] in ((8, 0), (9, 0), (10, 0)) else 1
        lim = min(lim, a["maxB"] * k // barriers)
    return lim


def suggest(arch, regs, smem, barriers=1, max_threads=1024, num_sms=1):
    limit = ARCH[arch]["maxW"] * 32
    best = (0, 0, 0)  # threads, block, blocks
    for b in range(ru(min(1024, max_threads), 32), 0, -32):
        bt = min(min(1024, max_threads), b)
        nb = blocks_per_sm(arch, regs, smem, bt, barriers, max_threads)
        if bt * nb > best[0]:
            best = (bt * nb, bt, nb)
        if best[0] == limit:
            break
    return {"block": best[1], "minGrid": best[2] * num_sms}
