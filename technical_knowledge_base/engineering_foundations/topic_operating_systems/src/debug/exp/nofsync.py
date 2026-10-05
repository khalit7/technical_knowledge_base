"""write() returns when the data is in the page cache, not on the device. memory.stat shows how much
of this container's written data is still only in memory (file_dirty) or on its way (file_writeback).
Usage: nofsync.py"""
import os, sys, time
sys.path.insert(0, "/exp"); import cg
MB = 1 << 20
buf = os.urandom(MB)


def dirty():
    s = cg.stat("memory.stat", ["file_dirty", "file_writeback"])
    return f"file_dirty {s['file_dirty'] // MB} MiB, file_writeback {s['file_writeback'] // MB} MiB"


t = time.perf_counter()
with open("/work/ckpt_a.bin", "wb") as f:
    for _ in range(256):
        f.write(buf)
print(f"wrote 256 MiB without fsync in {time.perf_counter() - t:.2f} s; {dirty()}", flush=True)
for s in range(5, 41, 5):
    time.sleep(5)
    print(f"  {s:2d} s later: {dirty()}", flush=True)

t = time.perf_counter()
with open("/work/ckpt_b.bin", "wb") as f:
    for _ in range(256):
        f.write(buf)
    t1 = time.perf_counter()
    print(f"wrote 256 MiB in {t1 - t:.2f} s; {dirty()}", flush=True)
    os.fsync(f.fileno())
    print(f"fsync took {time.perf_counter() - t1:.2f} s; {dirty()}", flush=True)
