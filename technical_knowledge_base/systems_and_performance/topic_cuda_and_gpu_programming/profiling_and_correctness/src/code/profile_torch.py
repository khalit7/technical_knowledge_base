"""torch.profiler on a small training step, run here on the CPU and with the model on the M1 Pro GPU (MPS).

PyTorch 2.14.1 has no MPS profiler activity (ProfilerActivity: CPU, XPU, MTIA, CUDA, HPU, PrivateUse1),
so the MPS run records CPU-side events only: exactly what you would see on CUDA if you forgot
ProfilerActivity.CUDA. Writes out/torch_profiler.json (tables and a trimmed trace of one step)
and out/trace_cpu_step.json (the raw Chrome trace of the profiled steps, trimmed of metadata).
Usage: uv run --no-project --with torch==2.14.1 --with numpy python code/profile_torch.py
"""
import json, os, time
import torch
import torch.nn as nn
from torch.profiler import profile, record_function, ProfilerActivity, schedule

torch.set_num_threads(2)
torch.manual_seed(0)
HERE = os.path.dirname(os.path.abspath(__file__))
OUTD = os.path.join(os.path.dirname(HERE), "out")


class Block(nn.Module):
    def __init__(self, d):
        super().__init__()
        self.ln = nn.LayerNorm(d)
        self.up = nn.Linear(d, 4 * d)
        self.down = nn.Linear(4 * d, d)

    def forward(self, x):
        return x + self.down(torch.nn.functional.gelu(self.up(self.ln(x))))


def make(dev):
    m = nn.Sequential(Block(512), Block(512), nn.Linear(512, 1000)).to(dev)
    opt = torch.optim.AdamW(m.parameters(), lr=1e-3)
    x = torch.randn(256, 512, device=dev)
    y = torch.randint(0, 1000, (256,), device=dev)
    return m, opt, x, y


def step(m, opt, x, y):
    with record_function("forward"):
        loss = torch.nn.functional.cross_entropy(m(x), y)
    with record_function("backward"):
        loss.backward()
    with record_function("optimizer"):
        opt.step(); opt.zero_grad(set_to_none=True)
    return loss


def table(prof, sort):
    return prof.key_averages().table(sort_by=sort, row_limit=14, max_name_column_width=34)


def rows(prof, n=14):
    ka = sorted(prof.key_averages(), key=lambda e: -e.self_cpu_time_total)[:n]
    return [{"name": e.key, "calls": e.count, "self_cpu_us": round(e.self_cpu_time_total, 1),
             "cpu_total_us": round(e.cpu_time_total, 1), "flops": int(e.flops or 0)} for e in ka]


def run(dev):
    m, opt, x, y = make(dev)
    sync = (lambda: torch.mps.synchronize()) if dev == "mps" else (lambda: None)
    traces = []
    sched = schedule(wait=1, warmup=1, active=2, repeat=1)

    def ready(p):
        path = os.path.join(OUTD, "_trace_%s.json" % dev)
        p.export_chrome_trace(path)
        traces.append(path)

    walls = []
    with profile(activities=[ProfilerActivity.CPU], schedule=sched, on_trace_ready=ready,
                 record_shapes=True, with_flops=True) as prof:
        for i in range(5):
            t0 = time.perf_counter()
            step(m, opt, x, y); sync()
            walls.append((time.perf_counter() - t0) * 1e3)
            prof.step()
    res = {"device": dev, "wall_ms_per_step": [round(w, 3) for w in walls],
           "table_self_cpu": table(prof, "self_cpu_time_total"), "rows": rows(prof)}
    return res, traces[0]


def trim(path, keep_steps=1):
    """Keep complete ('X') events of the first profiled step, with only the fields the page draws."""
    t = json.load(open(path))
    ev = [e for e in t["traceEvents"] if e.get("ph") == "X"]
    steps = sorted([e for e in ev if e["name"].startswith("ProfilerStep#")], key=lambda e: e["ts"])
    s = steps[0]
    t0, t1 = s["ts"], s["ts"] + s["dur"]
    out = []
    for e in ev:
        if e["ts"] >= t0 and e["ts"] + e.get("dur", 0) <= t1 + 1:
            a = e.get("args", {})
            out.append({"name": e["name"], "ts": round(e["ts"] - t0, 3), "dur": round(e.get("dur", 0), 3),
                        "tid": str(e.get("tid")), "cat": e.get("cat"),
                        "shapes": a.get("Input Dims"), "flops": a.get("flops")})
    out.sort(key=lambda e: (e["ts"], -e["dur"]))
    return {"step": s["name"], "dur_us": s["dur"], "events": out,
            "event_count_all_steps": len(ev), "trace_bytes": os.path.getsize(path)}


def main():
    res = {"torch": torch.__version__, "activities": list(ProfilerActivity.__members__)}
    for dev in ("cpu", "mps"):
        if dev == "mps" and not torch.backends.mps.is_available():
            continue
        r, path = run(dev)
        r["trace"] = trim(path)
        os.remove(path)
        res[dev] = r
        print(dev, "steps ms", r["wall_ms_per_step"], "events", len(r["trace"]["events"]), flush=True)
    json.dump(res, open(os.path.join(OUTD, "torch_profiler.json"), "w"), indent=1)
    print("wrote out/torch_profiler.json")


if __name__ == "__main__":
    main()
