"""Steady-state training-step time of the running example (CPU, 4 threads) for the ways of compiling on this page.
Timed: run only under the bench lock. 5 warm-up steps, then 5 trials x 20 steps; median and range per variant.
Usage: PY time_steady.py -> ../inputs/time_steady.json"""
import time, statistics
from common import *
import model as M
import torch._dynamo.config as dc, torch._functorch.config as fc
torch.set_num_threads(4)
cfg = GPTConfig()
x, y = get_batch(cfg, 1)
ORIG = M.Block.forward

def bench(name, setup):
    torch._dynamo.reset(); M.Block.forward = ORIG
    m = make_model(cfg); opt = make_optimizer(m)
    fwd, ctx = setup(m)
    def step():
        _, loss = fwd(x, y); loss.backward(); opt.step(); opt.zero_grad(set_to_none=True)
    with ctx():
        for _ in range(5): step()
        trials = []
        for _ in range(5):
            t = time.perf_counter()
            for _ in range(20): step()
            trials.append((time.perf_counter() - t) / 20 * 1000)
    M.Block.forward = ORIG
    r = {"median_ms": round(statistics.median(trials), 2), "min_ms": round(min(trials), 2), "max_ms": round(max(trials), 2), "load": round(os.getloadavg()[0], 2)}
    print(name, r, flush=True); return r

import contextlib
none = contextlib.nullcontext
def regional(m):
    for b in m.blocks: b.compile()
    return m, none
def nested(m):
    M.Block.forward = torch.compiler.nested_compile_region(ORIG)
    return torch.compile(m), none
def ca(m):
    return torch.compile(m), lambda: dc.patch(compiled_autograd=True)
VARIANTS = [("eager", lambda m: (m, none)), ("whole", lambda m: (torch.compile(m), none)), ("regional", regional), ("nested", nested),
            ("dynamic_true", lambda m: (torch.compile(m, dynamic=True), none)),
            ("budget_0.5", lambda m: (torch.compile(m), lambda: fc.patch(activation_memory_budget=0.5))),
            ("budget_0.0", lambda m: (torch.compile(m), lambda: fc.patch(activation_memory_budget=0.0)))]
R = {"torch": torch.__version__, "threads": 4, "device": "cpu", "runs": {}}
for name, setup in VARIANTS:
    try:
        R["runs"][name] = bench(name, setup)
    except Exception as e:
        R["runs"][name] = {"error": clean(type(e).__name__ + ": " + str(e).split("\n")[0])[:200]}; print(name, R["runs"][name])
# compiled autograd: the whole step (forward + backward) inside one compiled function, with and without it
def ca_bench(on):
    torch._dynamo.reset()
    m = make_model(cfg); opt = make_optimizer(m)
    @torch.compile
    def fb(x, y):
        _, loss = m(x, y); loss.backward(); return loss
    with dc.patch(compiled_autograd=on):
        for _ in range(5):
            fb(x, y); opt.step(); opt.zero_grad(set_to_none=True)
        trials = []
        for _ in range(5):
            t = time.perf_counter()
            for _ in range(20):
                fb(x, y); opt.step(); opt.zero_grad(set_to_none=True)
            trials.append((time.perf_counter() - t) / 20 * 1000)
    r = {"median_ms": round(statistics.median(trials), 2), "min_ms": round(min(trials), 2), "max_ms": round(max(trials), 2), "load": round(os.getloadavg()[0], 2)}
    print("ca", on, r, flush=True); return r
R["runs"]["fb_compiled"] = ca_bench(False)
R["runs"]["fb_compiled_autograd"] = ca_bench(True)
save("time_steady.json", R)
