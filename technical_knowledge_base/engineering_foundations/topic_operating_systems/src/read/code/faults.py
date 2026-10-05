"""(section 4) Page faults on the job's memory-mapped dataset, cold and warm, and on fresh anonymous memory.

cold: the file's pages are first evicted from the page cache with posix_fadvise(DONTNEED), so touching
      them must read the device (major faults; readahead brings neighbours in, so far fewer than pages).
warm: the pages are in the page cache; touching them only fills in page-table entries (minor faults).
anon: 64 MiB of fresh private anonymous memory (what malloc or a tensor gets): each first touch is a
      minor fault that hands out a zeroed page. anon_shared: the same with MAP_SHARED (shmem, the kind of
      memory behind /dev/shm and torch shared-memory tensors).
Faults from getrusage(RUSAGE_SELF) before/after; times from perf_counter.
"""
import os, mmap, resource, time, json, sys

path = sys.argv[1] if len(sys.argv) > 1 else "/work/data/train.bin"
PAGE = os.sysconf("SC_PAGE_SIZE")


def ru():
    r = resource.getrusage(resource.RUSAGE_SELF)
    return r.ru_minflt, r.ru_majflt


def touch_file(evict):
    fd = os.open(path, os.O_RDONLY)
    size = os.fstat(fd).st_size
    if evict:
        os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
    m = mmap.mmap(fd, size, prot=mmap.PROT_READ)
    a0, b0 = ru()
    t = time.perf_counter()
    s = 0
    for off in range(0, size, PAGE):
        s += m[off]
    dt = time.perf_counter() - t
    a1, b1 = ru()
    m.close()
    os.close(fd)
    return {"pages": (size + PAGE - 1) // PAGE, "minor": a1 - a0, "major": b1 - b0, "ms": dt * 1e3}


def touch_anon(mib=64, shared=False):
    flags = (mmap.MAP_SHARED if shared else mmap.MAP_PRIVATE) | mmap.MAP_ANONYMOUS
    m = mmap.mmap(-1, mib << 20, flags=flags)
    a0, b0 = ru()
    t = time.perf_counter()
    for off in range(0, mib << 20, PAGE):
        m[off] = 1
    dt = time.perf_counter() - t
    a1, b1 = ru()
    m.close()
    return {"pages": (mib << 20) // PAGE, "minor": a1 - a0, "major": b1 - b0, "ms": dt * 1e3}


res = {"page_size": PAGE, "file_bytes": os.path.getsize(path),
       "cold": [], "warm": [], "anon": [], "anon_shared": []}
for _ in range(3):
    res["cold"].append(touch_file(True))
    res["warm"].append(touch_file(False))
    res["anon"].append(touch_anon())
    res["anon_shared"].append(touch_anon(shared=True))
print(json.dumps(res, indent=1))
