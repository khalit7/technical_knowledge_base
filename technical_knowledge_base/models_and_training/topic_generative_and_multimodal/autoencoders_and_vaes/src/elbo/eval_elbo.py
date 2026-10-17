"""Evaluate the ELBO-units runs (e_*) on CPU, with the same measures as the root's Latent lab (src/latent/eval_lt.py).

  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I elbo/eval_elbo.py
On the 10,000 test images: PSNR of the reconstruction from mu (28x28 crop, uint8), KL per image (nats), active units
(Var_x mu_j > 0.01), and 1,000 decoded prior draws scored by the topic's classifier (fd_fmnist). The prior draws are
the Latent lab's own (seed_all(0), then torch.randn(1000, 16)), so the numbers compare with its vae16_b* runs.
Writes out/elbo.json and GM_SCRATCH/av/elbo.npz.
"""
import json, os, sys

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
sys.path[:0] = [os.path.join(SRC, "..", "..", "src", "data")]
from common import cap_threads, load_split, to_model, from_model, test16, scratch, seed_all
from nets import ConvVAE
from objectives import to_image
import fid as F

cap_threads(4)
torch.set_grad_enabled(False)


def psnr_u8(a, b):
    mse = ((a.astype(np.float64) - b.astype(np.float64)) ** 2).reshape(len(a), -1).mean(1)
    return 10 * np.log10(255 ** 2 / np.maximum(mse, 1e-10))


def main(names):
    xte, _ = load_split("test"); Xte = to_model(xte)
    _, _, idx16 = test16()
    clf = F.load_classifier("cpu")
    seed_all(0); Z16 = torch.randn(1000, 16)
    out, arrs = {"runs": {}}, {}
    for name in names:
        m = ConvVAE(latent_dim=16); m.load_state_dict(torch.load(scratch("av", "ckpt", f"{name}.pt"), map_location="cpu")); m.eval()
        meta = json.load(open(os.path.join(SRC, "runs", name + ".json")))
        mus, lvs, rec = [], [], []
        for i in range(0, len(Xte), 1000):
            mu, lv = m.encode(Xte[i:i + 1000]); mus.append(mu); lvs.append(lv)
            rec.append(from_model(to_image(m.decode(mu))))
        mu, lv, rec = torch.cat(mus), torch.cat(lvs), np.concatenate(rec)
        kl_dim = 0.5 * (mu.pow(2) + lv.exp() - 1 - lv).mean(0)
        prior = from_model(to_image(m.decode(Z16)))
        fd, _ = F.fd_fmnist(prior, clf, "cpu")
        r = {"params": meta["params"], "train_seconds": meta["seconds"], "last_log": meta["last_log"],
             "test_psnr_db": round(float(psnr_u8(xte, rec).mean()), 2), "test_kl_nats": round(float(kl_dim.sum()), 2),
             "kl_per_dim": [round(float(v), 3) for v in kl_dim], "active_units": int((mu.var(0) > 0.01).sum()),
             "prior_fd": round(fd, 1)}
        arrs[name + "_rec16"] = rec[idx16]; arrs[name + "_prior"] = prior[:16]
        out["runs"][name] = r
        print(name, {k: v for k, v in r.items() if k != "kl_per_dim"}, flush=True)
    os.makedirs(os.path.join(SRC, "out"), exist_ok=True)
    json.dump(out, open(os.path.join(SRC, "out", "elbo.json"), "w"), indent=1)
    np.savez_compressed(scratch("av", "elbo.npz"), **arrs)


if __name__ == "__main__":
    main(sys.argv[1].split(",") if len(sys.argv) > 1 else ["e_meanred", "e_mse_s1", "e_mse_s0p1"])
