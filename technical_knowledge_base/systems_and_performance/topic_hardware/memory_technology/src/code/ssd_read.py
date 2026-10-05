"""Read bandwidth of this laptop's internal SSD with the page cache bypassed (F_NOCACHE), the bottom tier
of an offload hierarchy. Writes one 4 GiB file of random bytes (also with F_NOCACHE, so the reads are not served
from pages left in memory by the write), then per run: sequential 8 MiB reads of the
whole file, and random reads of 4 KiB, 64 KiB and 1 MiB blocks. Usage: python ssd_read.py DIR OUT.json"""
import fcntl, json, os, sys, time, random

F_NOCACHE = 48  # macOS fcntl: turn data caching off for this file descriptor
d, out = sys.argv[1], sys.argv[2]
path = os.path.join(d, "ssd_test.bin")
SIZE = 4 << 30
if not os.path.exists(path) or os.path.getsize(path) != SIZE:
    with open(path, "wb") as f:
        fcntl.fcntl(f.fileno(), F_NOCACHE, 1)  # do not leave the written pages in the cache
        chunk = os.urandom(64 << 20)
        for i in range(SIZE // len(chunk)):
            f.write(chunk[: -8] + i.to_bytes(8, "little"))
        f.flush(); os.fsync(f.fileno())

res = {"file_bytes": SIZE, "runs": []}
rng = random.Random(4)
for run in range(3):
    r = {"load": os.getloadavg()[0]}
    fd = os.open(path, os.O_RDONLY); fcntl.fcntl(fd, F_NOCACHE, 1)
    buf = bytearray(8 << 20); mv = memoryview(buf)
    t0 = time.perf_counter(); n = 0
    while True:
        k = os.readv(fd, [mv])
        if k <= 0:
            break
        n += k
    r["seq_GBs"] = n / (time.perf_counter() - t0) / 1e9
    for bs, count in ((4096, 4000), (65536, 2000), (1 << 20, 400)):
        b = bytearray(bs); t0 = time.perf_counter()
        for _ in range(count):
            off = rng.randrange(0, SIZE // bs) * bs
            os.preadv(fd, [b], off)
        dt = time.perf_counter() - t0
        r[f"rand_{bs}_GBs"] = bs * count / dt / 1e9
        r[f"rand_{bs}_us"] = dt / count * 1e6
    os.close(fd)
    res["runs"].append(r)
    print(run, {k: round(v, 3) for k, v in r.items()}, flush=True)
    time.sleep(5)
json.dump(res, open(out, "w"), indent=1)
os.remove(path)
