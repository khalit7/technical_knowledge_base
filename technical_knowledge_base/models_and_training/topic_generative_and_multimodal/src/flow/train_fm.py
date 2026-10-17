"""Flow lab: train the tiny class-conditional flow-matching model on Fashion-MNIST (MPS, under the bench lock).

    GM_SCRATCH=... GM_LOCK=.../lock.sh nice -n 15 $GM_SCRATCH/venv/bin/python -I train_fm.py --steps 4000
    ... train_fm.py --reflow --steps 2000      # 2-rectified flow, fine-tuned from the first on (noise, sample) pairs

Same recipe as the Diffusion lab's DDPM so the two can be compared at equal steps: TinyUNet default (1,040,353
parameters), batch 128, AdamW lr 5e-4, 200 warm-up steps, gradient clipping 1.0, EMA 0.999, label dropout 10%, seed 0,
float32. Only the objective differs: conditional flow matching with straight paths (objectives.cfm_loss):
x_t = (1 - t) x0 + t x1 with x0 ~ N(0, I) noise, x1 a training image, t ~ U[0, 1]; the net regresses x1 - x0.
--reflow: pairs (z, X1) from out/reflow_pairs (made by make_pairs.py with the first model) replace the random pairing.
Writes GM_SCRATCH/ckpt/fw_<name>.pt and out/train_<name>.json (loss log, per-t validation loss of the EMA model).
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import numpy as np
import torch
import torch.nn.functional as F
from common import cap_threads, device, load_split, batches, scratch, seed_all, sync, PeakMem, MACHINE, to_model
from nets import TinyUNet
from objectives import cfm_loss, drop_labels
from train import fit

ap = argparse.ArgumentParser()
ap.add_argument("--steps", type=int, default=4000)
ap.add_argument("--reflow", action="store_true")
ap.add_argument("--cpu", action="store_true")
a = ap.parse_args()
cap_threads(4)
dev = device("cpu" if a.cpu else "mps")

if not a.reflow:
    name = f"fm_{a.steps}"
    xtr, ytr = load_split("train")
    data = batches(xtr, ytr, 128, seed=0)
    loss_fn = lambda model, b: cfm_loss(model, b[0], b[1], p_uncond=0.1)
    seed_all(0)
    model = TinyUNet()
else:
    name = f"reflow_{a.steps}"
    P = np.load(scratch("flow", "reflow_pairs.npz"))
    Z, X1, Y = torch.from_numpy(P["z"]).float(), torch.from_numpy(P["x1"]).float(), torch.from_numpy(P["y"]).long()

    def pair_batches(bs=128, seed=0):
        g = np.random.default_rng(seed)
        while True:
            idx = torch.from_numpy(g.permutation(len(Z)))
            for i in range(0, len(idx) - bs + 1, bs):
                j = idx[i:i + bs]
                yield Z[j], X1[j], Y[j]
    data = pair_batches()

    def loss_fn(model, b):
        """Reflow: the same regression, but x0 is the noise that generated x1 (a fixed coupling), not a fresh draw."""
        x0, x1, y = b
        t = torch.rand(x1.shape[0], device=x1.device)
        tt = t.view(-1, 1, 1, 1)
        pred = model((1 - tt) * x0 + tt * x1, t, drop_labels(y, 0.1))
        loss = F.mse_loss(pred, x1 - x0)
        return loss, {"loss": loss.item()}
    seed_all(0)
    model = TinyUNet()
    model.load_state_dict(torch.load(scratch("ckpt", "fw_fm_4000.pt"), map_location="cpu")["ema"])   # start from the 1-rectified flow

nparam = sum(p.numel() for p in model.parameters())
with PeakMem() as pm:
    model, ema, info = fit(model, loss_fn, data, dev, steps=a.steps, lr=5e-4, warmup=200, clip=1.0, ema_decay=0.999,
                           log_every=50, prefix="fw", seed=0)
    # per-t validation loss of the EMA model on fresh random pairs: which times are hard?
    xv, yv = load_split("val")
    xv, yv = to_model(xv[:2048]).to(dev), torch.from_numpy(yv[:2048]).to(dev)
    g = torch.Generator(device="cpu").manual_seed(1)
    per_t = []
    with torch.no_grad():
        for tt in [0.0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0]:
            x0 = torch.randn(xv.shape, generator=g).to(dev)
            t = torch.full((xv.shape[0],), tt, device=dev)
            v = ema((1 - tt) * x0 + tt * xv, t, yv)
            per_t.append({"t": tt, "loss": round(float(F.mse_loss(v, xv - x0)), 5)})
    sync(dev)
os.makedirs(scratch("ckpt"), exist_ok=True)
cfg = {"net": "TinyUNet()", "params": nparam, "objective": "reflow" if a.reflow else "cfm (straight paths)", "batch": 128,
       "lr": 5e-4, "warmup": 200, "clip": 1.0, "ema": 0.999, "p_uncond": 0.1, "seed": 0, "steps": info["steps"]}
torch.save({"model": model.state_dict(), "ema": ema.state_dict(), "config": cfg}, scratch("ckpt", f"fw_{name}.pt"))
out = {"name": name, "config": cfg, "seconds": info["seconds"], "steps_per_s": round(info["steps"] / info["seconds"], 3),
       "peak_mps_mb": pm.peak_mb, "machine": MACHINE, "device": str(dev), "date": time.strftime("%Y-%m-%d"),
       "torch": torch.__version__, "log": info["log"], "per_t": per_t}
json.dump(out, open(os.path.join(HERE, "out", f"train_{name}.json"), "w"), indent=0)
print("done", name, info["steps"], info["seconds"], "s", per_t, flush=True)
