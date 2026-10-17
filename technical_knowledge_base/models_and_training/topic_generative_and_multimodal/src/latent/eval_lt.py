"""Latent lab: evaluate the trained tiny models on CPU (no GPU needed) and write the page's numbers and image strips.

  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I eval_lt.py
Reads GM_SCRATCH/ckpt/lt_<run>.pt for every src/latent/runs/<run>.json. Writes src/latent/out/tiny.json and
uint8 image arrays to GM_SCRATCH/lt/tiny.npz (make_data.py turns them into small PNG strips for the page).

Measures, all on the 10,000 test images unless said otherwise:
- reconstruction: Bernoulli NLL in nats per image (the training loss), PSNR on the 28x28 crop (uint8)
- VAE: KL per image, KL per latent dimension, active units (Burda et al. 2015, arXiv:1509.00519: Var_x E[z_j|x] > 0.01)
- generation: 1,000 codes from N(0, I) decoded (and for plain autoencoders also from a Gaussian fitted to the codes of
  10,000 training images); scored by the topic's Fashion-MNIST classifier: Frechet distance in its 128-d feature space
  to the test set (fd_fmnist), its mean top-class probability, and the share of each predicted class. The floor is
  1,000 real validation images scored the same way.
- VQ-VAE: code usage over the test set (codes used, perplexity = exp(entropy of usage)).
"""
import json, math, os, sys

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data")); sys.path.insert(0, HERE)
from common import cap_threads, load_split, to_model, from_model, test16, scratch, seed_all
from nets import ConvAE, ConvVAE
from objectives import to_image
from vq import VQVAE
import fid as F

cap_threads(4)
torch.set_grad_enabled(False)
dev = torch.device("cpu")
RUNS = sorted(f[:-5] for f in os.listdir(os.path.join(HERE, "runs")) if f.endswith(".json"))
xte, yte = load_split("test"); xva, yva = load_split("val"); xtr, ytr = load_split("train")
x16, y16, idx16 = test16()
Xte = to_model(xte)
clf = F.load_classifier("cpu")
out = {"runs": {}, "test16_indices": idx16.tolist()}
arrs = {}


def u8(logits):
    return from_model(to_image(logits))


def psnr_u8(a, b):
    mse = ((a.astype(np.float64) - b.astype(np.float64)) ** 2).reshape(len(a), -1).mean(1)
    return 10 * np.log10(255 ** 2 / np.maximum(mse, 1e-10))


def score(imgs):
    fd, _ = F.fd_fmnist(imgs, clf, dev)
    f, lg = F.classifier_features(imgs, clf, dev)
    p = torch.softmax(torch.from_numpy(lg), 1)
    share = np.bincount(p.argmax(1).numpy(), minlength=10) / len(imgs)
    ent = -(share[share > 0] * np.log(share[share > 0])).sum()
    return {"fd": round(fd, 1), "conf": round(float(p.max(1).values.mean()), 3),
            "class_share": [round(float(s), 3) for s in share], "class_entropy_nats": round(float(ent), 3)}


def batched(fn, X, bs=1000):
    return [fn(X[i:i + bs]) for i in range(0, len(X), bs)]


def bce_per_image(logits, X):
    return torch.nn.functional.binary_cross_entropy_with_logits(logits, (X + 1) / 2, reduction="none").flatten(1).sum(1)


# floor: real images scored the same way
out["floor_real_val_1000"] = score(xva[:1000])
print("floor", out["floor_real_val_1000"], flush=True)
seed_all(0)
Z16 = torch.randn(1000, 16); Z2 = torch.randn(1000, 2)

