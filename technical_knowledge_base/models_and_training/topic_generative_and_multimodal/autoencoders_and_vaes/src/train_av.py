"""Train the child page's tiny models on Fashion-MNIST (MPS, holding the bench lock). Prefix av.

  GM_SCRATCH=... GM_LOCK=.../lock.sh nice -n 15 $GM_SCRATCH/venv/bin/python -I train_av.py q_fsq125,q_lfq7
Same recipe as the root's Latent lab (src/latent/train_lt.py): seed 0, batches of 128 in the same order, AdamW lr 1e-3,
100 warm-up steps, gradient clipping 1.0, 5,000 steps, Bernoulli reconstruction loss in nats per image. Only the
bottleneck (quant/), the loss terms (g_*) or the decoder (collapse/) change.
Writes GM_SCRATCH/av/ckpt/<run>.pt, and runs/<run>.json (summary) and runs/<run>.jsonl (loss log) here.
"""
import json, os, shutil, sys, time

import torch
import torch.nn as nn
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "src")
sys.path[:0] = [os.path.join(ROOT_SRC, "data"), os.path.join(HERE, "quant"), os.path.join(HERE, "collapse")]
from common import cap_threads, device, load_split, batches, seed_all, scratch, PeakMem, MACHINE, empty_cache
from nets import n_params
from objectives import recon_bce, to_image
from train import fit
from quantizers import VQ, FSQ, LFQ, QAE
from pixelvae import PixelVAE

STEPS = 5000


def q_loss(m, b):
    x = b[0]
    logits, idx, aux, logs = m(x)
    rec = recon_bce(logits, x)
    loss = rec + aux
    return loss, {"loss": loss.item(), "rec": rec.item(), "used_in_batch": float(torch.unique(idx).numel()), **logs}


# ---------------- VQGAN-style losses on the tiny VQ (perceptual LPIPS, then a patch discriminator)
_lp = {}


def lpips_net(dev):
    if "net" not in _lp:
        from torchmetrics.functional.image.lpips import _NoTrainLpips
        _lp["net"] = _NoTrainLpips(net="alex", resize=64).to(dev)   # LPIPS v0.1 AlexNet weights bundled in torchmetrics
    return _lp["net"]


def lpips(a, b):
    """a, b in [-1, 1], shape (B, 1, 32, 32): grey repeated to RGB, resized to 64 inside the metric."""
    return lpips_net(a.device)(a.repeat(1, 3, 1, 1), b.repeat(1, 3, 1, 1)).flatten()


class PatchD(nn.Module):
    """A small patch discriminator: 32x32 -> 8x8 real/fake logits (one per overlapping patch)."""
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(nn.Conv2d(1, 32, 4, 2, 1), nn.LeakyReLU(0.2),
                                 nn.Conv2d(32, 64, 4, 2, 1), nn.BatchNorm2d(64), nn.LeakyReLU(0.2),
                                 nn.Conv2d(64, 1, 3, 1, 1))

    def forward(self, x):
        return self.net(x)


def make_g_loss(perc_w=1.0, gan=False, disc_start=int(os.environ.get("AV_DISC_START", 2500)), disc_w=0.5):
    st = {"step": 0}

    def loss_fn(m, b):
        x = b[0]
        logits, idx, aux, logs = m(x)
        rec = recon_bce(logits, x)
        img = to_image(logits)
        p = lpips(img, x).mean() * 1024 * perc_w           # scaled to the same per-image units as the 1,024-pixel BCE
        nll = rec + p
        loss = nll + aux
        out = {"rec": rec.item(), "lpips": p.item() / 1024 / max(perc_w, 1e-9), "used_in_batch": float(torch.unique(idx).numel())}
        st["step"] += 1
        if gan:
            if "D" not in st:
                st["D"] = PatchD().to(x.device)
                st["opt"] = torch.optim.Adam(st["D"].parameters(), lr=2e-4, betas=(0.5, 0.9))
            D = st["D"]
            if st["step"] > disc_start:
                # discriminator step first (hinge loss, on detached reconstructions), then the generator's term
                dl = 0.5 * (F.relu(1 - D(x)).mean() + F.relu(1 + D(img.detach())).mean())
                st["opt"].zero_grad(set_to_none=True); dl.backward(); st["opt"].step()
                g = -D(img).mean()
                last = m.ae.dec.net[-1].weight
                gn = torch.autograd.grad(nll, last, retain_graph=True)[0].norm()
                gg = torch.autograd.grad(g, last, retain_graph=True)[0].norm()
                lam = (gn / (gg + 1e-4)).clamp(0, 1e4).detach() * disc_w   # taming/ldm calculate_adaptive_weight
                loss = loss + lam * g
                out.update({"g": g.item(), "d": dl.item(), "lam": lam.item()})
        out["loss"] = loss.item()
        return loss, out
    return loss_fn


# ---------------- posterior collapse: PixelCNN decoder with three KL treatments
def make_c_loss(kind, steps=STEPS, anneal_frac=0.5, free_bits=0.5):
    st = {"step": 0}

    def loss_fn(m, b):
        x = b[0]
        if kind == "noz":
            z = torch.zeros(x.shape[0], m.zdim, device=x.device)
            logits = m.decoder(x, z); rec = recon_bce(logits, x)
            return rec, {"loss": rec.item(), "rec": rec.item(), "kl": 0.0}
        logits, mu, logvar = m(x)
        rec = recon_bce(logits, x)
        kl_dim = 0.5 * (mu.pow(2) + logvar.exp() - 1 - logvar).mean(0)    # nats per dimension, batch mean
        kl = kl_dim.sum()
        st["step"] += 1
        if kind == "b1":
            klterm, w = kl, 1.0
        elif kind == "anneal":                                          # KL cost annealing, Bowman et al. 2016
            w = min(1.0, st["step"] / (anneal_frac * steps)); klterm = w * kl
        elif kind == "freebits":                                        # Kingma et al. 2016 (IAF), free bits per dim
            klterm, w = torch.clamp(kl_dim, min=free_bits).sum(), 1.0
        loss = rec + klterm
        return loss, {"loss": loss.item(), "rec": rec.item(), "kl": kl.item(), "kl_weight": w,
                      "active_batch": float((mu.var(0) > 0.01).sum())}
    return loss_fn


