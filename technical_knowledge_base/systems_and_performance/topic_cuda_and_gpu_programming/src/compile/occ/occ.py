# Python reference for occupancy, ported line by line from NVIDIA's cuda_occupancy.h
# (CUDA 13.4.2), default device state (no carveout preference, no partitioned global caching).
# Per-SM limits are from the CUDA Programming Guide v13.4.2, Tables 30 and 31.
ARCH = {  # cc, max warps/SM, max blocks/SM, smem per SM (bytes), max smem per block (bytes)
    "sm_80": dict(cc=(8, 0), maxW=64, maxB=32, smemSM=164 * 1024, smemBlock=163 * 1024),
    "sm_90a": dict(cc=(9, 0), maxW=64, maxB=32, smemSM=228 * 1024, smemBlock=227 * 1024),
    "sm_100a": dict(cc=(10, 0), maxW=64, maxB=32, smemSM=228 * 1024, smemBlock=227 * 1024),
    "sm_120": dict(cc=(12, 0), maxW=48, maxB=24, smemSM=100 * 1024, smemBlock=99 * 1024),
}
REGS_SM = 65536
REG_GRAN = 256          # register allocation unit (registers per warp, rounded up)
SUBPART = 4             # SM sub-partitions; registers are split evenly between them
SMEM_GRAN = 128         # shared memory allocation granularity (CC 8.x to 12.x)
RESERVED = 1024         # shared memory reserved by the system per block
BIG = 10 ** 9


def ru(x, y):
    return -(-x // y) * y


def occupancy(arch, regs, smem_static, block, smem_dyn=0, barriers=1):
    a = ARCH[arch]
    warps_cta = -(-block // 32)
    # warps
    lim_w = a["maxW"] // warps_cta
    # registers
    rpw = ru(regs * 32, REG_GRAN)
    if rpw * ru(warps_cta, SUBPART) > REGS_SM or rpw * warps_cta > REGS_SM or regs > 256:
        lim_r = 0
    elif rpw > 0:
        lim_r = ((REGS_SM // SUBPART) // rpw) * SUBPART // warps_cta
    else:
        lim_r = BIG
    # shared memory (default carveout: the maximum)
    per_cta = ru(smem_static + RESERVED + smem_dyn, SMEM_GRAN)
    lim_s = a["smemSM"] // per_cta if per_cta > 0 else BIG
    if smem_static + smem_dyn > a["smemBlock"]:
        lim_s = 0
    lim_b = a["maxB"]
    lim = min(lim_r, lim_s, lim_w, lim_b)
    # barriers: CC 8.0, 9.0 and 10.0 have 2 per block slot, CC 12.x one
    if barriers:
        per = 2 if a["cc"] in ((8, 0), (9, 0), (10, 0)) else 1
        lim = min(lim, lim_b * per // barriers)
    return dict(blocks=lim, warps=lim * warps_cta, occ=lim * warps_cta / a["maxW"],
                limits=dict(reg=lim_r, smem=lim_s, warps=lim_w, blocks=lim_b))
