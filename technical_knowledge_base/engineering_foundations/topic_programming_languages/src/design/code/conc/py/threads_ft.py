# cmd: python3.14t threads_ft.py
import sys, threading
print(sys.version.split()[0], "GIL enabled:", sys._is_gil_enabled())
n = 0
def work():
    global n
    for _ in range(200_000): n += 1      # read, add, write: not atomic
ts = [threading.Thread(target=work) for _ in range(4)]
for t in ts: t.start()
for t in ts: t.join()
print(n, "of", 4 * 200_000)
