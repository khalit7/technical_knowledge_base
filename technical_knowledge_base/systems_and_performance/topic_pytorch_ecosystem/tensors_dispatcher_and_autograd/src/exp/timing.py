"""The few timed runs on this page (hold the bench lock; records load average).  python timing.py > ../inputs/timing.json

1. Per-call overhead of one tiny add in each dispatcher situation (torch.utils.benchmark, 3 trials).
2. Running-example forward+backward: plain, anomaly mode, checkpoint non-reentrant, checkpoint reentrant (CPU, 4 threads).
3. The same on MPS: plain against saved tensors offloaded to the CPU (save_on_cpu).
4. A 3x3 convolution in NCHW against channels_last on the CPU.
"""
import json
import os
import statistics
import sys
import time
import warnings

import torch
import torch.utils.benchmark as tb
from torch.utils._python_dispatch import TorchDispatchMode
from torch.utils.checkpoint import checkpoint

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "model"))
from model import GPTConfig, make_model, get_batch  # noqa: E402

torch.set_num_threads(4)
out = {"torch": torch.__version__, "machine": "Apple M1 Pro", "threads": 4, "load_before": os.getloadavg()}


class Passthrough(TorchDispatchMode):
    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        return func(*args, **(kwargs or {}))


x = torch.ones(1)
w = torch.ones(1, requires_grad=True)
cases = {
    "plain tensor": ("torch.add(x, x)", "", {"x": x}),
    "requires_grad input (records AddBackward0)": ("torch.add(w, w)", "", {"w": w}),
    "no_grad": ("with torch.no_grad(): torch.add(w, w)", "", {"w": w}),
    "inference_mode": ("with torch.inference_mode(): torch.add(x, x)", "", {"x": x}),
    "inside a TorchDispatchMode": ("with m: torch.add(x, x)", "", {"x": x, "m": Passthrough()}),
    "autocast CPU bf16 (add is a fallthrough)": ("with torch.autocast('cpu', dtype=torch.bfloat16): torch.add(x, x)", "", {"x": x}),
}
ov = {}
for name, (stmt, setup, g) in cases.items():
    g = dict(g)
    g["torch"] = torch
    meds = []
    for _ in range(3):
        m = tb.Timer(stmt=stmt, setup=setup, globals=g).blocked_autorange(min_run_time=0.4)
        meds.append(m.median * 1e6)
    ov[name] = {"us": [round(v, 3) for v in meds], "median_us": round(statistics.median(meds), 3)}
out["call_overhead"] = ov

cfg = GPTConfig()
xb, yb = get_batch(cfg, 0)


def fwdbwd(kind, device="cpu"):
    torch.manual_seed(0)
    m = make_model(cfg, device)
    xd, yd = xb.to(device), yb.to(device)

    def step():
        if kind == "anomaly":
            with torch.autograd.detect_anomaly():
                _, l = m(xd, yd)
                l.backward()
        elif kind in ("non-reentrant", "reentrant"):
            h = m.tok(xd) + m.pos(torch.arange(cfg.block_size, device=device))
            for b in m.blocks:
                h = checkpoint(b, h, use_reentrant=(kind == "reentrant"))
            lg = m.head(m.ln_f(h))
            torch.nn.functional.cross_entropy(lg.view(-1, lg.size(-1)), yd.view(-1)).backward()
        elif kind == "offload":
            with torch.autograd.graph.save_on_cpu(pin_memory=False):
                _, l = m(xd, yd)
            l.backward()
        else:
            _, l = m(xd, yd)
            l.backward()
        for p in m.parameters():
            p.grad = None
        if device == "mps":
            torch.mps.synchronize()

    for _ in range(3):
        step()
    trials = []
    for _ in range(3):
        t0 = time.perf_counter()
        for _ in range(10):
            step()
        trials.append((time.perf_counter() - t0) / 10 * 1e3)
    return {"ms": [round(t, 2) for t in trials], "median_ms": round(statistics.median(trials), 2)}


st = {}
for k in ["plain", "anomaly", "non-reentrant", "reentrant"]:
    st[k] = fwdbwd(k)
out["cpu_fwd_bwd"] = st
if torch.backends.mps.is_available():
    out["mps_fwd_bwd"] = {k: fwdbwd(k, "mps") for k in ["plain", "offload"]}

conv = torch.nn.Conv2d(64, 64, 3, padding=1)
inp = torch.randn(8, 64, 56, 56)
cv = {}
with torch.no_grad():
    for name, (c, i) in {"NCHW (contiguous)": (conv, inp),
                         "channels_last": (conv.to(memory_format=torch.channels_last), inp.contiguous(memory_format=torch.channels_last))}.items():
        meds = [tb.Timer(stmt="c(i)", globals={"c": c, "i": i}).blocked_autorange(min_run_time=0.5).median * 1e3 for _ in range(3)]
        cv[name] = {"ms": [round(v, 3) for v in meds], "median_ms": round(statistics.median(meds), 3)}
out["conv"] = cv
out["load_after"] = os.getloadavg()
print(json.dumps(out, indent=1))
