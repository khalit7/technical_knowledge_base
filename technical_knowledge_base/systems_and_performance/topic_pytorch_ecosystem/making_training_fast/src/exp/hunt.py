"""The worked bottleneck hunt: the larger variant of the running example (8 blocks, d 512, T 256, B 8, 25.4M params)
trained through a DataLoader, first as commonly written, then with one fix at a time. Timing: hold the bench lock.

    python hunt.py time  <device> <stage>[,<stage>...]   -> appends to inputs/hunt_time_<device>.json
    python hunt.py trace <device> <stage>                -> chrome trace in $FST_SCRATCH, compact copy in inputs/

Stages s1 to s4 add one fix each; s5 tries bfloat16 on top of s4 (it made things slower here, so it is reverted);
s6 is s4 plus torch.compile; s7 is s6 plus bfloat16, to check the two together:
  s0 baseline : DataLoader(num_workers=0) over a dataset that does Python work per sample (DATA_MS, illustrative),
                attention written out (GPTConfig attn="manual"), default AdamW (for-loop on CPU/MPS), float32,
                loss.item() printed every step
  s1 +workers : DataLoader(num_workers=2, persistent_workers=True, prefetch_factor=2)
  s2 +fused   : AdamW(fused=True)
  s3 +sdpa    : F.scaled_dot_product_attention (GPTConfig attn="sdpa")
  s4 +no sync : log the loss every 10 steps instead of calling .item() every step
  s5 s4+bf16  : torch.autocast(bfloat16) around forward and loss
  s6 s4+compile: torch.compile(model), float32
  s7 s6+bf16  : compiled and autocast(bfloat16)
"""
import json, os, statistics, sys, time
import torch
from torch.utils.data import Dataset, DataLoader
import common
from model import DATA, GPTConfig

DATA_MS = float(os.environ.get("FST_DATA_MS", "2.0"))     # Python work per sample, milliseconds (illustrative)
STAGES = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"]


class Windows(Dataset):
    """Random windows of the running example's text, the same per index. __getitem__ burns DATA_MS of pure-Python
    work first: a stand-in for decoding and tokenising raw text (the cost is set by hand, so it is illustrative)."""
    def __init__(self, T, n=100000):
        self.T, self.n = T, n
    def __len__(self):
        return self.n
    def __getitem__(self, i):
        end = time.perf_counter() + DATA_MS / 1e3
        acc = 0
        while time.perf_counter() < end:
            acc += 1
        g = torch.Generator().manual_seed(i)
        j = int(torch.randint(len(DATA) - self.T - 1, (1,), generator=g))
        w = DATA[j:j + self.T + 1]
        return w[:-1], w[1:]


def setup(device, stage):
    k = STAGES.index(stage)
    cfg = common.cfg("big", attn="sdpa" if k >= 3 else "manual")
    model = common.make_model(cfg, device)
    decay = [p for p in model.parameters() if p.dim() >= 2]; nod = [p for p in model.parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": 0.1}, {"params": nod, "weight_decay": 0.0}],
                            lr=6e-4, betas=(0.9, 0.95), fused=True if k >= 2 else None)
    nw = 2 if k >= 1 else 0
    dl = DataLoader(Windows(cfg.block_size), batch_size=cfg.batch_size, shuffle=False, num_workers=nw,
                    persistent_workers=nw > 0, prefetch_factor=2 if nw else None)
    fwd = torch.compile(model) if stage in ("s6", "s7") else model
    amp = stage in ("s5", "s7")
    sync_every = 10 if k >= 4 else 1
    return cfg, model, fwd, opt, dl, amp, sync_every


def sync(device):
    if device == "mps":
        torch.mps.synchronize()


def run(device, stage, steps, warm, profiler=None):
    cfg, model, fwd, opt, dl, amp, sync_every = setup(device, stage)
    times, losses = [], []
    it = iter(dl)
    t_last = None
    for s in range(warm + steps):
        with torch.profiler.record_function("data"):
            x, y = next(it)
            x, y = x.to(device), y.to(device)
        with torch.profiler.record_function("forward"):
            with torch.autocast(device_type=device, dtype=torch.bfloat16, enabled=amp):
                _, loss = fwd(x, y)
        with torch.profiler.record_function("backward"):
            loss.backward()
        with torch.profiler.record_function("optimizer"):
            opt.step(); opt.zero_grad(set_to_none=True)
        if (s + 1) % sync_every == 0:
            with torch.profiler.record_function("log loss (.item)"):
                losses.append([s, float(loss.item())])
        if profiler is not None:
            profiler.step()
        if s == warm - 1:
            sync(device); t0 = time.perf_counter()
    sync(device); total = time.perf_counter() - t0
    return {"ms_per_step": round(1e3 * total / steps, 2), "losses": losses[-3:]}


