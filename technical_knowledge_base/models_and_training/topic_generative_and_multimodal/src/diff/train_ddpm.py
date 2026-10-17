"""Diffusion lab: train the tiny class-conditional DDPM on Fashion-MNIST (MPS, under the bench lock).

    GM_SCRATCH=... GM_LOCK=.../lock.sh nice -n 15 $GM_SCRATCH/venv/bin/python -I train_ddpm.py --pred eps --steps 4000

--pred eps  : predict the noise (Ho et al. 2020), loss || eps - eps_theta(x_t, t) ||^2
--pred v    : predict v = sqrt(abar) eps - sqrt(1 - abar) x0 (Salimans and Ho 2022), loss || v - v_theta ||^2
Shared recipe for both (and for the Flow lab's equal-step comparison): TinyUNet default (1,040,353 parameters),
batch 128, AdamW lr 5e-4, 200 warm-up steps, gradient clipping 1.0, EMA 0.999, label dropout 10% (classifier-free
guidance), linear betas 1e-4..0.02 over T = 1000, seed 0, float32.
Writes: GM_SCRATCH/ckpt/df_ddpm_<pred>_<steps>.pt (weights, EMA weights, config) and out/train_<pred>.json (loss log,
per-timestep validation loss of the EMA model).
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import torch
import torch.nn.functional as F
from common import cap_threads, device, load_split, batches, scratch, seed_all, sync, PeakMem, MACHINE, to_model
from nets import TinyUNet
from objectives import Schedule, betas_linear, drop_labels
from train import fit

ap = argparse.ArgumentParser()
ap.add_argument("--pred", default="eps", choices=["eps", "v"])
ap.add_argument("--steps", type=int, default=4000)
ap.add_argument("--cpu", action="store_true", help="smoke test on CPU (no bench lock needed)")
a = ap.parse_args()
cap_threads(4)
dev = device("cpu" if a.cpu else "mps")
sched = Schedule(betas_linear()).to(dev)


def target(x0, eps, t):
    if a.pred == "eps":
        return eps
    ab = sched.abar[t].view(-1, 1, 1, 1)
    return ab.sqrt() * eps - (1 - ab).sqrt() * x0


def loss_fn(model, b):
    x0, y = b
    t = torch.randint(0, sched.T, (x0.shape[0],), device=dev)
    eps = torch.randn_like(x0)
    pred = model(sched.q_sample(x0, t, eps), t.float() / sched.T, drop_labels(y, 0.1))
    loss = F.mse_loss(pred, target(x0, eps, t))
    return loss, {"loss": loss.item()}


xtr, ytr = load_split("train")
seed_all(0)
model = TinyUNet()
nparam = sum(p.numel() for p in model.parameters())
name = f"df_ddpm_{a.pred}_{a.steps}" + ("_cpu" if a.cpu else "")
with PeakMem() as pm:
    model, ema, info = fit(model, loss_fn, batches(xtr, ytr, 128, seed=0), dev, steps=a.steps, lr=5e-4, warmup=200,
                           clip=1.0, ema_decay=0.999, log_every=50, prefix="df", seed=0)
    # per-timestep validation loss of the EMA model: which noise levels are hard?
    xv, yv = load_split("val")
    xv, yv = to_model(xv[:2048]).to(dev), torch.from_numpy(yv[:2048]).to(dev)
    g = torch.Generator(device="cpu").manual_seed(1)
    per_t = []
    with torch.no_grad():
        for tt in [0, 10, 25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 999]:
            eps = torch.randn(xv.shape, generator=g).to(dev)
            t = torch.full((xv.shape[0],), tt, device=dev)
            xt = sched.q_sample(xv, t, eps)
            pred = ema(xt, t.float() / sched.T, yv)
            ab = sched.abar[tt]
            if a.pred == "eps":
                eps_hat = pred
            else:
                eps_hat = ab.sqrt() * pred + (1 - ab).sqrt() * xt
            x0_hat = (xt - (1 - ab).sqrt() * eps_hat) / ab.sqrt()
            per_t.append({"t": tt, "abar": round(float(ab), 6),
                          "loss": round(float(F.mse_loss(pred, target(xv, eps, t))), 5),
                          "eps_mse": round(float(F.mse_loss(eps_hat, eps)), 5),
                          "x0_mse": round(float(F.mse_loss(x0_hat.clamp(-1, 1), xv)), 5)})
    sync(dev)
os.makedirs(scratch("ckpt"), exist_ok=True)
cfg = {"net": "TinyUNet()", "params": nparam, "pred": a.pred, "schedule": "linear 1e-4..0.02, T=1000", "batch": 128,
       "lr": 5e-4, "warmup": 200, "clip": 1.0, "ema": 0.999, "p_uncond": 0.1, "seed": 0, "steps": info["steps"]}
torch.save({"model": model.state_dict(), "ema": ema.state_dict(), "config": cfg}, scratch("ckpt", name + ".pt"))
out = {"name": name, "config": cfg, "seconds": info["seconds"], "steps_per_s": round(info["steps"] / info["seconds"], 3),
       "peak_mps_mb": pm.peak_mb, "machine": MACHINE, "device": str(dev), "date": time.strftime("%Y-%m-%d"),
       "torch": torch.__version__, "log": info["log"], "per_t": per_t}
json.dump(out, open(os.path.join(HERE, "out", f"train_{a.pred}.json" if not a.cpu else f"smoke_{a.pred}.json"), "w"), indent=0)
print("done", name, info["steps"], info["seconds"], "s", per_t[-1], flush=True)
