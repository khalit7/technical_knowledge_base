"""Latency of the in-machine cache layers, measured from Python on the same laptop (median of many repetitions):
a dict lookup and a functools.lru_cache hit (in-process caches), and an 8 KiB pread from a file the operating system
already holds in its page cache (warm: read once before timing). Writes inputs/layers.json.
"""
import os, sys, time, statistics, functools
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import S, save, machine


def per_call_ns(f, n=200_000, reps=7):
    out = []
    for _ in range(reps):
        t = time.perf_counter_ns()
        for _ in range(n): f()
        out.append((time.perf_counter_ns() - t) / n)
    return statistics.median(out)


empty = per_call_ns(lambda: None)
d = {f'chat:{i}': i for i in range(100_000)}
dict_ns = per_call_ns(lambda: d['chat:4242']) - empty


@functools.lru_cache(maxsize=10_000)
def load(k):
    return k * 2


load(42)
lru_ns = per_call_ns(lambda: load(42)) - empty
path = os.path.join(S, 'pagecache_test.bin')
with open(path, 'wb') as f:
    f.write(os.urandom(64 * 2**20))
fd = os.open(path, os.O_RDONLY)
for off in range(0, 64 * 2**20, 8192): os.pread(fd, 8192, off)      # warm the page cache
import random
random.seed(1); offs = [random.randrange(0, 64 * 2**20 // 8192) * 8192 for _ in range(1000)]
it = iter(offs * 400)
pread_ns = per_call_ns(lambda: os.pread(fd, 8192, next(it)), n=50_000) - empty
os.close(fd); os.remove(path)
save('layers.json', {**machine(), 'python_call_overhead_ns': empty, 'dict_get_ns': dict_ns, 'lru_cache_hit_ns': lru_ns,
                     'pagecache_pread_8k_ns': pread_ns,
                     'note': 'Python adds its own interpreter overhead (subtracted: an empty lambda call); a C or Go program is faster'})
print(dict_ns, lru_ns, pread_ns)
