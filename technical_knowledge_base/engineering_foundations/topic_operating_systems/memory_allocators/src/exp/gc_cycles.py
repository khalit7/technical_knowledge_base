"""Reference counting against the cycle collector, measured with tracemalloc.
Each 'record' owns a 10,000-byte bytes payload. Acyclic records die the moment their last
reference goes (refcount reaches 0); records in a two-object cycle die only when the cyclic
collector runs. Run: python3 gc_cycles.py  (prints JSON)."""
import gc, json, platform, sys, tracemalloc

N, PAY = 2000, 10_000

class Rec:
    __slots__ = ("payload", "other")
    def __init__(self):
        self.payload = bytes(PAY)
        self.other = None

def kib(b):
    return round(b / 1024, 1)

def run(cyclic, gc_on):
    gc.collect()
    gc.enable() if gc_on else gc.disable()
    tracemalloc.start()
    base = tracemalloc.get_traced_memory()[0]
    peak = 0
    for _ in range(N):
        a = Rec()
        if cyclic:
            b = Rec(); a.other = b; b.other = a
        del a
        if cyclic:
            del b
        peak = max(peak, tracemalloc.get_traced_memory()[0] - base)
    after_loop = tracemalloc.get_traced_memory()[0] - base
    found = gc.collect()
    after_collect = tracemalloc.get_traced_memory()[0] - base
    tracemalloc.stop()
    gc.enable()
    return {"cyclic": cyclic, "gc_enabled": gc_on, "peak_kib": kib(peak),
            "after_loop_kib": kib(after_loop), "collect_found": found, "after_collect_kib": kib(after_collect)}

out = {"python": sys.version.split()[0], "machine": platform.machine(), "system": platform.system(),
       "threshold": gc.get_threshold(), "N": N, "payload": PAY,
       "runs": [run(False, True), run(True, True), run(True, False)]}
print(json.dumps(out, indent=1))
