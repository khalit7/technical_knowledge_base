# Sum the token counts of 10 million (user, tokens) records in CPython; same data, list order vs shuffled.
import random, sys, time
N = 10_000_000
records = [(i % 200, 1 + i % 97) for i in range(N)]
def best_ms(f):
    best = 1e30
    for _ in range(3):
        t0 = time.perf_counter(); s = f(); best = min(best, (time.perf_counter() - t0) * 1e3)
    return best, s
def total(rs):
    s = 0
    for r in rs:
        s += r[1]
    return s
a, s1 = best_ms(lambda: total(records))
shuffled = records[:]
random.Random(7).shuffle(shuffled)
b, s2 = best_ms(lambda: total(shuffled))
print(f"Python {sys.version.split()[0]} list of tuples, in order   {a:8.1f} ms  {a*1e6/N:6.2f} ns/record  sum={s1}")
print(f"Python {sys.version.split()[0]} list of tuples, shuffled   {b:8.1f} ms  {b*1e6/N:6.2f} ns/record  sum={s2}")
