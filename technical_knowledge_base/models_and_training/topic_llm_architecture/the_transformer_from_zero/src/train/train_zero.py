"""Train gpt_zero.GPT (the page's from-zero file) with EXACTLY the running example's loop: src/data/train.py's
seeded batches, AdamW (0.9, 0.95), wd 0.1 on matrices, lr 3e-3, 100 warmup steps, cosine to 10%, batch 32 x 256,
clip 1.0, held-out loss on the same 20 fixed validation windows. Only the model differs, so an ablation run and the
tiny GPT's reference runs compare at an equal token budget.

Run (GPU: hold the bench lock, both MPS watermark variables):
  LA_SCRATCH=<scratch>/la python train_zero.py --name tz_noresid --set resid=False [--lr 1e-3] [--seed 1]
Writes $LA_SCRATCH/runs/<name>/{log.json, ckpt.pt} in train.py's log format.
"""
import argparse, json, math, os, sys, time
import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "zero"))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "data"))
from train import Batches, held_out_loss, peak_mem_mb, parse_val, SCR  # the running example's loop pieces
from gpt_zero import GPT, Config, n_params


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--set", nargs="*", default=[])
    ap.add_argument("--steps", type=int, default=1500)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-3)
    ap.add_argument("--min_lr_frac", type=float, default=0.1)
    ap.add_argument("--warmup", type=int, default=100)
    ap.add_argument("--wd", type=float, default=0.1)
    ap.add_argument("--clip", type=float, default=1.0)
    ap.add_argument("--eval_every", type=int, default=100)
    ap.add_argument("--log_every", type=int, default=10)
    ap.add_argument("--time_budget", type=float, default=600)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--device", default="mps" if torch.backends.mps.is_available() else "cpu")
    a = ap.parse_args()
    torch.set_num_threads(4)
    torch.manual_seed(a.seed); np.random.seed(a.seed)
    cfg = Config(**{k: parse_val(v) for k, v in (s.split("=", 1) for s in a.set)})
    out = os.path.join(SCR, "runs", a.name); os.makedirs(out, exist_ok=True)
    dev = a.device
    model = GPT(cfg).to(dev)
    decay = [p for p in model.parameters() if p.dim() >= 2]
    no_decay = [p for p in model.parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": a.wd}, {"params": no_decay, "weight_decay": 0.0}],
                            lr=a.lr, betas=(0.9, 0.95), eps=1e-8)
    def lr_at(s):
        if s < a.warmup:
            return a.lr * (s + 1) / a.warmup
        p = (s - a.warmup) / max(1, a.steps - a.warmup)
        return a.lr * (a.min_lr_frac + (1 - a.min_lr_frac) * 0.5 * (1 + math.cos(math.pi * p)))
    batches = Batches("train", a.batch, cfg.ctx, a.seed)
    log = {"name": a.name, "args": vars(a), "config": cfg.__dict__, "params": n_params(model),
           "tokens_per_step": a.batch * cfg.ctx, "train": [], "eval": [], "status": "running"}
    t0 = time.time(); t_last = t0; tok_since = 0; step = 0
    log["eval"].append({"step": 0, "val_loss": round(held_out_loss(model, dev, cfg.ctx), 4)})
    for step in range(a.steps):
        for g in opt.param_groups:
            g["lr"] = lr_at(step)
        x, y = batches.next(dev)
        _, loss, _, _ = model(x, targets=y)
        loss.backward()
        gn = torch.nn.utils.clip_grad_norm_(model.parameters(), a.clip if a.clip > 0 else float("inf"))
        opt.step(); opt.zero_grad(set_to_none=True)
        tok_since += x.numel()
        if step % a.log_every == 0 or step == a.steps - 1:
            lv = loss.item(); now = time.time()
            log["train"].append({"step": step, "loss": round(lv, 4), "lr": round(lr_at(step), 6),
                                 "grad_norm": round(gn.item(), 4), "tok_s": round(tok_since / max(now - t_last, 1e-9)),
                                 "t": round(now - t0, 1)})
            t_last = now; tok_since = 0
            if not math.isfinite(lv):
                log["status"] = "diverged"; break
        if (step + 1) % a.eval_every == 0 or step == a.steps - 1:
            log["eval"].append({"step": step + 1, "val_loss": round(held_out_loss(model, dev, cfg.ctx), 4)})
            print(f"{a.name} step {step + 1} train {loss.item():.3f} val {log['eval'][-1]['val_loss']:.3f} {time.time() - t0:.0f}s", flush=True)
        if time.time() - t0 > a.time_budget:
            log["status"] = "truncated"; break
    else:
        log["status"] = "done"
    rss, gpu = peak_mem_mb(dev)
    tr = [r["tok_s"] for r in log["train"][2:]] or [0]
    log.update({"seconds": round(time.time() - t0, 1), "steps_done": step + 1, "median_tok_s": float(np.median(tr)),
                "peak_rss_mb": rss, "mps_driver_mb_end": gpu, "device": dev, "torch": torch.__version__,
                "final_val_loss": log["eval"][-1]["val_loss"]})
    json.dump(log, open(os.path.join(out, "log.json"), "w"))
    torch.save({"config": cfg.__dict__, "model": model.state_dict(), "step": step + 1}, os.path.join(out, "ckpt.pt"))
    print(json.dumps({k: log[k] for k in ("name", "status", "seconds", "final_val_loss", "median_tok_s", "params")}))


if __name__ == "__main__":
    main()
