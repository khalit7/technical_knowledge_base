"""Evaluate the posterior-collapse runs on CPU (child page Autoencoders and VAEs, av).

  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I collapse/eval_collapse.py
On the 10,000 test images: reconstruction NLL with z = mu and with z sampled, KL per image and per dimension, the
negative ELBO, active units (Var_x mu_j > 0.01, Burda et al. 2015), and a direct test of whether the decoder uses z:
the NLL when each image's code is swapped for another test image's code (a shuffle), and with z = 0. If the decoder
ignores z, swapping costs nothing. Then decodes, one pixel at a time, the first 8 test images from their own codes
(mode "mean": each pixel set to its predicted probability, deterministic given z) and 8 draws from the prior.
Writes out/collapse.json and GM_SCRATCH/av/collapse.npz.
"""
import json, os, sys

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
sys.path[:0] = [os.path.join(SRC, "..", "..", "src", "data"), HERE]
from common import cap_threads, load_split, to_model, from_model, test16, scratch, seed_all
from pixelvae import PixelVAE

cap_threads(4)
torch.set_grad_enabled(False)
RUNS = ["c_b1", "c_anneal", "c_freebits", "c_noz"]


def nll(m, X, z):
    lg = m.decoder(X, z)
    return torch.nn.functional.binary_cross_entropy_with_logits(lg, (X + 1) / 2, reduction="none").flatten(1).sum(1)


def main(names):
    xte, _ = load_split("test"); Xte = to_model(xte)
    x16, y16, idx16 = test16()
    path = os.path.join(SRC, "out", "collapse.json")
    out = json.load(open(path)) if os.path.exists(path) else {"runs": {}}
    arrs = dict(np.load(scratch("av", "collapse.npz"))) if os.path.exists(scratch("av", "collapse.npz")) else {}
    for name in names:
        m = PixelVAE(16); m.load_state_dict(torch.load(scratch("av", "ckpt", f"{name}.pt"), map_location="cpu")); m.eval()
        meta = json.load(open(os.path.join(SRC, "runs", name + ".json")))
        seed_all(0)
        mus, lvs, n_mu, n_s, n_sh, n_0 = [], [], [], [], [], []
        g = torch.Generator().manual_seed(0)
        perm = torch.randperm(len(Xte), generator=g)
        for i in range(0, len(Xte), 500):
            X = Xte[i:i + 500]
            mu, lv = m.encode(X); mus.append(mu); lvs.append(lv)
        mu = torch.cat(mus); lv = torch.cat(lvs)
        if name == "c_noz":
            mu = torch.zeros_like(mu); lv = torch.zeros_like(lv)
        for i in range(0, len(Xte), 500):
            X = Xte[i:i + 500]; sl = slice(i, i + 500)
            zs = mu[sl] + torch.exp(0.5 * lv[sl]) * torch.randn_like(mu[sl]) if name != "c_noz" else mu[sl]
            n_mu.append(nll(m, X, mu[sl])); n_s.append(nll(m, X, zs))
            n_sh.append(nll(m, X, mu[perm[sl]])); n_0.append(nll(m, X, torch.zeros_like(mu[sl])))
        n_mu, n_s, n_sh, n_0 = (torch.cat(v).mean().item() for v in (n_mu, n_s, n_sh, n_0))
        kl_dim = 0.5 * (mu.pow(2) + lv.exp() - 1 - lv).mean(0)
        r = {"params": meta["params"], "train_seconds": meta["seconds"], "steps": meta["steps"],
             "nll_mu": round(n_mu, 2), "nll_sampled_z": round(n_s, 2), "nll_shuffled_z": round(n_sh, 2), "nll_z0": round(n_0, 2),
             "z_gain_nats": round(n_sh - n_mu, 2), "kl_nats": round(float(kl_dim.sum()), 3),
             "neg_elbo": round(n_s + float(kl_dim.sum()), 2), "kl_per_dim": [round(float(v), 3) for v in kl_dim],
             "active_units": int((mu.var(0) > 0.01).sum())}
        # training curves (every 50 steps) for the page
        log = [json.loads(l) for l in open(os.path.join(SRC, "runs", name + ".jsonl"))]
        r["curve"] = [[d["step"], round(d.get("kl", 0), 3), round(d["rec"], 2), d.get("kl_weight", 0)] for d in log[::2]]
        # decode one pixel at a time: 8 test images from their own codes, 8 prior draws
        i8 = torch.from_numpy(idx16[:8])
        own = m.sample(mu[i8], mode="mean")
        zp = torch.randn(8, 16, generator=torch.Generator().manual_seed(1))
        prior = m.sample(zp if name != "c_noz" else torch.zeros(8, 16), mode="mean")
        bern = m.sample(mu[i8], gen=torch.Generator().manual_seed(2), mode="bernoulli")
        arrs[name + "_own"] = from_model(own); arrs[name + "_prior"] = from_model(prior); arrs[name + "_bern"] = from_model(bern)
        out["runs"][name] = r
        print(name, {k: v for k, v in r.items() if k not in ("curve", "kl_per_dim")}, flush=True)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        json.dump(out, open(path, "w"), indent=1)
        np.savez_compressed(scratch("av", "collapse.npz"), **arrs)


if __name__ == "__main__":
    main(sys.argv[1].split(",") if len(sys.argv) > 1 else RUNS)
