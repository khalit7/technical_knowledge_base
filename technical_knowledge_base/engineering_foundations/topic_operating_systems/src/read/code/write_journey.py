"""(d) A write's journey: where are the bytes after write() returns, and after fsync()?

Writes a 64 MiB file (a checkpoint stand-in) and reads the system-wide Dirty and Writeback counters
from /proc/meminfo before, right after write() returns, and right after fsync() returns. Times each call.
Dirty is page-cache data not yet on the device: a crash (power loss, kernel panic, VM killed) loses it.
Other processes in the VM also write, so Dirty is noisy; 64 MiB is large enough to stand out.
Then the same with the write-then-fsync-then-rename pattern, timing each step.
"""
import os, time, json, sys

D = sys.argv[1] if len(sys.argv) > 1 else "/work/wj"
os.makedirs(D, exist_ok=True)
MB = 64
data = os.urandom(1 << 20) * MB


def meminfo():
    r = {}
    for line in open("/proc/meminfo"):
        k, v = line.split(":")
        if k in ("Dirty", "Writeback"):
            r[k] = int(v.split()[0])
    return r


def run(rep):
    out = {}
    path = os.path.join(D, f"ckpt{rep}.pt")
    os.sync()
    time.sleep(0.5)
    out["before"] = meminfo()
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    t = time.perf_counter()
    n = os.write(fd, data)
    out["write_ms"] = (time.perf_counter() - t) * 1e3
    out["after_write"] = meminfo()
    t = time.perf_counter()
    os.fsync(fd)
    out["fsync_ms"] = (time.perf_counter() - t) * 1e3
    out["after_fsync"] = meminfo()
    os.close(fd)
    out["bytes"] = n
    # the safe pattern, timed step by step
    final = os.path.join(D, "ckpt.pt")
    tmp = final + ".tmp"
    t0 = time.perf_counter()
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    os.write(fd, data)
    t1 = time.perf_counter()
    os.fsync(fd)
    t2 = time.perf_counter()
    os.close(fd)
    os.replace(tmp, final)
    t3 = time.perf_counter()
    dfd = os.open(D, os.O_RDONLY)
    os.fsync(dfd)
    os.close(dfd)
    t4 = time.perf_counter()
    out["safe_ms"] = {"write": (t1 - t0) * 1e3, "fsync_file": (t2 - t1) * 1e3,
                      "rename": (t3 - t2) * 1e3, "fsync_dir": (t4 - t3) * 1e3}
    os.remove(path)
    return out


res = [run(i) for i in range(5)]
print(json.dumps({"mib": MB, "fs": os.popen("stat -f -c %T " + D).read().strip(), "runs": res}, indent=1))
