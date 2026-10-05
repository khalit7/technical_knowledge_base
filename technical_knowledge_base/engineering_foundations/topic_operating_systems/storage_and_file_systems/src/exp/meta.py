"""Many small files against one big file: the same 40 MiB as 10,240 files of 4 KiB or one file.
Times creating, stat-ing, reading back (warm, from the page cache), and reading back cold (each file's pages
evicted with posix_fadvise DONTNEED after an fsync), plus deleting. usage: meta.py <dir>"""
import os, sys, time
d = sys.argv[1]; N = 10240; blk = os.urandom(4096)
small = os.path.join(d, "small"); os.makedirs(small, exist_ok=True); big = os.path.join(d, "big.bin")
def T(label, fn):
    t = time.perf_counter(); r = fn(); el = time.perf_counter() - t
    print(f"{label:<44} {el*1e3:9.1f} ms" + (f"  ({r})" if r else "")); return el
def create_small():
    for i in range(N):
        with open(f"{small}/{i:05d}.bin", "wb") as f: f.write(blk)
def create_big():
    with open(big, "wb") as f:
        for i in range(N): f.write(blk)
def stat_small():
    for i in range(N): os.stat(f"{small}/{i:05d}.bin")
def read_small():
    n = 0
    for i in range(N):
        with open(f"{small}/{i:05d}.bin", "rb") as f: n += len(f.read())
    return f"{n >> 20} MiB"
def read_big():
    with open(big, "rb") as f:
        n = 0
        while True:
            b = f.read(1 << 20)
            if not b: break
            n += len(b)
    return f"{n >> 20} MiB"
def evict(paths):
    for p in paths:
        fd = os.open(p, os.O_RDONLY); os.fsync(fd); os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED); os.close(fd)
print("### 40 MiB as 10,240 files of 4 KiB, or as one file (ext4, /data)")
T("create + write + close 10,240 small files", create_small)
T("write one 40 MiB file", create_big)
T("stat 10,240 files (dentry and inode caches warm)", stat_small)
T("ls: list the directory (getdents64)", lambda: f"{len(os.listdir(small))} names")
T("read 10,240 small files, warm", read_small)
T("read the big file, warm", read_big)
evict([f"{small}/{i:05d}.bin" for i in range(N)] + [big])
T("read 10,240 small files, data cold", read_small)
T("read the big file, cold", read_big)
T("delete 10,240 small files", lambda: [os.unlink(f"{small}/{i:05d}.bin") for i in range(N)] and None)
T("delete the big file", lambda: os.unlink(big))
