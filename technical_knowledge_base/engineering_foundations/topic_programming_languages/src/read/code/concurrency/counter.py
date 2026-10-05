# Four threads each add 1 to a shared counter a million times.
import sys, threading
N, T = 1_000_000, 4
counter = 0

def work():
    global counter
    for _ in range(N):
        counter += 1          # read, add, write back: three steps, not one

threads = [threading.Thread(target=work) for _ in range(T)]
for t in threads: t.start()
for t in threads: t.join()
print(f"GIL enabled: {sys._is_gil_enabled()}  expected {N*T}  got {counter}")
