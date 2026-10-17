"""Train the tiny token transformers at the Diffusion lab's training compute (MPS, under the bench lock; prefix nm).

  GM_SCRATCH=... GM_LOCK=.../lock.sh PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 nice -n 15 \
      $GM_SCRATCH/venv/bin/python -I train_ar.py ar_fsq1000,mask_fsq1000,ar_vq128
Recipe copied from the Diffusion lab's DDPM (root src/diff/train_ddpm.py, FACTS df): batch 128, AdamW lr 5e-4,
warm-up 200, gradient clipping 1.0, EMA 0.999, label dropout 0.1, seed 0, float32, the same minibatch order
(common.batches with seed 0). Steps chosen so that training FLOPs equal the DDPM's 4,000 steps of TinyUNet:
steps = 4000 x F_unet / F_transformer, with forward FLOPs per image from out/tokenize.json (FlopCounterMode for the
linear layers; attention added by formula, because the counter skips scaled_dot_product_attention).
Writes GM_SCRATCH/nm/ckpt/<run>.pt, runs/<run>.json and runs/<run>.jsonl here.
"""
import json, math, os, shutil, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
sys.path[:0] = [os.path.join(ROOT_SRC, "data"), HERE]
import numpy as np
import torch
import torch.nn.functional as F
from common import cap_threads, device, scratch, seed_all, PeakMem, MACHINE, empty_cache
from train import fit
from tinyar import TinyTokenTransformer, ar_loss, mask_loss

TOK = json.load(open(os.path.join(HERE, "..", "out", "tokenize.json")))
F_UNET = TOK["flops_unet_fwd_1"]
D, L = 192, 6


def fwd_flops(kind, K):
    T = 64 if kind == "ar" else 65
    attn = L * 4 * T * T * D
    return TOK[f"flops_{kind}{K}_fwd_1"] + attn


RUNS = {"ar_fsq1000": ("ar", "fsq1000", 1000), "mask_fsq1000": ("mask", "fsq1000", 1000), "ar_vq128": ("ar", "vq128", 128)}


def token_batches(tok, y, bs, seed=0):
    """Same permutation stream as common.batches(x, y, bs, seed): identical images in identical minibatches."""
    rng = np.random.default_rng(seed)
    n = len(y)
    t = torch.as_tensor(tok.astype(np.int64)); yy = torch.as_tensor(y.astype(np.int64))
    while True:
        p = rng.permutation(n)
        for i in range(0, n - bs + 1, bs):
            j = torch.as_tensor(p[i:i + bs])
            yield t[j], yy[j]


@torch.no_grad()
def eval_nll(m, tok, y, dev, kind, bs=1000):
    """AR: exact negative log-likelihood of the tokens, bits per image and per position (an 8x8 map).
    Masked: cross-entropy at a fixed 50% mask (not a likelihood; reported for training health only)."""
    m.eval()
    tot, per_pos, n = 0.0, torch.zeros(64), 0
    g = torch.Generator().manual_seed(0)
    for i in range(0, len(y), bs):
        t = torch.as_tensor(tok[i:i + bs].astype(np.int64)).to(dev); yy = torch.as_tensor(y[i:i + bs].astype(np.int64)).to(dev)
        if kind == "ar":
            lg = m(t[:, :-1], yy)
            nll = F.cross_entropy(lg.reshape(-1, m.K), t.reshape(-1), reduction="none").view(-1, 64)
            per_pos += nll.sum(0).cpu(); tot += nll.sum().item()
        else:
            masked = (torch.rand(t.shape, generator=g) < 0.5).to(dev)
            inp = torch.where(masked, torch.full_like(t, m.mask_id), t)
            lg = m(inp, yy)
            nll = (F.cross_entropy(lg.reshape(-1, m.K), t.reshape(-1), reduction="none").view(t.shape) * masked).sum()
            tot += nll.item() * 64 / masked.sum(1).float().mean().item()
        n += len(t)
    out = {"nll_bits_per_image": round(tot / n / math.log(2), 2)}
    if kind == "ar":
        out["bits_per_position"] = [round(v, 3) for v in (per_pos / n / math.log(2)).tolist()]
    return out


def main(names):
    cap_threads(4)
    dev = device("mps")
    os.makedirs(os.path.join(HERE, "runs"), exist_ok=True)
    os.makedirs(scratch("nm", "ckpt"), exist_ok=True); os.makedirs(scratch("nm", "logs"), exist_ok=True)
    for name in names:
        kind, tokname, K = RUNS[name]
        z = np.load(scratch("nm", f"tokens_{tokname}.npz"))
        f = fwd_flops(kind, K)
        steps = int(round(4000 * F_UNET / f))
        seed_all(0)
        model = TinyTokenTransformer(K, kind)
        loss = ar_loss if kind == "ar" else mask_loss
        print(f"== nm {name}: {sum(p.numel() for p in model.parameters()):,} parameters, {steps} steps "
              f"(forward {f/1e6:.1f} MFLOP vs TinyUNet {F_UNET/1e6:.1f})", flush=True)
        log_path = scratch("nm", "logs", f"{name}.jsonl")
        with PeakMem() as pm:
            model, ema, info = fit(model, loss, token_batches(z["train"], z["ytrain"], 128, seed=0), dev, steps=steps,
                                   lr=5e-4, warmup=200, clip=1.0, ema_decay=0.999, log_path=log_path, log_every=50,
                                   prefix="nm")
            ev = {"val_ema": eval_nll(ema, z["val"], z["yval"], dev, kind), "val_raw": eval_nll(model, z["val"], z["yval"], dev, kind),
                  "train5k_ema": eval_nll(ema, z["train"][:5000], z["ytrain"][:5000], dev, kind)}
        torch.save({"model": model.state_dict(), "ema": ema.state_dict(),
                    "config": {"kind": kind, "tokenizer": tokname, "K": K, "d": D, "layers": L, "heads": 6,
                               "steps": steps, "batch": 128, "lr": 5e-4, "warmup": 200, "clip": 1.0, "ema": 0.999,
                               "p_uncond": 0.1, "seed": 0}}, scratch("nm", "ckpt", f"{name}.pt"))
        train_flops = 3 * f * 128 * info["steps"]
        r = {"run": name, "kind": kind, "tokenizer": tokname, "K": K, "params": sum(p.numel() for p in model.parameters()),
             "steps": info["steps"], "seconds": info["seconds"], "steps_per_s": round(info["steps"] / info["seconds"], 2),
             "fwd_flops_per_image": f, "train_flops_approx_3x_fwd": train_flops,
             "ddpm_train_flops_approx": 3 * F_UNET * 128 * 4000, "eval": ev, "last_log": info["log"][-1],
             "peak_mps_mib": pm.peak_mb, "device": str(dev), "torch": torch.__version__, "machine": MACHINE,
             "date": time.strftime("%Y-%m-%d")}
        json.dump(r, open(os.path.join(HERE, "runs", name + ".json"), "w"), indent=1)
        shutil.copy(log_path, os.path.join(HERE, "runs", name + ".jsonl"))
        print("done", name, json.dumps({k: r[k] for k in ("seconds", "last_log", "peak_mps_mib")}), json.dumps(ev["val_ema"])[:200], flush=True)
        del model, ema; empty_cache()


if __name__ == "__main__":
    main(sys.argv[1].split(","))
