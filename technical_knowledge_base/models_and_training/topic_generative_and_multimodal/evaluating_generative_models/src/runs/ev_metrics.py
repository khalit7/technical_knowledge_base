"""Every metric on every set at several sample counts N, CPU only (numpy/scipy float64, 4 threads).

    python -I ev_metrics.py
Inputs: GM_SCRATCH/ev/sets.npz (ev_gen.py) and feat_{inception,dino,clipL}.npz (ev_feats.py).
Reference: always the full 10,000 test images; the evaluated set is a random subset of N of its 10,000 images
(N = 250, 500, 1,000, 2,000, 5,000: three draws, seeds 0..2; N = 10,000: the whole set).

Metrics (each written out by hand here and checked against a reference implementation in checks):
  FID       Frechet distance of Inception features (Heusel et al. 2017). tr sqrtm(S1 S2) is computed as the sum of
            square roots of the eigenvalues of A S2 A with A = sqrtm(S_ref) (same value as scipy's sqrtm, checked).
  FD_DINOv2 the same formula on DINOv2 ViT-B/14 [CLS] features (Stein et al. 2023 use ViT-L/14).
  FD_clf    the same formula on the topic's Fashion-MNIST classifier (128-d), the labs' fd_fmnist.
  KID       unbiased MMD^2 with the cubic polynomial kernel (x.y/d + 1)^3 on Inception features, averaged over 100
            random subsets of size m = min(1000, N) per side (torch-fidelity 0.4.0 defaults); reported x 1000.
  CMMD      MMD with a Gaussian RBF kernel, sigma 10, on L2-normalised CLIP embeddings, the biased (all pairs, diagonal
            included) estimator, x 1000: the official google-research cmmd/distance.py. Features: CLIP ViT-B/32 for the
            sweep (the paper's ViT-L/14@336 ran at about 10 images/s here); L/14@336 on 1,000 images per set as a check.
  P / R     improved precision and recall (Kynkaanniemi et al. 2019), k = 3 nearest-neighbour balls, equal N on
            both sides; in Inception space (the paper used VGG-16 features) and in DINOv2 space.
Writes out/metrics.json.
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ev_env import ev_scratch, dump, SETS
import numpy as np
from scipy import linalg
import torch
from common import cap_threads, load_split, MACHINE

cap_threads(4)
torch.set_grad_enabled(False)
NS = [250, 500, 1000, 2000, 5000, 10000]
MAIN = list(SETS)


def stats(f):
    f = f.astype(np.float64)
    return f.mean(0), np.cov(f, rowvar=False)


class FD:
    """Frechet distance to one fixed reference, fast: precompute A = sqrtm(S_ref)."""
    def __init__(self, ref):
        self.mu, self.S = stats(ref)
        w, V = np.linalg.eigh(self.S)
        self.A = (V * np.sqrt(np.clip(w, 0, None))) @ V.T
        self.trS = np.trace(self.S)

    def __call__(self, f):
        mu, S = stats(f)
        ev = np.linalg.eigvalsh(self.A @ S @ self.A)
        d = mu - self.mu
        return float(d @ d + np.trace(S) + self.trS - 2 * np.sqrt(np.clip(ev, 0, None)).sum())


def fd_scipy(f, ref):                 # the topic's fid.frechet formula, for the check
    import fid
    return fid.frechet(*stats(f), *stats(ref))


def poly(X, Y):
    return (X @ Y.T / X.shape[1] + 1.0) ** 3


def kid_from_kernels(Kgg, Kgr, Krr, ig_all, n, rng, subsets=100):
    """torch-fidelity's kid_features_to_metric with precomputed kernels: unbiased MMD^2 on random subsets."""
    m = min(1000, n); vals = []
    for _ in range(subsets):
        a = ig_all[rng.choice(n, m, replace=False)]            # rows of the generated set (within the N drawn)
        b = rng.choice(Krr.shape[0], m, replace=False)
        kxx = Kgg[np.ix_(a, a)]; kyy = Krr[np.ix_(b, b)]; kxy = Kgr[np.ix_(a, b)]
        vals.append((kxx.sum() - np.trace(kxx)) / (m * (m - 1)) + (kyy.sum() - np.trace(kyy)) / (m * (m - 1)) - 2 * kxy.mean())
    v = np.array(vals)
    return float(v.mean()), float(v.std())


def rbf(X, Y, sigma=10.0):
    d = (X * X).sum(1)[:, None] + (Y * Y).sum(1)[None, :] - 2 * X @ Y.T
    return np.exp(-d / (2 * sigma ** 2))


