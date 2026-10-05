# The fix: a lock makes read-add-write one indivisible step.
import sys, threading
N, T = 1_000_000, 4
counter = 0
lock = threading.Lock()

def work():
    global counter
    for _ in range(N):
        with lock:
            counter += 1

threads = [threading.Thread(target=work) for _ in range(T)]
for t in threads: t.start()
for t in threads: t.join()
print(f"GIL enabled: {sys._is_gil_enabled()}  expected {N*T}  got {counter}")
