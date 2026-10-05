"""Buffered against unbuffered writes: the same 1 MiB written as 4,096 pieces of 256 bytes.

mode=buffered   open(path, "wb")              Python's BufferedWriter (8 KiB buffer) batches the pieces
mode=unbuffered open(path, "wb", buffering=0) every f.write() is one write(2) system call
Prints the elapsed time; run under strace to count the write(2) calls, and without strace to time it.
"""
import os
import sys
import time

mode, path = sys.argv[1], sys.argv[2]
reps = int(sys.argv[3]) if len(sys.argv) > 3 else 1
piece = b"x" * 256
best = None
for _ in range(reps):
    os.access("/phase/write_begin", os.F_OK)
    t = time.perf_counter()
    with open(path, "wb", buffering=0 if mode == "unbuffered" else -1) as f:
        for _ in range(4096):
            f.write(piece)
    dt = time.perf_counter() - t
    os.access("/phase/write_end", os.F_OK)
    best = dt if best is None else min(best, dt)
print(f"{mode}: best of {reps}: {best * 1e3:.2f} ms for 1 MiB in 4096 writes of 256 B")
