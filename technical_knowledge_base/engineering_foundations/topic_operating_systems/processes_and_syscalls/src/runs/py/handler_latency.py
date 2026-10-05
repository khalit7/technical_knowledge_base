"""P1. When does a Python signal handler actually run?
Each case starts one piece of work in the main thread; a timer thread sends SIGTERM to the process
0.2 s later. CPython's C-level handler only sets a flag; the Python handler runs when the main thread
next returns to the bytecode loop. Printed: ms from kill() to the handler, and ms of work that was
still left when the signal was sent. All inputs are created before the clock starts.
Run: python handler_latency.py  (inside kb-os-lab:1, --cpus 2)"""
import os, signal, threading, time
import numpy as np
import torch
torch.set_num_threads(2)
sent = [0.0]; ran = [0.0]
def on_term(signum, frame):
    ran[0] = time.perf_counter()
signal.signal(signal.SIGTERM, on_term)
def fire():
    sent[0] = time.perf_counter(); os.kill(os.getpid(), signal.SIGTERM)
A = torch.randn(4000, 4000); B = torch.randn(4000, 4000)
X = np.random.rand(60_000_000)
def py_loop():
    t = time.perf_counter(); x = 0
    while time.perf_counter() - t < 1.0: x += 1
def sleep(): time.sleep(1.0)
def lock_wait():
    l = threading.Lock(); l.acquire(); l.acquire(timeout=1.0)
def torch_solve(): torch.linalg.solve(A, B)          # one call into ATen / LAPACK
def np_sort(): np.sort(X)                               # one call into NumPy's C sort
CASES = [("pure Python loop", py_loop), ("time.sleep(1.0)", sleep), ("Lock.acquire(timeout=1)", lock_wait),
         ("torch.linalg.solve 4000x4000 (one C++ call)", torch_solve), ("np.sort of 60M floats (one C call)", np_sort)]
for name, fn in CASES:
    for rep in range(3):
        ran[0] = 0.0
        tm = threading.Timer(0.2, fire); t0 = time.perf_counter(); tm.start(); fn(); end = time.perf_counter(); tm.join()
        time.sleep(0.05)
        print(f"{name}|rep {rep}|work {end - t0:.3f} s|handler {1000 * (ran[0] - sent[0]):.1f} ms after kill|work left at kill {1000 * (end - sent[0]):.1f} ms", flush=True)
