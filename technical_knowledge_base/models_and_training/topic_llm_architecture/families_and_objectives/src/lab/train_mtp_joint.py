"""train_mtp_joint.py: the baseline tiny GPT trained FROM SCRATCH with a DeepSeek-style MTP module (depth 1) beside it,
at exactly the reference budget and schedule of src/data/train.py (seed 0, 1,500 steps x 32 x 256 tokens, AdamW 0.9/0.95,
lr 3e-3, warmup 100, cosine to 10%, wd 0.1 on matrices, clip 1.0, the same seeded training windows and the same 20
held-out windows). Loss = main next-token loss + lam x MTP loss (DeepSeek-V3: lam 0.3 for the first 10T tokens).
The question: does the extra objective change the MAIN model's held-out loss at this scale (ref_baseline_s1500: 2.278)?

GPU run (bench lock, MPS memory cap):
  PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 LA_SCRATCH=<scratch>/la \
    nice -n 15 <venv>/bin/python train_mtp_joint.py --lam 0.3 --name fo_mtp_joint
"""
import argparse, json, math, os, time
import numpy as np
import torch
import torch.nn.functional as F

from fo_common import SCR, OUT, GPT, GPTConfig, Batches, trunk
from mtp import MTPModule, n_params


@torch.no_grad()
def held_out(model, mtp, dev, ctx, n_batches=20, batch=32, seed=1234):
    model.eval(); mtp.eval()
    b = Batches("val", batch, ctx, seed)
    tot = tot2 = 0.0
    for _ in range(n_batches):
        xy = b.next().to(dev); x, y = xy[:, :-1], xy[:, 1:]
        h, logits = trunk(model, x)
        tot += F.cross_entropy(logits.view(-1, logits.shape[-1]), y.reshape(-1)).item()
        lg2 = mtp(model, h[:, :-1], x[:, 1:])
        tot2 += F.cross_entropy(lg2.reshape(-1, lg2.shape[-1]), y[:, 1:].reshape(-1)).item()
    model.train(); mtp.train()
    return tot / n_batches, tot2 / n_batches


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lam", type=float, default=0.3)
    ap.add_argument("--name", default="fo_mtp_joint")
    ap.add_argument("--steps", type=int, default=1500)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-3)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--device", default="mps" if torch.backends.mps.is_available() else "cpu")
    ap.add_argument("--time_budget", type=float, default=900)
    a = ap.parse_args()
    torch.set_num_threads(4)
    torch.manual_seed(a.seed); np.random.seed(a.seed)
    cfg = GPTConfig()
    dev = a.device
    model = GPT(cfg).to(dev)            # built first, so its init draws the same random numbers as train.py's baseline
    mtp = MTPModule(cfg, "sequential").to(dev)
    params = list(model.parameters()) + list(mtp.parameters())
    decay = [p for p in params if p.dim() >= 2]; no_decay = [p for p in params if p.dim() < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": 0.1}, {"params": no_decay, "weight_decay": 0.0}],
                            lr=a.lr, betas=(0.9, 0.95), eps=1e-8)
    warm, minf = 100, 0.1
    def lr_at(s):
        if s < warm:
            return a.lr * (s + 1) / warm
        p = (s - warm) / max(1, a.steps - warm)
        return a.lr * (minf + (1 - minf) * 0.5 * (1 + math.cos(math.pi * p)))
    batches = Batches("train", a.batch, cfg.ctx, a.seed)
    out = SCR / "runs" / a.name; out.mkdir(parents=True, exist_ok=True)
    log = {"name": a.name, "lam": a.lam, "args": vars(a), "main_params": n_params(model), "mtp_params": n_params(mtp),
           "train": [], "eval": []}
    v, v2 = held_out(model, mtp, dev, cfg.ctx); log["eval"].append({"step": 0, "val_loss": round(v, 4), "val_mtp": round(v2, 4)})
    t0 = time.time()
    for step in range(a.steps):
        for g in opt.param_groups:
            g["lr"] = lr_at(step)
        xy = batches.next().to(dev); x, y = xy[:, :-1], xy[:, 1:]
        h, logits = trunk(model, x)
        l1 = F.cross_entropy(logits.float().view(-1, logits.shape[-1]), y.reshape(-1))
        lg2 = mtp(model, h[:, :-1], x[:, 1:])           # position t sees x_{t+1}, predicts x_{t+2} = y[:, t+1]
        l2 = F.cross_entropy(lg2.float().reshape(-1, lg2.shape[-1]), y[:, 1:].reshape(-1))
        (l1 + a.lam * l2).backward()
        gn = torch.nn.utils.clip_grad_norm_(params, 1.0)
        opt.step(); opt.zero_grad(set_to_none=True)
        if step % 10 == 0 or step == a.steps - 1:
            log["train"].append({"step": step, "loss": round(l1.item(), 4), "mtp": round(l2.item(), 4),
                                 "grad_norm": round(gn.item(), 4), "t": round(time.time() - t0, 1)})
        if (step + 1) % 250 == 0 or step == a.steps - 1:
            v, v2 = held_out(model, mtp, dev, cfg.ctx)
            log["eval"].append({"step": step + 1, "val_loss": round(v, 4), "val_mtp": round(v2, 4)})
            print(f"{a.name} step {step + 1} main {v:.4f} mtp {v2:.4f} {time.time() - t0:.0f}s", flush=True)
        if time.time() - t0 > a.time_budget:
            log["status"] = "truncated"; break
    else:
        log["status"] = "done"
    log["seconds"] = round(time.time() - t0, 1); log["device"] = dev; log["torch"] = torch.__version__
    log["final_val_loss"] = log["eval"][-1]["val_loss"]; log["final_val_mtp"] = log["eval"][-1]["val_mtp"]
    json.dump(log, open(out / "log.json", "w"))
    torch.save({"config": cfg.to_dict(), "model": model.state_dict(), "mtp": mtp.state_dict()}, out / "ckpt.pt")
    json.dump({k: log[k] for k in log if k != "train"} | {"train_every_50": log["train"][::5]},
              open(OUT / f"{a.name}.json", "w"))
    print(json.dumps({k: log[k] for k in ("name", "status", "seconds", "final_val_loss", "final_val_mtp")}))


if __name__ == "__main__":
    main()
