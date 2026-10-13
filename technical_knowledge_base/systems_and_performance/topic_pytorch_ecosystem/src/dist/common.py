"""Shared helpers for the Distributed lab (tab t-dist). CPU only, gloo backend, launched by torchrun.

Every script imports the running example from ../model (never copies it), records what each rank did
(collectives from PyTorch's flight recorder, memory from the profiler's allocation events), and writes
one JSON per rank to inputs/, merged by rank 0.
"""
import json, os, sys, time, platform
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, "..", "model")))
OUT = os.path.join(HERE, "inputs")
os.makedirs(OUT, exist_ok=True)
SCRATCH = os.environ.get("DST_SCRATCH", "/tmp/dst_scratch")    # checkpoints and other bulky outputs, outside the repo
os.makedirs(SCRATCH, exist_ok=True)

import torch
import torch.distributed as dist
torch.set_num_threads(int(os.environ.get("DST_THREADS", "1")))  # one thread per rank: ranks share the CPU


def init(timeout_s=60):
    from datetime import timedelta
    dist.init_process_group("gloo", timeout=timedelta(seconds=timeout_s))
    return dist.get_rank(), dist.get_world_size()


def env():
    return {"torch": torch.__version__, "python": platform.python_version(), "backend": "gloo",
            "machine": "Apple M1 Pro (CPU)" if platform.machine() == "arm64" and platform.system() == "Darwin" else platform.machine(),
            "threads_per_rank": torch.get_num_threads(), "world": dist.get_world_size() if dist.is_initialized() else 1}


# ---- collectives: PyTorch's flight recorder (TORCH_FR_BUFFER_SIZE must be set before init) ----
KEEP = ("collective_seq_id", "p2p_seq_id", "is_p2p", "profiling_name", "input_sizes", "output_sizes", "input_dtypes",
        "output_dtypes", "pg_id", "time_created_ns", "state")
ESZ = {"Float": 4, "Half": 2, "BFloat16": 2, "Long": 8, "Int": 4, "Double": 8, "Byte": 1, "Bool": 1, "Char": 1}


def fr_entries():
    """All flight-recorder entries of this process so far (only the fields we keep; no stack frames)."""
    import torch._C._distributed_c10d as c
    raw = c._dump_fr_trace_json(True, True)
    d = json.loads(raw.decode() if isinstance(raw, bytes) else raw)
    out = []
    for e in d.get("entries", []):
        k = {x: e.get(x) for x in KEEP}
        k["in_bytes"] = sum(_numel(s) * ESZ.get(t, 4) for s, t in zip(e.get("input_sizes") or [], e.get("input_dtypes") or []))
        k["out_bytes"] = sum(_numel(s) * ESZ.get(t, 4) for s, t in zip(e.get("output_sizes") or [], e.get("output_dtypes") or []))
        k["process_group"] = (e.get("process_group") or [None, None])[1]
        out.append(k)
    return out, {k: v for k, v in d.get("pg_config", {}).items()}


def _numel(s):
    n = 1
    for v in s:
        n *= v
    return n


class FRWindow:
    """Collect the flight-recorder entries created between start() and stop()."""
    def start(self):
        self.n0 = len(fr_entries()[0])
        return self

    def stop(self):
        return fr_entries()[0][self.n0:]


# ---- memory: the profiler's CPU allocation events ----
def live_bytes_of(tensors):
    seen, n = set(), 0
    for t in tensors:
        if t is None:
            continue
        if hasattr(t, "to_local"):
            t = t.to_local()
        s = t.untyped_storage()
        if s.data_ptr() in seen:
            continue
        seen.add(s.data_ptr()); n += s.nbytes()
    return n


def profile_memory(fn):
    """Run fn() under the profiler and return (result, memory): live CPU bytes over time from PyTorch's memory profiler
    (torch.profiler._memory_profiler, the engine behind export_memory_timeline), which follows every tensor's storage
    from allocation to free, including tensors that existed before the window. peak_delta = highest live bytes minus
    live bytes at the start. (Summing each op event's self memory instead misplaces frees done by a parent op, such as
    AdamW's step freeing its children's temporaries, and misses FSDP2's storage.resize_(0) frees.)"""
    from torch.profiler import profile, ProfilerActivity
    from torch.profiler._memory_profiler import MemoryProfileTimeline
    with profile(activities=[ProfilerActivity.CPU], profile_memory=True, record_shapes=True, with_stack=True) as p:
        res = fn()
    times, sizes = MemoryProfileTimeline(p._memory_profile())._coalesce_timeline(torch.device("cpu"))
    ts = p.profiler.kineto_results.trace_start_ns()
    tot = [sum(s) for s in sizes]
    base = tot[0] if tot else 0
    pts = [[round((t * 1000 - ts) / 1e6, 3), v - base] for t, v in zip(times, tot)]   # times are microseconds
    peak = max((q[1] for q in pts), default=0)
    marks = {e.name[9:]: round(e.time_range.start / 1e3, 3) for e in p.events() if e.name.startswith("dst_mark:")}
    step = max(1, len(pts) // 300)
    curve = [q for i, q in enumerate(pts) if i % step == 0 or q[1] == peak] + pts[-1:]
    return res, {"peak_delta": peak, "end_delta": pts[-1][1] if pts else 0, "start_live": base, "n_points": len(pts),
                 "curve_ms_bytes": curve, "marks_ms": marks}


def dump(name, rank, d):
    d = {"env": env(), "rank": rank, **d}
    with open(os.path.join(OUT, f"{name}.rank{rank}.json"), "w") as f:
        json.dump(d, f, indent=1, default=str)


def merge(name, world):
    """Rank 0 merges the per-rank files into inputs/<name>.json and deletes them."""
    dist.barrier()
    if dist.get_rank() != 0:
        return
    ranks = []
    for r in range(world):
        p = os.path.join(OUT, f"{name}.rank{r}.json")
        ranks.append(json.load(open(p)))
        os.remove(p)
    with open(os.path.join(OUT, f"{name}.json"), "w") as f:
        json.dump({"name": name, "recorded": time.strftime("%Y-%m-%d"), "env": ranks[0]["env"], "ranks": ranks}, f, indent=1, default=str)
    print("wrote", name)


def now():
    """The flight recorder's clock (time_created_ns): CLOCK_MONOTONIC_RAW on macOS, checked against a real entry."""
    return time.clock_gettime_ns(time.CLOCK_MONOTONIC_RAW)


def mark(name):
    with torch.profiler.record_function("dst_mark:" + name):
        pass
