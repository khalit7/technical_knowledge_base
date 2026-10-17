"""Latent lab: train the tiny autoencoders, VAEs (beta sweep) and VQ-VAEs on Fashion-MNIST.

Run holding the bench lock (MPS), a few runs per process so each GPU session stays a few minutes:
  GM_SCRATCH=... GM_LOCK=.../lock.sh nice -n 15 $GM_SCRATCH/venv/bin/python -I train_lt.py ae2,vae2,ae16,vae16
Writes GM_SCRATCH/ckpt/lt_<run>.pt, GM_SCRATCH/logs/lt_<run>.jsonl, and src/latent/runs/<run>.json (summary)
plus src/latent/runs/<run>.jsonl (the loss log, small). Same data order (batches seed 0) and init seed for every run.
"""
import json, os, shutil, sys, time

import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data")); sys.path.insert(0, HERE)
from common import cap_threads, device, load_split, batches, seed_all, scratch, PeakMem, MACHINE, empty_cache
from nets import ConvAE, ConvVAE, n_params
from objectives import ae_loss, vae_loss
from train import fit
from vq import VQVAE, vq_loss

STEPS = 5000
RUNS = {
    "ae2":  dict(make=lambda: ConvAE(latent_dim=2),  loss=lambda m, b: ae_loss(m, b[0])),
    "vae2": dict(make=lambda: ConvVAE(latent_dim=2), loss=lambda m, b: vae_loss(m, b[0], beta=1.0)),
    "ae16": dict(make=lambda: ConvAE(latent_dim=16), loss=lambda m, b: ae_loss(m, b[0])),
}
for beta in (0.1, 0.3, 1.0, 3.0, 10.0):
    RUNS["vae16_b" + str(beta).replace(".", "p")] = dict(
        make=lambda: ConvVAE(latent_dim=16), loss=(lambda bb: (lambda m, b: vae_loss(m, b[0], beta=bb)))(beta), beta=beta)
RUNS["vq_plain"] = dict(make=lambda: VQVAE(K=128, D=8, restart=False), loss=lambda m, b: vq_loss(m, b[0]))
RUNS["vq_restart"] = dict(make=lambda: VQVAE(K=128, D=8, restart=True), loss=lambda m, b: vq_loss(m, b[0]))


def main(names, steps=STEPS):
    cap_threads(4)
    dev = device(os.environ.get("LT_DEV", "mps"))
    out = os.path.join(HERE, "runs"); os.makedirs(out, exist_ok=True)
    os.makedirs(scratch("ckpt"), exist_ok=True); os.makedirs(scratch("logs"), exist_ok=True)
    xtr, ytr = load_split("train")
    for name in names:
        cfg = RUNS[name]
        seed_all(0)
        model = cfg["make"]()
        print(f"== lt {name}: {n_params(model):,} parameters, {steps} steps", flush=True)
        log_path = scratch("logs", f"lt_{name}.jsonl")
        with PeakMem() as pm:
            model, _, info = fit(model, cfg["loss"], batches(xtr, ytr, 128, seed=0), dev, steps=steps, lr=1e-3,
                                 log_path=log_path, log_every=50, prefix="lt")
        torch.save(model.state_dict(), scratch("ckpt", f"lt_{name}.pt"))
        r = {"run": name, "params": n_params(model), "steps": info["steps"], "seconds": info["seconds"],
             "steps_per_s": round(info["steps"] / info["seconds"], 1), "batch": 128, "lr": 1e-3,
             "beta": cfg.get("beta"), "last_log": info["log"][-1], "peak_mps_mb": pm.peak_mb,
             "device": str(dev), "torch": torch.__version__, "machine": MACHINE, "date": time.strftime("%Y-%m-%d")}
        if isinstance(model, VQVAE):
            r["alive_log"] = model.alive_log
        json.dump(r, open(os.path.join(out, name + ".json"), "w"), indent=1)
        shutil.copy(log_path, os.path.join(out, name + ".jsonl"))
        print("done", name, json.dumps({k: r[k] for k in ("seconds", "last_log", "peak_mps_mb")}), flush=True)
        del model; empty_cache()


if __name__ == "__main__":
    main(sys.argv[1].split(","), int(sys.argv[2]) if len(sys.argv) > 2 else STEPS)
