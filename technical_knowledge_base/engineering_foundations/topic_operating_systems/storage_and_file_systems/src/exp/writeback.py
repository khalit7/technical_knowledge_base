"""Watch dirty pages and writeback in this container's memory cgroup while a file is written.
usage: writeback.py <scenario> <dir>
  small  : write 16 MiB, then watch 40 s (the 30 s expiry)
  mid    : write 256 MiB, then watch 40 s (the root's Debug lab case)
  big    : write 1536 MiB as fast as possible in 1 MiB chunks (dirty limits and throttling)
  fsync  : write 256 MiB, then fsync
  primed : first write and fsync 1 GiB (so this container's writeback domain has a recent share of the
           device's writeout), then write 16 MiB and watch 40 s
Samples every 100 ms: t_s, file_dirty MiB, file_writeback MiB, device bytes written (io.stat wbytes) MiB,
MiB the program has written so far, and the writer's kernel wait channel."""
import os, sys, threading, time
sc, d = sys.argv[1], sys.argv[2]
CG = "/sys/fs/cgroup/"
def stat():
    m = dict(l.split() for l in open(CG + "memory.stat"))
    wb = 0
    for l in open(CG + "io.stat"):
        for kv in l.split()[1:]:
            k, v = kv.split("=")
            if k == "wbytes": wb += int(v)
    return int(m["file_dirty"]) / 2**20, int(m["file_writeback"]) / 2**20, wb / 2**20
done = [0]; stop = [False]; rows = []; t0 = time.monotonic(); tid = [None]
def wchan():
    try: return open(f"/proc/self/task/{tid[0]}/wchan").read().strip() or "-"
    except Exception: return "?"
def sampler():
    while not stop[0]:
        dirty, wbk, dev = stat()
        rows.append((time.monotonic() - t0, dirty, wbk, dev, done[0] / 2**20, wchan()))
        time.sleep(0.1)
if sc == "primed":
    with open(os.path.join(d, "prime.bin"), "wb") as f:
        for _ in range(1024): f.write(b"\x01" * (1 << 20))
        f.flush(); os.fsync(f.fileno())
    os.unlink(os.path.join(d, "prime.bin"))
base = stat()[2]
path = os.path.join(d, f"wb_{sc}.bin")
tid[0] = threading.get_native_id()
th = threading.Thread(target=sampler, daemon=True); th.start()
size = {"primed": 16, "small": 16, "mid": 256, "big": 1536, "fsync": 256}[sc] << 20
buf = b"\xab" * (1 << 20)
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
tw = time.monotonic()
while done[0] < size:
    os.write(fd, buf); done[0] += len(buf)
tw = time.monotonic() - tw
ev = f"wrote {size >> 20} MiB in {tw:.2f} s"
if sc == "fsync":
    tf = time.monotonic(); os.fsync(fd); ev += f"; fsync took {time.monotonic() - tf:.2f} s"
    time.sleep(1)
else:
    time.sleep(40 if sc in ("small", "mid", "primed") else 8)
stop[0] = True; th.join(); os.close(fd)
print(f"scenario {sc}: {ev}; device bytes before start {base:.0f} MiB (subtracted)")
print("t_s dirty_mib writeback_mib device_written_mib program_written_mib writer_wchan")
for r in rows:
    print(f"{r[0]:.2f} {r[1]:.1f} {r[2]:.1f} {r[3] - base:.1f} {r[4]:.0f} {r[5]}")
os.unlink(path)