def knn_radius(X, k=3, bs=2000):
    r = np.empty(len(X))
    sq = (X * X).sum(1)
    for i in range(0, len(X), bs):
        d = sq[i:i + bs, None] + sq[None, :] - 2 * X[i:i + bs] @ X.T
        r[i:i + bs] = np.sqrt(np.clip(np.partition(d, k, axis=1)[:, k], 0, None))   # index 0 is the point itself
    return r


def coverage_of(Q, P, rP, bs=2000):
    """share of rows of Q inside at least one ball (P_j, rP_j)"""
    sqP = (P * P).sum(1); hit = 0
    for i in range(0, len(Q), bs):
        q = Q[i:i + bs]
        d = np.sqrt(np.clip((q * q).sum(1)[:, None] + sqP[None, :] - 2 * q @ P.T, 0, None))
        hit += int((d <= rP[None, :]).any(1).sum())
    return hit / len(Q)


def prec_rec(G, R):
    G = G.astype(np.float64); R = R.astype(np.float64)
    return coverage_of(G, R, knn_radius(R)), coverage_of(R, G, knn_radius(G))


t0 = time.time()
sets = dict(np.load(ev_scratch("sets.npz")))
FI = dict(np.load(ev_scratch("feat_inception.npz")))
FDN = dict(np.load(ev_scratch("feat_dino.npz")))
FC = dict(np.load(ev_scratch("feat_clipB.npz")))      # CMMD sweep on CLIP B/32 (L/14-336 too slow here: see the check below)
FL = dict(np.load(ev_scratch("feat_clipL.npz")))      # L/14-336 on the same 1,000-image subset of every set
for k in FC:
    FC[k] = (FC[k] / np.linalg.norm(FC[k], axis=1, keepdims=True)).astype(np.float64)

# classifier features (the labs' fd_fmnist space), CPU
import fid
clf = fid.load_classifier("cpu")
xte, yte = load_split("test")
FK = {"test": fid.classifier_features(xte, clf, "cpu")[0]}
for k in MAIN:
    FK[k] = fid.classifier_features(sets[k], clf, "cpu")[0]

out = {"machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "ns": NS, "sets": {k: SETS[k] for k in MAIN},
       "reference": "the 10,000 Fashion-MNIST test images", "metrics": {}, "checks": {}}
fdI, fdD, fdK = FD(FI["test"]), FD(FDN["test"]), FD(FK["test"])

# checks against the reference implementations
out["checks"]["fid_fast_vs_scipy_real"] = [round(fdI(FI["real"]), 6), round(fd_scipy(FI["real"], FI["test"]), 6)]
out["checks"]["fid_fast_vs_scipy_vae_1000"] = [round(fdI(FI["vae"][:1000]), 6), round(fd_scipy(FI["vae"][:1000], FI["test"]), 6)]
from torch_fidelity.metric_kid import kid_features_to_metric
# the sets are sorted by class (1,000 per class), so the subset must be random: the first 2,000 are classes 0 and 1 only
IX2 = np.random.default_rng(0).choice(10000, 2000, replace=False)
tf = kid_features_to_metric(torch.from_numpy(FI["ddim"][IX2]), torch.from_numpy(FI["test"]), verbose=False)
out["checks"]["kid_torch_fidelity_ddim_2000"] = {k: float(v) for k, v in tf.items()}
tf = kid_features_to_metric(torch.from_numpy(FI["ddim"][:2000]), torch.from_numpy(FI["test"]), verbose=False)
out["checks"]["kid_torch_fidelity_ddim_first2000_two_classes"] = {k: float(v) for k, v in tf.items()}

Krr_I = poly(FI["test"].astype(np.float64), FI["test"].astype(np.float64))      # 800 MB, kept
crr = rbf(FC["test"], FC["test"]).mean()                                       # CMMD kernels: computed per draw, not kept
print(f"reference kernels ready, {time.time() - t0:.0f} s", flush=True)

