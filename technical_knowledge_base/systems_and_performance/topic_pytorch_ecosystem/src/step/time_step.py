"""Timing for the Inside one step tab (run under the shared bench lock).

    python time_step.py > inputs/timing.json

- Phase times (forward, backward, optimizer) for the plain step and the checkpointed step,
  on CPU (4 threads) and MPS (torch.mps.synchronize() after each phase), 5 trials of 20 steps
  after 5 warm-up steps; median per step and the spread across trials.
- Forward only: grad mode on, torch.no_grad(), torch.inference_mode().
- One profiled step on CPU: self CPU time per ATen op, grouped by phase.
"""
import json, os, statistics, sys, time
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "model"))
from model import GPTConfig, make_model, get_batch, make_optimizer  # noqa: E402

torch.set_num_threads(4)
TRIALS, STEPS, WARM = 5, 20, 5


def sync(dev):
    if dev == "mps":
        torch.mps.synchronize()


def phases(dev, ckpt):
    cfg = GPTConfig(checkpoint=ckpt)
    m = make_model(cfg, dev)
    opt = make_optimizer(m)
    batches = [get_batch(cfg, s, dev) for s in range(STEPS)]
    trials = []
    for tr in range(TRIALS + 1):
        tf = tb = to = 0.0
        n = WARM if tr == 0 else STEPS
        for s in range(n):
            x, y = batches[s % STEPS]
            sync(dev); t0 = time.perf_counter()
            _, loss = m(x, y); sync(dev); t1 = time.perf_counter()
            loss.backward(); sync(dev); t2 = time.perf_counter()
            opt.step(); opt.zero_grad(set_to_none=True); sync(dev); t3 = time.perf_counter()
            tf += t1 - t0; tb += t2 - t1; to += t3 - t2
        if tr:
            trials.append([1e3 * tf / n, 1e3 * tb / n, 1e3 * to / n])
    res = {}
    for i, k in enumerate(["fwd", "bwd", "opt"]):
        v = [t[i] for t in trials]
        res[k] = {"median_ms": round(statistics.median(v), 3), "min_ms": round(min(v), 3), "max_ms": round(max(v), 3)}
    tot = [sum(t) for t in trials]
    res["step"] = {"median_ms": round(statistics.median(tot), 3), "min_ms": round(min(tot), 3), "max_ms": round(max(tot), 3)}
    return res


def fwd_modes(dev):
    cfg = GPTConfig()
    m = make_model(cfg, dev)
    x, y = get_batch(cfg, 1, dev)
    res = {}
    for mode in ["grad", "no_grad", "inference_mode"]:
        ctx = {"grad": torch.enable_grad, "no_grad": torch.no_grad, "inference_mode": torch.inference_mode}[mode]
        v = []
        for tr in range(TRIALS + 1):
            n = WARM if tr == 0 else STEPS
            sync(dev); t0 = time.perf_counter()
            for _ in range(n):
                with ctx():
                    _, loss = m(x, y)
                del loss
            sync(dev)
            if tr:
                v.append(1e3 * (time.perf_counter() - t0) / n)
        res[mode] = {"median_ms": round(statistics.median(v), 3), "min_ms": round(min(v), 3), "max_ms": round(max(v), 3)}
    return res


def profile_cpu():
    from torch.profiler import profile, record_function, ProfilerActivity
    cfg = GPTConfig()
    m = make_model(cfg)
    opt = make_optimizer(m)
    for s in range(3):
        x, y = get_batch(cfg, s)
        _, l = m(x, y); l.backward(); opt.step(); opt.zero_grad(set_to_none=True)
    x, y = get_batch(cfg, 1)
    with profile(activities=[ProfilerActivity.CPU]) as prof:
        with record_function("PHASE_fwd"):
            _, loss = m(x, y)
        with record_function("PHASE_bwd"):
            loss.backward()
        with record_function("PHASE_opt"):
            opt.step(); opt.zero_grad(set_to_none=True)
    ev = prof.events()
    spans = {e.name[6:]: (e.time_range.start, e.time_range.end) for e in ev if e.name.startswith("PHASE_")}
    out = {}
    for ph, (a, b) in spans.items():
        agg = {}
        for e in ev:
            if not e.name.startswith("aten::"):
                continue
            # backward ops run on the autograd engine thread; attribute by time window
            if a <= e.time_range.start <= b:
                d = agg.setdefault(e.name[6:], [0, 0.0])
                d[0] += 1
                d[1] += e.self_cpu_time_total
        tot = sum(v[1] for v in agg.values())
        top = sorted(agg.items(), key=lambda kv: -kv[1][1])[:8]
        out[ph] = {"wall_us": round(b - a, 1), "aten_events": sum(v[0] for v in agg.values()),
                   "self_cpu_us": round(tot, 1),
                   "top": [[k, v[0], round(v[1], 1)] for k, v in top]}
    return out


def opt_impls(dev):
    """AdamW implementation: for-loop (the default here), foreach, fused. Optimizer phase only."""
    cfg = GPTConfig()
    res = {}
    for impl in ["forloop", "foreach", "fused"]:
        m = make_model(cfg, dev)
        kw = {"forloop": {"foreach": False}, "foreach": {"foreach": True}, "fused": {"fused": True}}[impl]
        decay = [p for p in m.parameters() if p.dim() >= 2]
        nod = [p for p in m.parameters() if p.dim() < 2]
        try:
            opt = torch.optim.AdamW([{"params": decay, "weight_decay": 0.1}, {"params": nod, "weight_decay": 0.0}],
                                    lr=6e-4, betas=(0.9, 0.95), **kw)
        except Exception as e:
            res[impl] = {"error": str(e).split(chr(10))[0]}
            continue
        x, y = get_batch(cfg, 1, dev)
        v = []
        for tr in range(TRIALS + 1):
            n = WARM if tr == 0 else STEPS
            t = 0.0
            for _ in range(n):
                _, l = m(x, y); l.backward(); sync(dev)
                t0 = time.perf_counter(); opt.step(); opt.zero_grad(set_to_none=True); sync(dev)
                t += time.perf_counter() - t0
            if tr:
                v.append(1e3 * t / n)
        res[impl] = {"median_ms": round(statistics.median(v), 3), "min_ms": round(min(v), 3), "max_ms": round(max(v), 3)}
    return res


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "opt":
    print(json.dumps({"load_before": os.getloadavg(), "cpu": opt_impls("cpu"), "mps": opt_impls("mps"),
                      "load_after": os.getloadavg(), "date": time.strftime("%Y-%m-%d")}, indent=1))
elif __name__ == "__main__":
    res = {"torch": torch.__version__, "threads": torch.get_num_threads(), "trials": TRIALS, "steps": STEPS,
           "load_before": os.getloadavg()}
    for dev in ["cpu", "mps"]:
        res[dev] = {"plain": phases(dev, False), "checkpoint": phases(dev, True), "forward": fwd_modes(dev)}
    res["profile_cpu"] = profile_cpu()
    res["load_after"] = os.getloadavg()
    res["date"] = time.strftime("%Y-%m-%d")
    print(json.dumps(res, indent=1))