# ---------------- the ELBO's units: what the reconstruction term's reduction and likelihood do to the KL weight
def make_e_loss(kind, sigma=1.0):
    def loss_fn(m, b):
        x = b[0]
        logits, mu, logvar = m(x)
        kl = 0.5 * (mu.pow(2) + logvar.exp() - 1 - logvar).flatten(1).sum(1).mean()   # summed over the 16 dims
        if kind == "meanred":       # the tutorial bug: per-pixel MEAN reconstruction + per-image SUM KL
            rec = F.binary_cross_entropy_with_logits(logits, (x + 1) / 2)              # reduction="mean"
        else:                       # Gaussian decoder with fixed sigma: -log p = sum (x - xhat)^2 / (2 sigma^2) + const
            xhat = to_image(logits)
            rec = (x - xhat).pow(2).flatten(1).sum(1).mean() / (2 * sigma ** 2)
        loss = rec + kl
        return loss, {"loss": loss.item(), "rec": rec.item(), "kl": kl.item()}
    return loss_fn


RUNS = {
    "q_vq_ema":         (lambda: QAE(VQ(128, 8, mode="ema")), q_loss),
    "q_vq_l2":          (lambda: QAE(VQ(128, 8, mode="l2")), q_loss),
    "q_fsq125":         (lambda: QAE(FSQ((5, 5, 5))), q_loss),
    "q_lfq7":           (lambda: QAE(LFQ(7)), q_loss),
    "q_lfq7_noent":     (lambda: QAE(LFQ(7, entropy_weight=0.0)), q_loss),
    "q_vq1024_plain":   (lambda: QAE(VQ(1024, 8, mode="plain")), q_loss),
    "q_vq1024_restart": (lambda: QAE(VQ(1024, 8, mode="restart")), q_loss),
    "q_fsq1000":        (lambda: QAE(FSQ((8, 5, 5, 5))), q_loss),
    "q_lfq10":          (lambda: QAE(LFQ(10)), q_loss),
    "g_lpips":          (lambda: QAE(VQ(128, 8, mode="restart")), make_g_loss(1.0, gan=False)),
    "g_lpips_gan":      (lambda: QAE(VQ(128, 8, mode="restart")), make_g_loss(1.0, gan=True)),
    "e_meanred":        (lambda: __import__("nets").ConvVAE(latent_dim=16), make_e_loss("meanred")),
    "e_mse_s1":         (lambda: __import__("nets").ConvVAE(latent_dim=16), make_e_loss("mse", 1.0)),
    "e_mse_s0p1":       (lambda: __import__("nets").ConvVAE(latent_dim=16), make_e_loss("mse", 0.1)),
    "c_b1":             (lambda: PixelVAE(16), make_c_loss("b1")),
    "c_anneal":         (lambda: PixelVAE(16), make_c_loss("anneal")),
    "c_freebits":       (lambda: PixelVAE(16), make_c_loss("freebits")),
    "c_noz":            (lambda: PixelVAE(16), make_c_loss("noz")),
}


def main(names, steps=STEPS):
    cap_threads(4)
    dev = device(os.environ.get("AV_DEV", "mps"))
    out = os.path.join(HERE, "runs"); os.makedirs(out, exist_ok=True)
    os.makedirs(scratch("av", "ckpt"), exist_ok=True); os.makedirs(scratch("av", "logs"), exist_ok=True)
    xtr, ytr = load_split("train")
    for name in names:
        make, loss = RUNS[name]
        seed_all(0)
        model = make()
        print(f"== av {name}: {n_params(model):,} parameters, {steps} steps", flush=True)
        log_path = scratch("av", "logs", f"{name}.jsonl")
        with PeakMem() as pm:
            model, _, info = fit(model, loss, batches(xtr, ytr, 128, seed=0), dev, steps=steps, lr=1e-3,
                                 log_path=log_path, log_every=50, prefix="av")
        torch.save(model.state_dict(), scratch("av", "ckpt", f"{name}.pt"))
        r = {"run": name, "params": n_params(model), "steps": info["steps"], "seconds": info["seconds"],
             "steps_per_s": round(info["steps"] / info["seconds"], 1), "batch": 128, "lr": 1e-3,
             "last_log": info["log"][-1], "peak_mps_mb": pm.peak_mb, "device": str(dev), "torch": torch.__version__,
             "machine": MACHINE, "date": time.strftime("%Y-%m-%d")}
        if hasattr(model, "q"):
            r["alive_log"] = model.q.alive_log; r["K"] = model.q.K
        json.dump(r, open(os.path.join(out, name + ".json"), "w"), indent=1)
        shutil.copy(log_path, os.path.join(out, name + ".jsonl"))
        print("done", name, json.dumps({k: r[k] for k in ("seconds", "last_log", "peak_mps_mb")}), flush=True)
        del model; empty_cache()


if __name__ == "__main__":
    main(sys.argv[1].split(","), int(sys.argv[2]) if len(sys.argv) > 2 else STEPS)
