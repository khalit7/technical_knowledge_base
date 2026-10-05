# The same work in CPython: sum of x*x over the even values of 10 million numbers.
import time
n = 10_000_000
x = 7
v = []
M = (1 << 64) - 1
for _ in range(n):
    x ^= (x << 13) & M; x ^= x >> 7; x ^= (x << 17) & M
    v.append(x % 1000)

def loop(v):
    s = 0
    for x in v:
        if x % 2 == 0:
            s += x * x
    return s

def gen(v):
    return sum(x * x for x in v if x % 2 == 0)

def best(f):
    b = 1e9
    for _ in range(3):
        t = time.perf_counter(); r = f(v); b = min(b, time.perf_counter() - t)
    return b, r

for name, f in [("for loop", loop), ("sum(generator)", gen)]:
    t, r = best(f)
    print(f"{name:<30} {t * 1e9 / n:6.1f} ns/element  result {r}")
