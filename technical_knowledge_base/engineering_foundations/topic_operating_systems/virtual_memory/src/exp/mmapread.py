"""Reading training rows from a file: read() into a buffer against mmap, cold and warm; then loading weights
with and without a memory map (torch.load, torch.load(mmap=True), safetensors).
File: 256 MiB of float32 rows of 257 values (the root job's row format: 256 features + 1 label).
"Cold" = the file's pages evicted from the page cache with posix_fadvise(POSIX_FADV_DONTNEED), which any
process may do for clean pages (no drop_caches needed). On Docker Desktop the VM's disk is itself cached by
macOS, so "cold" here is a fast cold: a real NVMe or network disk is slower.
Usage: python mmapread.py <dir>
"""
import mmap
import os
import resource
import sys
import time

import numpy as np

D = sys.argv[1] if len(sys.argv) > 1 else "/work"
ROW = 257 * 4
NROWS = (256 << 20) // ROW
PATH = os.path.join(D, "rows.bin")
K = 20000  # rows read per run
rng = np.random.default_rng(0)
IDX = rng.integers(0, NROWS, K)


def faults():
    r = resource.getrusage(resource.RUSAGE_SELF)
    return r.ru_minflt, r.ru_majflt


def io_read_kb():
    with open("/proc/self/io") as f:
        for line in f:
            if line.startswith("read_bytes:"):
                return int(line.split()[1]) >> 10
    return -1


def rss_kb():
    with open("/proc/self/status") as f:
        for line in f:
            if line.startswith("VmRSS:"):
                return int(line.split()[1])


def evict(path):
    fd = os.open(path, os.O_RDONLY)
    os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
    os.close(fd)


def write_file():
    if not os.path.exists(PATH):
        a = np.arange(NROWS * 257, dtype=np.float32)
        a.tofile(PATH)
        del a
        fd = os.open(PATH, os.O_RDONLY); os.fsync(fd); os.close(fd)


def by_pread():
    fd = os.open(PATH, os.O_RDONLY)
    s = 0.0
    for i in IDX:
        b = os.pread(fd, ROW, int(i) * ROW)
        s += np.frombuffer(b, dtype=np.float32)[0]
    os.close(fd)
    return s


def by_mmap():
    with open(PATH, "rb") as f:
        mm = mmap.mmap(f.fileno(), 0, prot=mmap.PROT_READ)
        arr = np.frombuffer(mm, dtype=np.float32).reshape(-1, 257)
        s = 0.0
        for i in IDX:
            s += arr[i, 0]
        del arr
        mm.close()
    return s


def by_mmap_random():
    with open(PATH, "rb") as f:
        mm = mmap.mmap(f.fileno(), 0, prot=mmap.PROT_READ)
        mm.madvise(mmap.MADV_RANDOM)  # no read-around on faults: read only the page that faulted
        arr = np.frombuffer(mm, dtype=np.float32).reshape(-1, 257)
        s = 0.0
        for i in IDX:
            s += arr[i, 0]
        del arr
        mm.close()
    return s


def bench(name, fn):
    for state in ("cold", "warm"):
        if state == "cold":
            evict(PATH)
        f0 = faults(); io0 = io_read_kb(); t = time.perf_counter()
        fn()
        dt = time.perf_counter() - t; f1 = faults(); io1 = io_read_kb()
        print(f"rows {name:11s} {state} rows {K} us_per_row {dt / K * 1e6:.2f} minflt {f1[0] - f0[0]} majflt {f1[1] - f0[1]} "
              f"storage_read_mib {(io1 - io0) / 1024:.1f}", flush=True)


def weights():
    import torch
    from safetensors import safe_open
    from safetensors.torch import save_file, load_file
    torch.manual_seed(0)
    sd = {f"layer{i}.weight": torch.randn(4096, 2048) for i in range(8)}  # 8 x 32 MiB = 256 MiB
    pt, st = os.path.join(D, "w.pt"), os.path.join(D, "w.safetensors")
    torch.save(sd, pt); save_file(sd, st)
    del sd
    for p in (pt, st):
        fd = os.open(p, os.O_RDONLY); os.fsync(fd); os.close(fd)
    cases = [("torch.load", lambda: torch.load(pt)),
             ("torch.load(mmap=True)", lambda: torch.load(pt, mmap=True)),
             ("safetensors load_file", lambda: load_file(st)),
             ("safetensors safe_open, 1 tensor", None)]
    for name, fn in cases:
        evict(pt); evict(st)
        r0 = rss_kb(); f0 = faults(); t = time.perf_counter()
        if fn is None:
            with safe_open(st, framework="pt") as f:
                one = f.get_tensor("layer3.weight")
            sd = {"layer3.weight": one}
        else:
            sd = fn()
        dt = time.perf_counter() - t; r1 = rss_kb(); f1 = faults()
        t2 = time.perf_counter(); tot = sum(float(v.sum()) for v in sd.values()); dt2 = time.perf_counter() - t2
        r2 = rss_kb()
        print(f"load {name:32s} return_ms {dt * 1e3:8.1f} rss_after_return_mib {(r1 - r0) / 1024:6.1f} "
              f"majflt {f1[1] - f0[1]} first_full_read_ms {dt2 * 1e3:7.1f} rss_after_reading_all_mib {(r2 - r0) / 1024:6.1f}", flush=True)
        del sd


if __name__ == "__main__":
    write_file()
    print(f"file {PATH.replace(D, '<dir>')} bytes {os.path.getsize(PATH)} row_bytes {ROW} rows {NROWS}")
    for _ in range(2):
        bench("pread", by_pread)
        bench("mmap", by_mmap)
        bench("mmap_random", by_mmap_random)
    weights()
