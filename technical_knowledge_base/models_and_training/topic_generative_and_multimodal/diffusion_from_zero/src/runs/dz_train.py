"""Diffusion from zero: two short training runs on the root's recipe (MPS, under the bench lock).

    python -I dz_train.py more   # resume the Diffusion lab's eps model (df_ddpm_eps_4000, raw weights) for 4,000 more
                                 # steps: does the DDPM-vs-DDIM gap shrink as the model's error falls?
    python -I dz_train.py bad    # a weaker model for autoguidance: TinyUNet(base=16), 262,385 parameters, 1,000 steps
Recipe as the root's train_ddpm.py (batch 128, AdamW 5e-4, 200 warm-up steps, clip 1, EMA 0.999, label dropout 10%,
linear betas, float32). "more" restarts AdamW and the EMA (the lab's checkpoint keeps weights and EMA, not optimizer
state) and draws batches with seed 1. Checkpoints go to GM_SCRATCH/dz/; logs to out/train_<mode>.json.
"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dz_env import OUT, dz_scratch
import torch
import torch.nn.functional as F
from common import cap_threads, device, load_split, batches, scratch, PeakMem, MACHINE, to_model, sync
from nets import TinyUNet
from objectives import Schedule, betas_linear, drop_labels
from train import fit

mode = sys.argv[1]
cap_threads(4)
dev = device("mps")
sched = Schedule(betas_linear()).to(dev)


def loss_fn(model, b):
    x0, y = b
    t = torch.randint(0, sched.T, (x0.shape[0],), device=dev)
    eps = torch.randn_like(x0)
    pred = model(sched.q_sample(x0, t, eps), t.float() / sched.T, drop_labels(y, 0.1))
    loss = F.mse_loss(pred, eps)
    return loss, {"loss": loss.item()}


xtr, ytr = load_split("train")
if mode == "more":
    model = TinyUNet(); ck = torch.load(scratch("ckpt", "df_ddpm_eps_4000.pt"), map_location="cpu")
    model.load_state_dict(ck["model"]); steps, seed, name = 4000, 1, "dz_ddpm_eps_8000"
else:
    model = TinyUNet(base=16); steps, seed, name = 1000, 0, "dz_bad_b16_1000"
nparam = sum(p.numel() for p in model.parameters())
with PeakMem() as pm:
    model, ema, info = fit(model, loss_fn, batches(xtr, ytr, 128, seed=seed), dev, steps=steps, lr=5e-4, warmup=200,
                           clip=1.0, ema_decay=0.999, log_every=50, prefix="dz", seed=seed)
    xv, yv = load_split("val")
    xv, yv = to_model(xv[:2048]).to(dev), torch.from_numpy(yv[:2048]).to(dev)
    g = torch.Generator(device="cpu").manual_seed(1)
    per_t = []
    with torch.no_grad():
        for tt in [0, 10, 25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 999]:
            eps = torch.randn(xv.shape, generator=g).to(dev)
            t = torch.full((xv.shape[0],), tt, device=dev)
            pred = ema(sched.q_sample(xv, t, eps), t.float() / sched.T, yv)
            per_t.append({"t": tt, "eps_mse": round(float(F.mse_loss(pred, eps)), 5)})
    sync(dev)
cfg = {"net": "TinyUNet()" if mode == "more" else "TinyUNet(base=16)", "params": nparam, "pred": "eps",
       "steps": info["steps"] + (4000 if mode == "more" else 0), "resumed_from": "df_ddpm_eps_4000 (raw weights)" if mode == "more" else None,
       "batch": 128, "lr": 5e-4, "warmup": 200, "ema": 0.999, "p_uncond": 0.1, "seed": seed}
torch.save({"model": model.state_dict(), "ema": ema.state_dict(), "config": cfg}, dz_scratch("ckpt", name + ".pt"))
out = {"name": name, "config": cfg, "seconds": info["seconds"], "steps_per_s": round(info["steps"] / info["seconds"], 3),
       "peak_mps_mib": pm.peak_mb, "machine": MACHINE, "device": str(dev), "date": time.strftime("%Y-%m-%d"),
       "torch": torch.__version__, "log": info["log"], "per_t": per_t}
json.dump(out, open(os.path.join(OUT, f"train_{mode}.json"), "w"), indent=0)
print("done", name, info["steps"], info["seconds"], "s", per_t[-1], flush=True)
