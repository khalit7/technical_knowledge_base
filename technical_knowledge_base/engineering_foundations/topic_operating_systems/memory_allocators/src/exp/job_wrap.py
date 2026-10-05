"""Run the root's train.py in this process and, at exit, print this (main) process's peak and final RSS
from /proc/self/status and the wall time. The allocator name comes from ALLOC_TAG."""
import atexit, os, re, runpy, sys, time
t0 = time.time()
def report():
    s = open("/proc/self/status").read()
    g = lambda k: re.search(k + r":\s+(\d+) kB", s).group(1)
    print(f"RESULT allocator={os.environ.get('ALLOC_TAG', '?')} seconds={time.time() - t0:.2f} "
          f"main_VmHWM_kib={g('VmHWM')} main_VmRSS_kib={g('VmRSS')}", flush=True)
atexit.register(report)
sys.argv = ["train.py", "--steps", "40", "--workers", "2", "--no-ckpt"]
runpy.run_path("/job/train.py", run_name="__main__")
