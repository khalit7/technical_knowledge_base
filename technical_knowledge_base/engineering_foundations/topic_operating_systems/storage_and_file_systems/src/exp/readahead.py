"""The readahead window, observed: read a cold file 4 KiB at a time and, after every read(), look at the
cgroup's io.stat. A read that raises the device-read counters triggered I/O; the rbytes it added is the
size of what the kernel fetched (the synchronous read plus any readahead).
usage: readahead.py <dir>"""
import os, sys, time
d = sys.argv[1]; path = os.path.join(d, "ra.bin")
SIZE = 8 << 20
def io():
    rb = ri = 0
    for l in open("/sys/fs/cgroup/io.stat"):
        for kv in l.split()[1:]:
            k, v = kv.split("=")
            if k == "rbytes": rb += int(v)
            if k == "rios": ri += int(v)
    return rb, ri
with open(path, "wb") as f:
    f.write(os.urandom(SIZE)); f.flush(); os.fsync(f.fileno())
def run(label, advice, nreads, step=4096, offsets=None):
    fd = os.open(path, os.O_RDONLY)
    os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)   # evict this file's clean pages: cold again
    if advice is not None: os.posix_fadvise(fd, 0, 0, advice)
    events = []; rb0, ri0 = io(); t = time.perf_counter()
    for i in range(nreads):
        off = offsets[i] if offsets else i * step
        b1, r1 = io()
        os.pread(fd, step, off)
        b2, r2 = io()
        if b2 > b1: events.append((i, off // 4096, (b2 - b1) // 4096, r2 - r1))
    el = time.perf_counter() - t; rb, ri = io(); os.close(fd)
    print(f"## {label}: {nreads} reads of {step} B, {el*1e3:.1f} ms, device {(rb-rb0)//4096} pages in {ri-ri0} requests")
    print("read_index file_page pages_fetched requests")
    for e in events: print(*e)
run("sequential, default readahead (read_ahead_kb 128)", None, 512)
run("sequential, POSIX_FADV_SEQUENTIAL (window doubled)", os.POSIX_FADV_SEQUENTIAL, 512)
run("sequential, POSIX_FADV_RANDOM (readahead off)", os.POSIX_FADV_RANDOM, 64)
import random; random.seed(0); offs = [random.randrange(SIZE // 4096) * 4096 for _ in range(64)]
run("random offsets, default readahead", None, 64, offsets=offs)
os.unlink(path)
