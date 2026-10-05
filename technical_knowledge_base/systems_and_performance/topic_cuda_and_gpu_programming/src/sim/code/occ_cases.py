"""Cases for the occupancy check: every target the page offers x registers x shared memory x block size x barriers.
Per-SM limits from the CUDA Programming Guide, Compute Capabilities appendix, Tables 30 and 31 (last updated 2026-09-10)."""
A = {"sm_80": (8, 0, 64, 164, 163), "sm_86": (8, 6, 48, 100, 99), "sm_89": (8, 9, 48, 100, 99),
     "sm_90a": (9, 0, 64, 228, 227), "sm_100a": (10, 0, 64, 228, 227), "sm_120": (12, 0, 48, 100, 99)}
for a, (M, m, w, s, b) in A.items():
    for r in [16, 32, 40, 64, 72, 96, 128, 168, 255]:
        for sm in [0, 128, 8192, 32768, 49152, 98304, 200000]:
            for blk in [32, 96, 128, 256, 384, 512, 1024]:
                for bars in [0, 1]:
                    print(f"{a} {M} {m} {w} {s * 1024} {b * 1024} {r} {sm} {blk} {bars}")
