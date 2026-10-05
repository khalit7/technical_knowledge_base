"""Cold against warm page cache, readahead, and memory-mapped reads. Usage: pagecache.py"""
import mmap, os, resource, sys, time
sys.path.insert(0, "/exp"); import cg
P = "/work/shard.bin"; MB = 1 << 20; SIZE = 512 * MB
if not os.path.exists(P):
    with open(P, "wb") as f:
        for _ in range(SIZE // (8 * MB)):
            f.write(os.urandom(8 * MB))


def fincore():
    return os.popen(f"fincore --bytes --noheadings --output RES {P}").read().strip()


def seq_read():
    cg.io(); rb0, _ = cg.io(); t = time.perf_counter()
    fd = os.open(P, os.O_RDONLY)
    while os.read(fd, MB):
        pass
    os.close(fd)
    dt = time.perf_counter() - t; rb1, _ = cg.io()
    return f"{SIZE / MB / dt:7.0f} MiB/s ({dt:.2f} s), read from the device: {(rb1 - rb0) // MB} MiB"


cg.evict(P)
print(f"after evicting the file: {fincore()} bytes of it in the page cache")
print(f"cold sequential read: {seq_read()}")
print(f"after the read: {fincore()} bytes in the page cache")
print(f"warm sequential read: {seq_read()}")

for advice, name in [(os.POSIX_FADV_NORMAL, "default readahead"), (os.POSIX_FADV_RANDOM, "POSIX_FADV_RANDOM (readahead off)")]:
    cg.evict(P)
    fd = os.open(P, os.O_RDONLY); os.posix_fadvise(fd, 0, 0, advice)
    rb0, ri0 = cg.io(); t = time.perf_counter()
    for _ in range(16384):
        os.read(fd, 4096)  # 64 MiB in 4 KiB reads, in order
    dt = time.perf_counter() - t; rb1, ri1 = cg.io(); os.close(fd)
    print(f"64 MiB in 4 KiB sequential reads, cold, {name}: {dt:.2f} s, "
          f"{(rb1 - rb0) >> 20} MiB read from the device in {ri1 - ri0} requests")

for state in ["cold", "warm"]:
    if state == "cold":
        cg.evict(P)
    f = open(P, "rb"); m = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
    r0 = resource.getrusage(resource.RUSAGE_SELF); t = time.perf_counter()
    s = sum(m[i] for i in range(0, SIZE, 4096))  # touch one byte per page
    dt = time.perf_counter() - t; r1 = resource.getrusage(resource.RUSAGE_SELF)
    print(f"mmap, touch every page, {state}: {dt:.2f} s, major faults {r1.ru_majflt - r0.ru_majflt}, "
          f"minor faults {r1.ru_minflt - r0.ru_minflt}")
    m.close(); f.close()