for k in MAIN:
    G = FI[k].astype(np.float64)
    Kgg = poly(G, G); Kgr = poly(G, FI["test"].astype(np.float64))
    Cg = FC[k]
    rows = {m: [] for m in ("fid", "fd_dino", "fd_clf", "kid", "kid_sd", "cmmd")}
    for n in NS:
        draws = [np.arange(10000)] if n == 10000 else [np.random.default_rng(s).choice(10000, n, replace=False) for s in range(3)]
        vals = {m: [] for m in rows}
        for s, ix in enumerate(draws):
            vals["fid"].append(fdI(FI[k][ix])); vals["fd_dino"].append(fdD(FDN[k][ix])); vals["fd_clf"].append(fdK(FK[k][ix]))
            km, ks = kid_from_kernels(Kgg, Kgr, Krr_I, ix, n, np.random.default_rng(100 + s))
            vals["kid"].append(km * 1000); vals["kid_sd"].append(ks * 1000)
            vals["cmmd"].append(1000 * (rbf(Cg[ix], Cg[ix]).mean() + crr - 2 * rbf(Cg[ix], FC["test"]).mean()))
        for m in rows:
            rows[m].append([round(v, 4) for v in vals[m]])
    pr = {}
    pr["inception_10000"] = prec_rec(FI[k], FI["test"])
    pr["dino_10000"] = prec_rec(FDN[k], FDN["test"])
    pr["inception_1000"] = []
    for s in range(3):
        ig = np.random.default_rng(s).choice(10000, 1000, replace=False)
        ir = np.random.default_rng(50 + s).choice(10000, 1000, replace=False)
        pr["inception_1000"].append(prec_rec(FI[k][ig], FI["test"][ir]))
    del Kgg, Kgr
    out["metrics"][k] = {**rows, "pr": pr}
    print(k, {m: rows[m][-1] for m in rows}, pr["inception_10000"], f"{time.time() - t0:.0f} s", flush=True)

# pitfalls: FID (and FD-DINOv2 / CMMD where the variant exists) against a reference processed one way or another
pit = {}
fd_refJ = FD(FI["test_jpeg75"]); fd_refB = FD(FI["test_bic299"])
for name, f, ref in [("real", "real", "test"), ("real_jpeg90", "real_jpeg90", "test"), ("real_jpeg75", "real_jpeg75", "test"),
                     ("real_jpeg50", "real_jpeg50", "test"), ("real_jpeg75_vs_test_jpeg75", "real_jpeg75", "test_jpeg75"),
                     ("real_bic299", "real_bic299", "test"), ("real_near299", "real_near299", "test"),
                     ("real_bic299_vs_test_bic299", "real_bic299", "test_bic299"), ("real_vs_test_bic299", "real", "test_bic299"),
                     ("ddpm", "ddpm", "test"), ("ddpm_jpeg75", "ddpm_jpeg75", "test"), ("ddpm_vs_test_jpeg75", "ddpm", "test_jpeg75"),
                     ("ddpm_jpeg75_vs_test_jpeg75", "ddpm_jpeg75", "test_jpeg75"),
                     ("flow", "flow", "test"), ("flow_jpeg75", "flow_jpeg75", "test"), ("flow_vs_test_jpeg75", "flow", "test_jpeg75"),
                     ("flow_jpeg75_vs_test_jpeg75", "flow_jpeg75", "test_jpeg75")]:
    fd = {"test": fdI, "test_jpeg75": fd_refJ, "test_bic299": fd_refB}[ref]
    pit[name] = {"fid": round(fd(FI[f]), 3), "set": f, "ref": ref}
pit["real_jpeg75"]["fd_dino"] = round(fdD(FDN["real_jpeg75"]), 3)
pit["real"]["fd_dino"] = round(fdD(FDN["real"]), 3)
for nm in ("real", "real_jpeg75"):
    C = FC[nm]; pit[nm]["cmmd"] = round(1000 * (rbf(C, C).mean() + crr - 2 * rbf(C, FC["test"]).mean()), 4)
out["pitfalls"] = pit

# CMMD's kernel on unit vectors with sigma 10 is nearly linear: CMMD ~ 1000 * |mu_g - mu_r|^2 / sigma^2 = 10 |mu_g - mu_r|^2
lin = {}
for k in ("real", "ddpm", "vae"):
    C = FC[k]; mu = C.mean(0); mr = FC["test"].mean(0)
    lin[k] = {"cmmd": out["metrics"][k]["cmmd"][-1][0],
              "10_x_mean_gap_sq": round(1000 / 100 * float((mu - mr) @ (mu - mr)), 4)}   # 1000 * 2 / (2 sigma^2) * gap^2
out["checks"]["cmmd_vs_linear_approx_10000"] = lin
# CMMD with the paper's CLIP L/14-336 against B/32, both on the same 1,000-image subset (seed 0) of each set and of the reference
SUB = np.random.default_rng(0).choice(10000, 1000, replace=False)
def cmmd(A, B):
    return 1000 * (rbf(A, A).mean() + rbf(B, B).mean() - 2 * rbf(A, B).mean())
un = lambda a: (a / np.linalg.norm(a, axis=1, keepdims=True)).astype(np.float64)
out["checks"]["cmmd_L14_vs_B32_1000"] = {k: {"L14_336": round(cmmd(un(FL[k]), un(FL["test"])), 4), "B32": round(cmmd(FC[k][SUB], FC["test"][SUB]), 4)}
                                         for k in FL if k != "test"}
out["seconds"] = round(time.time() - t0, 1)
dump("metrics.json", out)
