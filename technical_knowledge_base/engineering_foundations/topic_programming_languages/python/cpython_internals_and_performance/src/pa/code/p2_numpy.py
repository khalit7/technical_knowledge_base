"""Softmax-style work (sum of exp(x - max)) on n floats: a Python loop, a generator with
math.exp, and NumPy, plus the cost of converting the list to an array. Median of timeit repeats, in microseconds per call."""
import math, os, statistics, sys, timeit
import numpy as np

def py_loop(xs):
    m = max(xs)
    s = 0.0
    for x in xs:
        s += math.exp(x - m)
    return s

def py_builtin(xs):
    m = max(xs)
    return math.fsum(map(math.exp, (x - m for x in xs)))

def np_vec(a):
    return np.exp(a - a.max()).sum()       # three passes in C over a contiguous buffer

def us(f, arg):
    t = timeit.Timer(lambda: f(arg))
    n, _ = t.autorange()
    return statistics.median(t.repeat(5, n)) / n * 1e6

print(f"Python {sys.version.split()[0]}, NumPy {np.__version__}, load {os.getloadavg()[0]:.2f}")
print(f"{'n':>9} {'loop':>11} {'map+fsum':>11} {'numpy':>11} {'np.array(list)':>15}  numpy speed-up over loop")
for n in (10, 1_000, 100_000, 1_000_000):
    xs = [((i * 7919) % 1000) / 100 for i in range(n)]
    a = np.array(xs)
    assert abs(py_loop(xs) - np_vec(a)) < 1e-6 * py_loop(xs)
    t1, t2, t3, t4 = us(py_loop, xs), us(py_builtin, xs), us(np_vec, a), us(np.array, xs)
    print(f"{n:>9,} {t1:>9.1f}us {t2:>9.1f}us {t3:>9.1f}us {t4:>13.1f}us  {t1 / t3:6.1f}x")
