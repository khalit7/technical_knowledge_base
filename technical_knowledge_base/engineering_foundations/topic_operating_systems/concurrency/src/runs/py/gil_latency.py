"""Section 8: the GIL as an operating-system lock. An "I/O" thread sleeps 2 ms 300 times and records how late it
wakes up (its sleep releases the GIL; to run again it must take the GIL back). Meanwhile 0, 1 or 2 threads run
pure-Python arithmetic and hold the GIL. Usage: python3 gil_latency.py <cpu threads> <switch interval in ms>"""
import sys, threading, time

n_cpu, interval_ms = int(sys.argv[1]), float(sys.argv[2])
sys.setswitchinterval(interval_ms / 1000)
stop = False
spins = [0] * n_cpu


def burn(i):
    x = 0
    while not stop:
        for _ in range(1000):
            x += 1
        spins[i] += 1


def io():
    late = []
    for _ in range(300):
        t = time.perf_counter()
        time.sleep(0.002)
        late.append((time.perf_counter() - t - 0.002) * 1e3)
    return sorted(late)


ts = [threading.Thread(target=burn, args=(i,)) for i in range(n_cpu)]
for t in ts:
    t.start()
t0 = time.perf_counter()
late = io()
el = time.perf_counter() - t0
stop = True
for t in ts:
    t.join()
med, p99 = late[len(late) // 2], late[int(len(late) * 0.99)]
print(f"cpu_threads {n_cpu} switch_interval_ms {interval_ms} wake_late_median_ms {med:.2f} wake_late_p99_ms {p99:.2f} "
      f"cpu_work_per_s {sum(spins) / el:.0f}")
