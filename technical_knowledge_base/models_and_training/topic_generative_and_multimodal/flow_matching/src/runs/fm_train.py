"""Flow matching child page: a further reflow round, or one-step distillation, of the tiny image model (MPS, bench lock).

    python -I fm_train.py --mode reflow  --init ckpt/fw_reflow_2000.pt --pairs fm/pairs_rf2.npz --name rf3_2000 --steps 2000
    python -I fm_train.py --mode distill --init ckpt/fw_fm_4000.pt     --pairs fm/pairs_rf1.npz --name rf1d_1500 --steps 1500
    python -I fm_train.py --mode distill --init ckpt/fw_reflow_2000.pt --pairs fm/pairs_rf2.npz --name rf2d_1500 --steps 1500

Recipe: the root Flow lab's (TinyUNet default, batch 128, AdamW 5e-4, 200 warm-up steps, clip 1.0, EMA 0.999, seed 0,
float32), starting from the EMA weights of --init.
  reflow:  the root's reflow loss, unchanged: t ~ U[0, 1], x_t = (1 - t) z + t X1 on the fixed pairs, regress X1 - z;
           10% of labels dropped (as the root's 2-RF), so 3-RF is trained exactly like 2-RF, one round later.
  distill: Liu et al.'s k-RF + distill, with a squared error (not LPIPS): only t = 0, the student's one Euler step
           z + v(z, 0, y) regresses onto X1, i.e. v(z, 0, y) onto X1 - z; no label dropout (the one-step student is
           only used conditionally, without guidance).
Writes GM_SCRATCH/fm/<name>.pt and out/train_<name>.json here.
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
import numpy as np
import torch
import torch.nn.functional as F
from common import cap_threads, device, scratch, seed_all, sync, PeakMem, MACHINE
from nets import TinyUNet
from objectives import drop_labels
from train import fit

ap = argparse.ArgumentParser()
ap.add_argument("--mode", choices=["reflow", "distill"], required=True)
ap.add_argument("--init", required=True); ap.add_argument("--pairs", required=True)
ap.add_argument("--name", required=True); ap.add_argument("--steps", type=int, default=2000)
a = ap.parse_args()
cap_threads(4)
dev = device("mps")
P = np.load(scratch(a.pairs))
Z, X1, Y = torch.from_numpy(P["z"]).float(), torch.from_numpy(P["x1"]).float(), torch.from_numpy(P["y"]).long()


def pair_batches(bs=128, seed=0):
    g = np.random.default_rng(seed)
    while True:
        idx = torch.from_numpy(g.permutation(len(Z)))
        for i in range(0, len(idx) - bs + 1, bs):
            j = idx[i:i + bs]
            yield Z[j], X1[j], Y[j]


def reflow_loss(model, b):
    """The same regression as flow matching, on a fixed coupling: x0 is the noise that generated x1."""
    x0, x1, y = b
    t = torch.rand(x1.shape[0], device=x1.device)
    tt = t.view(-1, 1, 1, 1)
    pred = model((1 - tt) * x0 + tt * x1, t, drop_labels(y, 0.1))
    loss = F.mse_loss(pred, x1 - x0)
    return loss, {"loss": loss.item()}


def distill_loss(model, b):
    """One-step student: one Euler step from t = 0 must land on the teacher's ODE end point."""
    z, x1, y = b
    t = torch.zeros(x1.shape[0], device=x1.device)
    loss = F.mse_loss(z + model(z, t, y), x1)
    return loss, {"loss": loss.item()}


seed_all(0)
model = TinyUNet()
model.load_state_dict(torch.load(scratch(a.init), map_location="cpu")["ema"])
with PeakMem() as pm:
    model, ema, info = fit(model, reflow_loss if a.mode == "reflow" else distill_loss, pair_batches(), dev, steps=a.steps,
                           lr=5e-4, warmup=200, clip=1.0, ema_decay=0.999, log_every=50, prefix="fm", seed=0)
    sync(dev)
cfg = {"net": "TinyUNet()", "params": sum(p.numel() for p in model.parameters()), "mode": a.mode, "init": a.init,
       "pairs": a.pairs, "batch": 128, "lr": 5e-4, "warmup": 200, "clip": 1.0, "ema": 0.999,
       "p_uncond": 0.1 if a.mode == "reflow" else 0.0, "seed": 0, "steps": info["steps"]}
os.makedirs(scratch("fm"), exist_ok=True)
torch.save({"model": model.state_dict(), "ema": ema.state_dict(), "config": cfg}, scratch("fm", f"{a.name}.pt"))
out = {"name": a.name, "config": cfg, "seconds": info["seconds"], "steps_per_s": round(info["steps"] / info["seconds"], 3),
       "peak_mps_mb": pm.peak_mb, "rss_mb": getattr(pm, "rss_mb", None), "machine": MACHINE, "device": str(dev),
       "date": time.strftime("%Y-%m-%d"), "torch": torch.__version__, "log": info["log"]}
json.dump(out, open(os.path.join(HERE, "..", "out", f"train_{a.name}.json"), "w"), indent=0)
print("done", a.name, info["steps"], info["seconds"], "s", flush=True)
