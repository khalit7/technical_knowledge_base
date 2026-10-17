"""The common training loop: fixed seeds, AdamW, gradient clipping, optional EMA (decay warmed up as min(decay, (1+step)/(10+step))), a JSONL loss log,
a step or wall-clock budget, progress printed, and the bench lock kept fresh.

    from train import fit
    model, ema, log = fit(model, lambda m, b: ddpm_loss(m, b[0], b[1], sched),
                          batches(x, y, 128, seed=0), dev, steps=2000, log_path=..., prefix="df")

Every loss function takes (model, batch) and returns (loss_tensor, dict_of_floats).
GPU (MPS) use must happen under the bench lock: see README.md.
"""
import copy, json, math, os, sys, time

import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import seed_all, sync, touch_bench


def fit(model, loss_fn, data_iter, dev, steps=None, seconds=None, lr=2e-4, weight_decay=0.0,
        warmup=100, clip=1.0, ema_decay=None, log_path=None, log_every=50, seed=0, prefix="gm",
        print_every_s=60, to_dev=True):
    assert steps or seconds, "give a step budget, a time budget, or both"
    seed_all(seed)
    model.to(dev).train()
    ema = copy.deepcopy(model).eval().requires_grad_(False) if ema_decay else None
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, (s + 1) / max(1, warmup)))
    log, f = [], open(log_path, "w") if log_path else None
    t0 = last_print = last_touch = time.time()
    step, acc, n = 0, {}, 0
    while True:
        if steps and step >= steps:
            break
        if seconds and time.time() - t0 >= seconds:
            break
        batch = next(data_iter)
        if to_dev:
            batch = tuple(b.to(dev, non_blocking=True) for b in batch)
        loss, logs = loss_fn(model, batch)
        opt.zero_grad(set_to_none=True)
        loss.backward()
        gn = torch.nn.utils.clip_grad_norm_(model.parameters(), clip if clip else math.inf)
        opt.step(); sched.step(); step += 1
        if ema is not None:
            with torch.no_grad():
                d = min(ema_decay, (1 + step) / (10 + step))     # EMA warm-up: early steps do not drag in the random init
                for pe, pm in zip(ema.parameters(), model.parameters()):
                    pe.lerp_(pm, 1 - d)
        for k, v in logs.items():
            acc[k] = acc.get(k, 0.0) + v
        n += 1
        if step % log_every == 0 or step == 1:
            sync(dev)
            rec = {"step": step, "sec": round(time.time() - t0, 2), "grad_norm": round(float(gn), 4),
                   **{k: round(v / n, 5) for k, v in acc.items()}}
            log.append(rec); acc, n = {}, 0
            if f:
                f.write(json.dumps(rec) + "\n"); f.flush()
        now = time.time()
        if now - last_print > print_every_s:
            print(f"[{prefix}] step {step} {log[-1] if log else ''}", flush=True); last_print = now
        if now - last_touch > 300:
            touch_bench(prefix); last_touch = now
    sync(dev)
    if ema is not None:      # copy buffers (BatchNorm statistics) too
        for be, bm in zip(ema.buffers(), model.buffers()):
            be.copy_(bm)
    if f:
        f.close()
    model.eval()
    return model, ema, {"steps": step, "seconds": round(time.time() - t0, 1), "log": log}
