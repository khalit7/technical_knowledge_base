"""Diffusion from zero: the exact-score toy (CPU, numpy, seconds).

A 1-D mixture of Gaussians has a closed-form noisy density p_t, so its denoiser (and score) is exact. We sample it with
DDIM (eta = 0, the probability-flow ODE) and the ancestral DDPM sampler (eta = 1), with the exact denoiser and with a
deliberately "hedging" one: the posterior over which mode x came from is softened by a temperature tau > 1, the kind of
error an under-trained network makes (it averages modes it cannot yet tell apart). The page's JavaScript runs the same
code; this script records reference numbers that the page check compares against.
Linear betas 1e-4..0.02, T = 1000, trailing timesteps, as in the root's samplers.py.
"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
W = np.array([0.5, 0.3, 0.2]); MU = np.array([-1.5, 0.6, 2.0]); SD = np.array([0.12, 0.3, 0.12])
T = 1000
betas = np.linspace(1e-4, 0.02, T); abar = np.cumprod(1 - betas)


def trailing(n):
    return [int(round(T - k * T / n)) - 1 for k in range(n)]


def x0hat(x, ab, tau=1.0):
    """E[x0 | x_t] for the mixture; tau > 1 softens the mode posterior (a hedging model)."""
    a = np.sqrt(ab); var = ab * SD ** 2 + (1 - ab)                       # p_t(x | k) = N(a mu_k, var_k)
    lg = np.log(W) - 0.5 * np.log(var) - 0.5 * (x[:, None] - a * MU) ** 2 / var
    lg = lg / tau
    lg -= lg.max(1, keepdims=True); r = np.exp(lg); r /= r.sum(1, keepdims=True)
    m = MU + a * SD ** 2 / var * (x[:, None] - a * MU)                  # E[x0 | x_t, k]
    return (r * m).sum(1)


def sample(n_steps, eta, tau, n=20000, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.standard_normal(n); ts = trailing(n_steps)
    for i, t in enumerate(ts):
        ab = abar[t]; abp = abar[ts[i + 1]] if i + 1 < n_steps else 1.0
        x0 = x0hat(x, ab, tau)
        eps = (x - np.sqrt(ab) * x0) / np.sqrt(1 - ab)
        sig = eta * np.sqrt((1 - abp) / (1 - ab) * (1 - ab / abp)) if i + 1 < n_steps else 0.0
        x = np.sqrt(abp) * x0 + np.sqrt(max(1 - abp - sig ** 2, 0)) * eps + sig * rng.standard_normal(n)
    return x


def density(x, lo=-3, hi=3.5, bins=130):
    h, e = np.histogram(x, bins=bins, range=(lo, hi), density=True)
    return h, e


def true_pdf(c):
    return (W / (SD * np.sqrt(2 * np.pi)) * np.exp(-0.5 * ((c[:, None] - MU) / SD) ** 2)).sum(1)


def scores(x):
    """Distance to the truth: total variation over the histogram, mass between modes, mode weights."""
    h, e = density(x); c = 0.5 * (e[1:] + e[:-1]); dx = e[1] - e[0]
    tv = 0.5 * np.abs(h - true_pdf(c)).sum() * dx
    near = np.abs(x[:, None] - MU) < 3 * SD
    between = float(1 - near.any(1).mean())
    wts = [float(near[:, k].mean()) for k in range(3)]
    return {"tv": round(float(tv), 4), "between": round(between, 4), "w": [round(v, 4) for v in wts],
            "std": round(float(x.std()), 4)}




def ddim_from(x, n_steps, tau):
    """Deterministic DDIM (eta 0) from given starting points: the JS check uses this."""
    ts = trailing(n_steps)
    for i, t in enumerate(ts):
        ab = abar[t]; abp = abar[ts[i + 1]] if i + 1 < n_steps else 1.0
        x0 = x0hat(x, ab, tau); eps = (x - np.sqrt(ab) * x0) / np.sqrt(1 - ab)
        x = np.sqrt(abp) * x0 + np.sqrt(1 - abp) * eps
    return x


def reference():
    """Fixed inputs and outputs for check_toy.mjs (JS port must match to 1e-9)."""
    grid = np.linspace(-3, 3, 13)
    ref = {"x0hat": [], "ddim": []}
    for t in [0, 100, 400, 700, 999]:
        for tau in [1.0, 2.5]:
            ref["x0hat"].append({"t": t, "tau": tau, "x": grid.tolist(), "y": x0hat(grid, abar[t], tau).tolist()})
    starts = np.linspace(-2.5, 2.5, 11)
    for n in [1, 4, 10, 50]:
        for tau in [1.0, 2.5]:
            ref["ddim"].append({"n": n, "tau": tau, "x": starts.tolist(), "y": ddim_from(starts.copy(), n, tau).tolist()})
    return ref


if __name__ == "__main__":
    out = {"mix": {"w": W.tolist(), "mu": MU.tolist(), "sd": SD.tolist()}, "runs": []}
    for tau in [1.0, 2.0, 4.0]:
        for eta in [0.0, 0.5, 1.0]:
            for n in [5, 10, 20, 50, 200, 1000]:
                r = {"tau": tau, "eta": eta, "steps": n, **scores(sample(n, eta, tau))}
                out["runs"].append(r); print(r, flush=True)
    json.dump(out, open(os.path.join(HERE, "..", "out", "gmm_toy.json"), "w"), indent=0)
    json.dump(reference(), open(os.path.join(HERE, "..", "out", "gmm_ref.json"), "w"))