for name in RUNS:
    meta = json.load(open(os.path.join(HERE, "runs", name + ".json")))
    sd = torch.load(scratch("ckpt", f"lt_{name}.pt"), map_location="cpu")
    if name.startswith("vq"):
        m = VQVAE(K=128, D=8); m.load_state_dict(sd, strict=False)
    elif name.startswith("vae"):
        m = ConvVAE(latent_dim=2 if name == "vae2" else 16); m.load_state_dict(sd)
    else:
        m = ConvAE(latent_dim=2 if name == "ae2" else 16); m.load_state_dict(sd)
    m.eval()
    r = {"params": meta["params"], "steps": meta["steps"], "train_seconds": meta["seconds"], "beta": meta.get("beta"),
         "last_train_log": meta["last_log"]}
    rec_u8, nll, codes, mus, lvs, toks = [], [], [], [], [], []
    for i in range(0, len(Xte), 1000):
        X = Xte[i:i + 1000]
        if name.startswith("vq"):
            ze = m.ae.encode(X); zq, idx = m.quantize(ze); lg = m.ae.decode(zq); toks.append(idx)
        elif name.startswith("vae"):
            mu, lv = m.encode(X); lg = m.decode(mu); mus.append(mu); lvs.append(lv)
        else:
            z = m.encode(X); lg = m.decode(z); codes.append(z)
        rec_u8.append(u8(lg)); nll.append(bce_per_image(lg, X))
    rec_u8 = np.concatenate(rec_u8); nll = torch.cat(nll)
    ps = psnr_u8(xte, rec_u8)
    r["test_nll_nats"] = round(float(nll.mean()), 2)
    r["test_psnr_db"] = round(float(ps.mean()), 2)
    r["test16_psnr_db"] = [round(float(v), 2) for v in ps[idx16]]
    arrs[f"{name}_rec16"] = rec_u8[idx16]
    if name.startswith("vae"):
        mu = torch.cat(mus); lv = torch.cat(lvs)
        kl_dim = 0.5 * (mu.pow(2) + lv.exp() - 1 - lv).mean(0)
        r["test_kl_nats"] = round(float(kl_dim.sum()), 2)
        r["test_neg_elbo_nats_beta1"] = round(float(nll.mean() + kl_dim.sum()), 2)
        r["kl_per_dim"] = [round(float(v), 3) for v in kl_dim]
        r["active_units"] = int((mu.var(0) > 0.01).sum())
        r["posterior_sigma_mean"] = round(float((0.5 * lv).exp().mean()), 4)
        i16 = torch.from_numpy(idx16)
        r["mu16"] = [[round(float(v), 3) for v in row] for row in mu[i16]]
        r["sigma16"] = [[round(float(v), 3) for v in row] for row in (0.5 * lv[i16]).exp()]
        zp = Z2 if name == "vae2" else Z16
        prior = u8(m.decode(zp))
        r["prior"] = score(prior)
        arrs[f"{name}_prior"] = prior[:16]
        if name == "vae2":
            arrs["vae2_mu_test"] = mu.numpy(); arrs["vae2_sigma_test"] = (0.5 * lv).exp().numpy()
    elif name.startswith("ae"):
        z = torch.cat(codes)
        zp = Z2 if name == "ae2" else Z16
        prior = u8(m.decode(zp))
        r["prior_std_normal"] = score(prior)
        ztr = torch.cat([m.encode(to_model(xtr[i:i + 1000])) for i in range(0, 10000, 1000)])
        mu_, cov = ztr.mean(0), torch.cov(ztr.T)
        L = torch.linalg.cholesky(cov + 1e-5 * torch.eye(len(mu_)))
        fit = u8(m.decode(mu_ + zp @ L.T))
        r["prior_fitted_gaussian"] = score(fit)
        r["code16"] = [[round(float(v), 3) for v in row] for row in z[torch.from_numpy(idx16)]]
        r["code_mean"] = [round(float(v), 3) for v in z.mean(0)]
        r["code_std"] = [round(float(v), 3) for v in z.std(0)]
        arrs[f"{name}_prior"] = prior[:16]; arrs[f"{name}_fit"] = fit[:16]
        if name == "ae2":
            arrs["ae2_z_test"] = z.numpy()
    else:
        t = torch.cat(toks).flatten()
        cnt = torch.bincount(t, minlength=128).double()
        pr = cnt / cnt.sum()
        ent = float(-(pr[pr > 0] * pr[pr > 0].log()).sum())
        r["codes_used_test"] = int((cnt > 0).sum())
        r["perplexity"] = round(math.exp(ent), 1)
        r["usage_counts"] = [int(v) for v in cnt]
        r["alive_log"] = meta.get("alive_log")
        r["tokens16"] = torch.cat(toks)[torch.from_numpy(idx16)].reshape(16, -1).tolist()
        r["bits_per_image"] = 64 * 7
    out["runs"][name] = r
    print(name, {k: v for k, v in r.items() if k not in ("usage_counts", "tokens16", "alive_log", "kl_per_dim", "last_train_log")}, flush=True)

    # 2-D latent grids (explorer) and features for the animation
    if name in ("ae2", "vae2"):
        if name == "vae2":
            lo = np.array([-3.0, -3.0]); hi = np.array([3.0, 3.0])
        else:
            zz = arrs["ae2_z_test"]
            lo = np.percentile(zz, 0.5, 0); hi = np.percentile(zz, 99.5, 0)
            pad = (hi - lo) * 0.08; lo, hi = lo - pad, hi + pad
        G = 20
        gx = np.linspace(lo[0], hi[0], G); gy = np.linspace(hi[1], lo[1], G)   # row 0 = top = high z2
        grid = torch.tensor([[a, b] for b in gy for a in gx], dtype=torch.float32)
        arrs[f"{name}_grid"] = u8(m.decode(grid))
        out["runs"][name]["grid"] = {"n": G, "lo": [round(float(v), 4) for v in lo], "hi": [round(float(v), 4) for v in hi]}

# interpolations, 16-d autoencoder vs 16-d VAE (beta 1) vs pixel cross-fade
pairs = [(1, 3), (7, 9), (0, 8), (5, 13)]     # positions in test16: trouser->dress, sneaker->ankle boot, T-shirt->bag, sandal->pullover
out["interp_pairs"] = pairs
ts = torch.linspace(0, 1, 9)
models = {}
for name in ("ae16", "vae16_b1p0"):
    sd = torch.load(scratch("ckpt", f"lt_{name}.pt"), map_location="cpu")
    mm = (ConvVAE if name.startswith("vae") else ConvAE)(latent_dim=16); mm.load_state_dict(sd); mm.eval(); models[name] = mm
X16 = to_model(x16)
for a, b in pairs:
    pix = from_model(torch.stack([(1 - t) * X16[a] + t * X16[b] for t in ts]))
    arrs[f"interp_pix_{a}_{b}"] = pix
    for name, mm in models.items():
        za = mm.encode(X16[a:a + 1]); zb = mm.encode(X16[b:b + 1])
        if isinstance(za, tuple):
            za, zb = za[0], zb[0]
        arrs[f"interp_{name}_{a}_{b}"] = u8(mm.decode(torch.cat([(1 - t) * za + t * zb for t in ts])))

json.dump(out, open(os.path.join(HERE, "out", "tiny.json"), "w"), indent=1)
os.makedirs(scratch("lt"), exist_ok=True)
np.savez_compressed(scratch("lt", "tiny.npz"), **arrs)
print("done", flush=True)
