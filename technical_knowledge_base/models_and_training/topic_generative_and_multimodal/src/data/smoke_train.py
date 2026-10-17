"""Smoke training of every tiny model (a wall-clock budget each, MPS, under the bench lock) to prove the loop.

Run (from the setup folder, holding the bench lock):
  GM_SCRATCH=... GM_LOCK=.../lock.sh nice -n 15 python -I smoke_train.py [seconds_per_model=120] [which=all]
Writes: GM_SCRATCH/ckpt/*.pt, GM_SCRATCH/fid/clf_test.npz, src/data/smoke/*.png and smoke/train_results.json.
Not a result to teach from: the labs train their own models for longer; this proves the code runs and
records how far two minutes gets on this machine.
"""
import json, os, sys, time

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import (cap_threads, device, empty_cache, load_split, to_model, from_model, batches, seed_all,
                    scratch, PeakMem, sync, MACHINE)
from nets import TinyUNet, TinyDiT, ConvAE, ConvVAE, FMClassifier, n_params
from objectives import (Schedule, betas_linear, ddpm_loss, sample_ddpm, cfm_loss, sample_euler,
                        ae_loss, vae_loss, to_image)
from train import fit
from grids import save_grid
import fid as F

cap_threads(4)
SEC = float(sys.argv[1]) if len(sys.argv) > 1 else 120
WHICH = sys.argv[2].split(",") if len(sys.argv) > 2 and sys.argv[2] != "all" else None
dev = device("mps")
os.makedirs(scratch("ckpt"), exist_ok=True); os.makedirs(scratch("fid"), exist_ok=True)
os.makedirs(scratch("logs"), exist_ok=True)
OUT = os.path.join(HERE, "smoke"); os.makedirs(OUT, exist_ok=True)
RES_PATH = os.path.join(OUT, "train_results.json")
results = json.load(open(RES_PATH)) if os.path.exists(RES_PATH) else {}
results["_meta"] = {"machine": MACHINE, "device": str(dev), "torch": torch.__version__,
                    "budget_seconds_per_model": SEC, "batch": 128, "date": time.strftime("%Y-%m-%d")}

xtr, ytr = load_split("train"); xte, yte = load_split("test")
y16 = torch.arange(16, device=dev) % 10                      # classes 0..9 then 0..5


def run(name, model, loss_fn, lr, ema=None, sample=None):
    if WHICH and name not in WHICH:
        return
    print(f"== {name}: {n_params(model):,} parameters", flush=True)
    seed_all(0)
    with PeakMem() as pm:
        model, ema_m, info = fit(model, loss_fn, batches(xtr, ytr, 128, seed=0), dev, seconds=SEC, lr=lr,
                                 ema_decay=ema, log_path=scratch("logs", f"smoke_{name}.jsonl"),
                                 log_every=25, prefix="gms")
        net = ema_m if ema_m is not None else model
        torch.save(net.state_dict(), scratch("ckpt", f"smoke_{name}.pt"))
        r = {"params": n_params(model), "steps": info["steps"], "seconds": info["seconds"],
             "steps_per_s": round(info["steps"] / info["seconds"], 2), "lr": lr, "ema": ema,
             "loss_first": info["log"][0], "loss_last": info["log"][-1]}
        if sample:
            r.update(sample(net))
    r["peak_mps_mb"], r["max_rss_mb"] = pm.peak_mb, pm.rss_mb
    results[name] = r
    print(name, json.dumps({k: v for k, v in r.items() if k not in ("loss_first",)}), flush=True)
    json.dump(results, open(RES_PATH, "w"), indent=1)
    del model, ema_m; empty_cache()


# 1. the scorer: classifier (needed by the others' sample metrics)
def clf_loss(m, b):
    lg = m(b[0]); loss = torch.nn.functional.cross_entropy(lg, b[1])
    return loss, {"loss": loss.item(), "acc": (lg.argmax(1) == b[1]).float().mean().item()}


