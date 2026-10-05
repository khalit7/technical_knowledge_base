"""Long-run memory growth in a data-loader-like process, measured per allocator.

Four threads "decode" samples into NumPy arrays whose sizes vary log-uniformly between 64 KiB and 8 MiB
(fixed seed), the way decoded images or variable-length token batches do; a prefetch window keeps the last
8 arrays alive and drops the rest. For every sample the loader also keeps a small record forever (a 600-byte
bytes object, standing in for per-sample metadata, a cache entry or a log line), so live memory grows slowly
and steadily: about 600 bytes per sample. RSS is sampled every 250 samples.
Usage: python loader_growth.py [samples]   (run under LD_PRELOAD=... or MALLOC_* env vars to compare)"""
import os, sys, random, threading, collections, time
import numpy as np

def rss_mib():
    with open("/proc/self/statm") as f:
        return int(f.read().split()[1]) * os.sysconf("SC_PAGE_SIZE") / 2**20

N = int(sys.argv[1]) if len(sys.argv) > 1 else 40000
rng = random.Random(0)
sizes = [int(2 ** rng.uniform(16, 23)) for _ in range(N)]          # 64 KiB .. 8 MiB, log-uniform
window = collections.deque()
kept = []                                                          # small records kept for the whole run
lock = threading.Lock()
live = [0, 0]                                                      # bytes in the window, bytes in kept records
nxt = [0]
samples = []

def worker():
    while True:
        with lock:
            i = nxt[0]
            if i >= N:
                return
            nxt[0] += 1
        a = np.empty(sizes[i], dtype=np.uint8)
        a.fill(i & 255)                                             # touch every page, as decoding would
        rec = bytes([i & 255]) * 600                                # the small record, made after the big buffer
        with lock:
            kept.append(rec); live[1] += 600
            window.append(a); live[0] += a.nbytes
            while len(window) > 8:
                live[0] -= window.popleft().nbytes
            if i % 250 == 0:
                samples.append((i, round(rss_mib(), 1), round((live[0] + live[1]) / 2**20, 1)))

t0 = time.time()
ts = [threading.Thread(target=worker) for _ in range(4)]
[t.start() for t in ts]; [t.join() for t in ts]
el = time.time() - t0
window.clear(); live[0] = 0
tag = os.environ.get("ALLOC_TAG", "glibc")
print(f"allocator={tag} samples={N} seconds={el:.2f} rss_mib_window_dropped={rss_mib():.1f} kept_mib={live[1]/2**20:.1f}")
for s in samples:
    print(f"sample={s[0]} rss_mib={s[1]} live_mib={s[2]}")
