import cProfile, pstats, time
import p1_slow, p1_fast

lines = p1_slow.make_log()
assert p1_slow.per_user(lines) == p1_fast.per_user(lines)

prof = cProfile.Profile()
prof.enable()
p1_slow.per_user(lines)
prof.disable()
pstats.Stats(prof).strip_dirs().sort_stats("tottime").print_stats(6)

for mod in (p1_slow, p1_fast):
    t0 = time.perf_counter()
    for _ in range(3):
        mod.per_user(lines)
    print(f"{mod.__name__}: {(time.perf_counter() - t0) / 3 * 1000:.0f} ms per run (no profiler)")
