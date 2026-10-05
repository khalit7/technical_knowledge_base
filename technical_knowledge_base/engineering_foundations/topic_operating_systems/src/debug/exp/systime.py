"""The same 64 MiB, read from the page cache with different read sizes: where the time goes."""
import os, time
P = "/work/shard.bin"; N = 64 << 20
with open(P, "wb") as f:
    f.write(os.urandom(N))
for bs in (64, 4096, 1 << 20):
    fd = os.open(P, os.O_RDONLY); os.read(fd, 0)
    c0 = os.times(); t = time.perf_counter(); n = 0; calls = 0
    while n < N:
        k = len(os.read(fd, bs)); n += k; calls += 1
    dt = time.perf_counter() - t; c1 = os.times(); os.close(fd)
    print(f"read size {bs:>7} B: {calls:>8} read calls, {dt:6.2f} s wall, user {c1.user - c0.user:5.2f} s, "
          f"system {c1.system - c0.system:5.2f} s")
