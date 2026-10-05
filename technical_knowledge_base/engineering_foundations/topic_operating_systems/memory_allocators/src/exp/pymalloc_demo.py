"""CPython's small-object allocator (pymalloc), measured. Builds 2,000,000 small objects (one-element tuples of
fresh ints, so the free lists cannot absorb them), keeps every 1,000th alive and drops the rest, then drops
those too. Prints RSS and the arena counts from sys._debugmallocstats() at each step.
Run also with PYTHONMALLOC=malloc to compare with glibc's malloc doing the same work."""
import os, sys, gc, io, re, contextlib

def rss_mib():
    with open("/proc/self/statm") as f:
        return int(f.read().split()[1]) * os.sysconf("SC_PAGE_SIZE") / 2**20

def arenas():
    buf = io.StringIO()
    # _debugmallocstats writes to C stderr; redirect fd 2 to a pipe-backed temp file
    import tempfile
    with tempfile.TemporaryFile(mode="w+") as tf:
        saved = os.dup(2); os.dup2(tf.fileno(), 2)
        try:
            sys._debugmallocstats()
        finally:
            os.dup2(saved, 2); os.close(saved)
        tf.seek(0); txt = tf.read()
    m = {k: re.search(r"# arenas " + k + r"\s+=\s+([\d,]+)", txt) for k in ("allocated current", "highwater mark")}
    return {k: (v.group(1) if v else "n/a") for k, v in m.items()}

def report(phase):
    a = arenas() if os.environ.get("PYTHONMALLOC", "") != "malloc" else {"allocated current": "n/a", "highwater mark": "n/a"}
    print(f"{phase:40s} rss_mib={rss_mib():7.1f} arenas_now={a['allocated current']} arenas_highwater={a['highwater mark']}")

gc.disable()
report("start")
objs = [(i * 7 + 1000,) for i in range(2_000_000)]
report("2,000,000 tuples alive")
keep = objs[::1000]
del objs
report("kept every 1,000th (2,000 alive)")
del keep
report("dropped them all")
import ctypes
r = ctypes.CDLL("libc.so.6").malloc_trim(0)
report(f"glibc malloc_trim(0) returned {r}")
print("PYTHONMALLOC=" + os.environ.get("PYTHONMALLOC", "(default: pymalloc)"))