def time_stage(device, stage, trials=3, steps=20, warm=8):
    # CPU bfloat16 steps take seconds each on this machine (no bfloat16 instructions): fewer, shorter trials via env
    trials = int(os.environ.get("FST_TRIALS", trials)); steps = int(os.environ.get("FST_STEPS", steps)); warm = int(os.environ.get("FST_WARM", warm))
    res = [run(device, stage, steps, warm) for _ in range(trials)]
    ms = [r["ms_per_step"] for r in res]
    return {"stage": stage, "device": device, "trials": trials, "steps": steps, "warmup": warm, "trials_ms": ms, "median_ms": statistics.median(ms), "min_ms": min(ms),
            "max_ms": max(ms), "loss_tail": res[0]["losses"], "data_ms_per_sample": DATA_MS}


def phases(device, stage, steps=20, warm=8, trials=3):
    """Per-phase time with a device synchronize after each phase (honest per-phase timing; it removes all overlap,
    so the phases sum to more than a normal step)."""
    out = []
    for _ in range(trials):
        cfg, model, fwd, opt, dl, amp, _ = setup(device, stage)
        it = iter(dl); acc = {"data": [], "forward": [], "backward": [], "optimizer": []}
        for s in range(warm + steps):
            t = [time.perf_counter()]
            x, y = next(it); x, y = x.to(device), y.to(device); sync(device); t.append(time.perf_counter())
            with torch.autocast(device_type=device, dtype=torch.bfloat16, enabled=amp):
                _, loss = fwd(x, y)
            sync(device); t.append(time.perf_counter())
            loss.backward(); sync(device); t.append(time.perf_counter())
            opt.step(); opt.zero_grad(set_to_none=True); sync(device); t.append(time.perf_counter())
            if s >= warm:
                for i, k in enumerate(acc):
                    acc[k].append(1e3 * (t[i + 1] - t[i]))
        out.append({k: round(statistics.median(v), 2) for k, v in acc.items()})
    return {"stage": stage, "device": device, "trials": out,
            "median_ms": {k: statistics.median(o[k] for o in out) for k in out[0]}}


def trace_stage(device, stage):
    from torch.profiler import profile, ProfilerActivity, schedule
    os.makedirs(common.SCRATCH, exist_ok=True)
    path = os.path.join(common.SCRATCH, f"hunt_{device}_{stage}.json")
    with profile(activities=[ProfilerActivity.CPU], schedule=schedule(wait=4, warmup=2, active=2), record_shapes=True,
                 on_trace_ready=lambda p: p.export_chrome_trace(path)) as prof:
        run(device, stage, steps=2, warm=6, profiler=prof)
    return path


if __name__ == "__main__":
    torch.set_num_threads(4)
    mode, device, stages = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
    if mode == "time":
        p = os.path.join(common.INPUTS, f"hunt_time_{device}.json")
        out = json.load(open(p)) if os.path.exists(p) else {"runs": []}
        for st in stages:
            la = list(os.getloadavg())
            r = time_stage(device, st); r["load_before"] = [round(v, 2) for v in la]; r["load_after"] = [round(v, 2) for v in os.getloadavg()]
            r["date"] = time.strftime("%Y-%m-%d %H:%M"); out["runs"].append(r); print(r, file=sys.stderr)
        out["env"] = common.env()
        common.dump(f"hunt_time_{device}.json", out)
    elif mode == "phases":
        p = os.path.join(common.INPUTS, f"hunt_phases_{device}.json")
        out = json.load(open(p)) if os.path.exists(p) else {"runs": []}
        for st in stages:
            la = list(os.getloadavg()); r = phases(device, st)
            r["load_before"] = [round(v, 2) for v in la]; r["load_after"] = [round(v, 2) for v in os.getloadavg()]
            r["date"] = time.strftime("%Y-%m-%d %H:%M"); out["runs"].append(r); print(r, file=sys.stderr)
        out["env"] = common.env()
        common.dump(f"hunt_phases_{device}.json", out)
    else:
        print(trace_stage(device, stages[0]))