def clf_eval(m):
    m.eval()
    with torch.no_grad():
        f, lg = F.classifier_features(xte, m, dev)
    np.savez(scratch("fid", "clf_test.npz"), mu=f.mean(0), sigma=np.cov(f, rowvar=False))
    torch.save(m.state_dict(), scratch("ckpt", "fm_classifier.pt"))
    return {"test_acc": round(float((lg.argmax(1) == yte).mean()), 4)}


run("classifier", FMClassifier(), clf_loss, 1e-3, sample=clf_eval)
clf = F.load_classifier(dev)


def gen_metrics(name, gen_fn, n=256):
    """16-image grid (classes 0..9, 0..5) plus FD in classifier space and label accuracy on n samples."""
    sync(dev); t = time.time()
    g = torch.Generator(device=dev).manual_seed(0)
    x16 = gen_fn(y16, g); sync(dev); t16 = time.time() - t
    save_grid(x16, os.path.join(OUT, f"{name}_16.png"), nrow=8)
    ys = torch.arange(n, device=dev) % 10; xs = []
    for i in range(0, n, 256):
        xs.append(from_model(gen_fn(ys[i:i + 256], g)))
    fd, acc = F.fd_fmnist(np.concatenate(xs), clf, dev, labels=ys.cpu().numpy())
    return {"sample16_seconds": round(t16, 2), f"fd_clf_n{n}": round(fd, 2), f"label_acc_n{n}": round(acc, 4)}


# 2. autoencoder and VAE (flat 2-d latent: the latent-space explorer's shape)
def ae_sample(m):
    x = to_model(xte[:16]).to(dev)
    with torch.no_grad():
        logits, z = m(x)
    save_grid(torch.cat([x, to_image(logits)]), os.path.join(OUT, "ae_recon.png"), nrow=16)
    return {"test_bce_first16": round(float(torch.nn.functional.binary_cross_entropy_with_logits(
        logits, (x + 1) / 2, reduction="sum") / 16), 2)}


def vae_sample(m):
    x = to_model(xte[:16]).to(dev)
    with torch.no_grad():
        logits, mu, lv = m(x)
        prior = to_image(m.decode(torch.randn(16, m.latent_dim, device=dev, generator=torch.Generator(device=dev).manual_seed(0))))
    save_grid(torch.cat([x, to_image(logits), prior]), os.path.join(OUT, "vae_recon_prior.png"), nrow=16)
    return {}


run("ae_z2", ConvAE(latent_dim=2), lambda m, b: ae_loss(m, b[0]), 1e-3, sample=ae_sample)
run("vae_z2", ConvVAE(latent_dim=2), lambda m, b: vae_loss(m, b[0]), 1e-3, sample=vae_sample)

# 3. DDPM on TinyUNet, flow matching on TinyUNet and on TinyDiT
sched = Schedule(betas_linear()).to(dev)
run("unet_ddpm", TinyUNet(), lambda m, b: ddpm_loss(m, b[0], b[1], sched), 2e-4, ema=0.999,
    sample=lambda m: gen_metrics("unet_ddpm", lambda y, g: sample_ddpm(m, sched, y, (len(y), 1, 32, 32), gen=g)))
run("unet_fm", TinyUNet(), lambda m, b: cfm_loss(m, b[0], b[1]), 2e-4, ema=0.999,
    sample=lambda m: gen_metrics("unet_fm", lambda y, g: sample_euler(m, y, (len(y), 1, 32, 32), 50, dev=dev, gen=g)))
run("dit_fm", TinyDiT(), lambda m, b: cfm_loss(m, b[0], b[1]), 3e-4, ema=0.999,
    sample=lambda m: gen_metrics("dit_fm", lambda y, g: sample_euler(m, y, (len(y), 1, 32, 32), 50, dev=dev, gen=g)))
print("SMOKE_TRAIN_DONE", flush=True)
