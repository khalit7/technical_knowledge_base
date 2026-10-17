"""Exact FLOPs of one denoiser pass for every model on this page, on a grid of resolutions and text lengths, plus a
fitted formula the page's calculator uses (meta tensors; CPU only, about a minute).

FLOPs(N, T) = k0 + k1 N + k2 T + k3 N^2 + k4 N T + k5 T^2, with N = image positions per pass (latent positions / patch^2)
and T = text tokens. The form is exact for a transformer (linear layers grow with N and T, attention with (N + T)^2
for joint attention or N T for cross-attention) and for a U-Net (convolutions grow with N, attention with N^2 per
level). Fitted by least squares on the grid; the worst relative residual over the grid is written out.
    GM_SCRATCH=... DIT_SRC=$GM_SCRATCH/src/DiT nice -n 15 $GM_SCRATCH/venv/bin/python -I flops_all.py
Writes ../out/flops.json.
"""
import json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np, torch
from configs import MODELS
from params_build import build
from fwd_meta import count

torch.set_num_threads(2)
RES = [256, 384, 512, 640, 768, 896, 1024, 1280, 1536, 2048]
out = {"date": time.strftime("%Y-%m-%d"), "torch": torch.__version__, "res": RES, "models": {}}
for key, label, cls, cfg, kind, ch, f, p, te, ntxt in MODELS:
    m = build(key)
    Ts = [ntxt] if kind in ("unet", "dit") else sorted({77, 128, 256, 512, ntxt})
    rows = []
    for T in Ts:
        for r in RES:
            if key == "dit" and r > 1024:
                continue
            tot, by = count(key, m, r, T)
            N = (r // f // (p or 1)) ** 2
            rows.append({"res": r, "T": T, "N": N, "flops": tot, "bmm": by.get("aten.bmm", 0)})
    X = np.array([[1, q["N"], q["T"], q["N"] ** 2, q["N"] * q["T"], q["T"] ** 2] for q in rows], dtype=np.float64)
    y = np.array([q["flops"] for q in rows], dtype=np.float64)
    use = [0, 1, 3] if len(Ts) == 1 else list(range(6))
    sc = np.abs(X[:, use]).max(0)
    k, *_ = np.linalg.lstsq(X[:, use] / sc, y, rcond=None); k = k / sc
    kk = [0.0] * 6
    for i, j in enumerate(use):
        kk[j] = float(k[i])
    pred = X @ np.array(kk)
    worst = float(np.max(np.abs(pred - y) / y))
    out["models"][key] = {"label": label, "kind": kind, "f": f, "patch": p, "latent_ch": ch, "text_default": ntxt,
                          "grid": rows, "fit": kk, "fit_worst_rel": worst}
    one = [q for q in rows if q["res"] == 1024 and q["T"] == ntxt]
    print(key, "1024:", round(one[0]["flops"] / 1e12, 2) if one else "-", "TFLOP; fit worst", f"{worst:.2e}", flush=True)
    del m
json.dump(out, open(os.path.join(HERE, "..", "out", "flops.json"), "w"), indent=0)
