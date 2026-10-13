"""Shared helpers for the Making training fast experiments (torch 2.14.1, Apple M1 Pro).
The running example is imported from the root's src/model (never copied)."""
import json, os, platform, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_MODEL = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "model"))
sys.path.insert(0, ROOT_MODEL)
import torch
from model import GPTConfig, GPT, make_model, get_batch, make_optimizer, train_step, n_params  # noqa: E402

INPUTS = os.path.join(HERE, "inputs")
SCRATCH = os.environ.get("FST_SCRATCH", os.path.join(HERE, "_scratch"))   # big traces: outside the repo when set

# The larger variant used across the page: 8 blocks, d_model 512, 8 heads, context 256.
BIG = dict(n_layer=8, d_model=512, n_head=8, block_size=256, batch_size=8)


def cfg(name="small", **kw):
    base = {} if name == "small" else dict(BIG)
    base.update(kw)
    return GPTConfig(**base)


def env():
    return {"torch": torch.__version__, "python": platform.python_version(), "machine": "Apple M1 Pro",
            "threads": torch.get_num_threads(), "loadavg": [round(x, 2) for x in os.getloadavg()],
            "date": time.strftime("%Y-%m-%d")}


def dump(name, d):
    os.makedirs(INPUTS, exist_ok=True)
    with open(os.path.join(INPUTS, name), "w") as f:
        json.dump(d, f, indent=1, default=str)
    print("wrote", name)


def mem_timeline(fn, device="cpu", keep=400):
    """Run fn() under the profiler; return (result, dict) with live bytes by category over time, from PyTorch's
    memory profiler (torch.profiler._memory_profiler, the engine behind export_memory_timeline). Categories at
    2.14.1: unknown + INPUT, TEMPORARY, ACTIVATION, GRADIENT, AUTOGRAD_DETAIL, PARAMETER, OPTIMIZER_STATE."""
    from torch.profiler import profile, ProfilerActivity
    from torch.profiler._memory_profiler import MemoryProfileTimeline, _CATEGORY_TO_INDEX
    with profile(activities=[ProfilerActivity.CPU], profile_memory=True, record_shapes=True, with_stack=True) as p:
        res = fn()
    mpt = MemoryProfileTimeline(p._memory_profile())
    times, sizes = mpt._coalesce_timeline(device)
    # _coalesce_timeline returns, per time point, [0] + bytes per category in _CATEGORY_TO_INDEX order
    # (PARAMETER, OPTIMIZER_STATE, INPUT, TEMPORARY, ACTIVATION, GRADIENT, AUTOGRAD_DETAIL, None); drop the leading 0.
    order = sorted(_CATEGORY_TO_INDEX.items(), key=lambda kv: kv[1])
    names = [("UNKNOWN" if c is None else c.name) for c, _ in order]
    sizes = [s[1:] for s in sizes]
    ts = p.profiler.kineto_results.trace_start_ns()
    tot = [sum(s) for s in sizes]
    ipk = max(range(len(tot)), key=lambda i: tot[i]) if tot else 0
    marks = {}
    for e in p.events():
        if e.name.startswith("fst:"):
            marks[e.name[4:]] = [round(e.time_range.start / 1e3, 3), round(e.time_range.end / 1e3, 3)]
    step = max(1, len(times) // keep)
    pts = [i for i in range(len(times)) if i % step == 0 or i == ipk] + ([len(times) - 1] if times else [])
    pts = sorted(set(pts))
    curve = [[round((times[i] * 1000 - ts) / 1e6, 3)] + list(sizes[i]) for i in pts]
    peak_by_cat = dict(zip(names, sizes[ipk])) if tot else {}
    maxcat = {n: max(s[j] for s in sizes) for j, n in enumerate(names)} if sizes else {}
    return res, {"categories": names, "curve": curve, "peak_total": tot[ipk] if tot else 0,
                 "peak_ms": curve and round((times[ipk] * 1000 - ts) / 1e6, 3), "peak_by_category": peak_by_cat,
                 "max_by_category": maxcat, "start_total": tot[0] if tot else 0, "end_total": tot[-1] if tot else 0,
                 "n_points": len(times), "marks_ms": marks}
