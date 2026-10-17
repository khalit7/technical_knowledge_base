"""Train the topic's TinyDiT with the Flow lab's flow-matching recipe, so it compares with the Flow lab's TinyUNet
(GM_SCRATCH/ckpt/fw_fm_4000.pt, trained by the root's src/flow/train_fm.py) on equal terms (MPS, under the bench lock).

    GM_SCRATCH=... GM_LOCK=.../lock.sh nice -n 15 $GM_SCRATCH/venv/bin/python -I train_dit.py --variant p4 --steps 6473 --save-at 4000

Recipe = the Flow lab's, unchanged: batch 128 in the shared order (common.batches seed 0), AdamW lr 5e-4, 200 warm-up
steps, gradient clipping 1.0, EMA 0.999 (with the shared warm-up), label dropout 10%, seed 0, float32, conditional flow
matching with straight paths (objectives.cfm_loss). Only the network changes.
Variants: p4 (TinyDiT() as shared: 4x4 patches, 64 tokens), p2 (2x2 patches, 256 tokens), p8 (8x8 patches, 16 tokens),
p4_nozero (p4 with adaLN but without the zero initialisation: the modulation, gate and output layers keep PyTorch's
default Linear init, DiT's "adaLN" row against "adaLN-Zero").
The loop is train.fit's, copied so that a checkpoint (model and EMA) can be saved part-way (--save-at).
"""
import argparse, copy, json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "data"))
import torch
from common import cap_threads, device, load_split, batches, scratch, seed_all, sync, PeakMem, MACHINE, touch_bench
from nets import TinyDiT, n_params
from objectives import cfm_loss

ap = argparse.ArgumentParser()
ap.add_argument("--variant", default="p4", choices=["p2", "p4", "p8", "p4_nozero"])
ap.add_argument("--steps", type=int, default=4000)
ap.add_argument("--save-at", type=int, nargs="*", default=[])
a = ap.parse_args()
cap_threads(4)
dev = device(os.environ.get("LD_DEV", "mps"))
OUT = os.path.join(HERE, "..", "out"); os.makedirs(OUT, exist_ok=True)


def make(variant):
    seed_all(0)
    m = TinyDiT(patch=int(variant[1]))
    if variant.endswith("nozero"):
        for b in m.blocks:
            b.ada[-1].reset_parameters()
        m.ada_f[-1].reset_parameters(); m.head.reset_parameters()
    return m


model = make(a.variant)
xtr, ytr = load_split("train")
data = batches(xtr, ytr, 128, seed=0)
loss_fn = lambda model, b: cfm_loss(model, b[0], b[1], p_uncond=0.1)
lr, warmup, clip, ema_decay = 5e-4, 200, 1.0, 0.999
saves = sorted(set(a.save_at + [a.steps]))
cfg = {"net": f"TinyDiT(patch={a.variant[1]})" + (" without zero init" if "nozero" in a.variant else ""),
       "params": n_params(model), "objective": "cfm (straight paths)", "batch": 128, "lr": lr, "warmup": warmup,
       "clip": clip, "ema": ema_decay, "p_uncond": 0.1, "seed": 0}

with PeakMem() as pm:
    seed_all(0)
    model.to(dev).train()
    ema = copy.deepcopy(model).eval().requires_grad_(False)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.0)
    sch = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, (s + 1) / max(1, warmup)))
    log, acc, n, step = [], {}, 0, 0
    t0 = last_print = last_touch = time.time()
    marks = {}
    while step < a.steps:
        b = tuple(x.to(dev, non_blocking=True) for x in next(data))
        loss, logs = loss_fn(model, b)
        opt.zero_grad(set_to_none=True); loss.backward()
        gn = torch.nn.utils.clip_grad_norm_(model.parameters(), clip)
        opt.step(); sch.step(); step += 1
        with torch.no_grad():
            d = min(ema_decay, (1 + step) / (10 + step))
            for pe, pmm in zip(ema.parameters(), model.parameters()):
                pe.lerp_(pmm, 1 - d)
        for k, v in logs.items():
            acc[k] = acc.get(k, 0.0) + v
        n += 1
        if step % 50 == 0 or step == 1:
            sync(dev)
            log.append({"step": step, "sec": round(time.time() - t0, 2), "grad_norm": round(float(gn), 4),
                        **{k: round(v / n, 5) for k, v in acc.items()}}); acc, n = {}, 0
        now = time.time()
        if now - last_print > 60:
            print(f"[ld {a.variant}] step {step} {log[-1]}", flush=True); last_print = now
        if now - last_touch > 300:
            touch_bench("ld"); last_touch = now
        if step in saves:
            sync(dev)
            marks[step] = round(time.time() - t0, 1)
            torch.save({"model": model.state_dict(), "ema": ema.state_dict(), "config": {**cfg, "steps": step}},
                       scratch("ckpt", f"ld_dit_{a.variant}_{step}.pt"))
    sync(dev)
out = {"variant": a.variant, "config": cfg, "steps": step, "seconds": round(time.time() - t0, 1),
       "seconds_at_save": marks, "steps_per_s": round(step / (time.time() - t0), 3), "peak_mps_mb": pm.peak_mb,
       "machine": MACHINE, "device": str(dev), "date": time.strftime("%Y-%m-%d"), "torch": torch.__version__, "log": log}
json.dump(out, open(os.path.join(OUT, f"train_dit_{a.variant}.json"), "w"), indent=0)
print("done", a.variant, step, out["seconds"], "s", out["steps_per_s"], "steps/s peak", pm.peak_mb, flush=True)
