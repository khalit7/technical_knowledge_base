"""Train one tiny-GPT preset on the running example's TinyStories tokens. Fixed seeds; a fixed token budget
(steps x batch x ctx) so presets compare at equal data; a wall-clock cap only as a safety stop.

Run (GPU work: hold the bench lock, cap MPS memory):
  PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 OMP_NUM_THREADS=4 LA_SCRATCH=<scratch>/la nice -n 15 \
    <venv>/bin/python src/data/train.py --preset gqa2 [--name myrun] [--steps 2000] [--lr 3e-3] [--set key=value ...]
Writes $LA_SCRATCH/runs/<name>/{config.json, log.json, ckpt.pt}. log.json: per-step train loss, lr, grad norm
(before clipping), tokens/s; held-out loss every --eval_every steps on a fixed set of val windows; peak memory.
"""
import argparse, json, math, os, resource, sys, time
import numpy as np
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from configs import get
from tiny_gpt import GPT

SCR = os.environ["LA_SCRATCH"]
DATA = os.path.join(SCR, "data")


def parse_val(v):
    for f in (int, float):
        try:
            return f(v)
        except ValueError:
            pass
    if v in ("True", "False", "None"):
        return {"True": True, "False": False, "None": None}[v]
    if v.startswith("{"):
        return json.loads(v)
    return v


class Batches:
    """Random windows of ctx+1 tokens from a uint16 memmap, from a seeded generator (same batches for every preset)."""

    def __init__(self, split, batch, ctx, seed):
        self.data = np.memmap(os.path.join(DATA, f"{split}.bin"), dtype=np.uint16, mode="r")
        self.batch, self.ctx = batch, ctx
        self.rng = np.random.default_rng(seed)

    def next(self, device):
        ix = self.rng.integers(0, len(self.data) - self.ctx - 1, self.batch)
        x = np.stack([self.data[i:i + self.ctx + 1].astype(np.int64) for i in ix])
        x = torch.from_numpy(x).to(device)
        return x[:, :-1], x[:, 1:]


@torch.no_grad()
def held_out_loss(model, device, ctx, n_batches=20, batch=32, seed=1234):
    """Mean loss on a FIXED set of validation windows (same windows for every run and every eval)."""
    model.eval()
    b = Batches("val", batch, ctx, seed)
    tot = 0.0
    for _ in range(n_batches):
        x, y = b.next(device)
        _, loss, _, _ = model(x, targets=y)
        tot += loss.item()
    model.train()
    return tot / n_batches


def peak_mem_mb(device):
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1e6  # macOS reports bytes
    gpu = torch.mps.driver_allocated_memory() / 1e6 if device == "mps" else 0.0
    return round(rss, 1), round(gpu, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preset", default="baseline")
    ap.add_argument("--name", default=None)
    ap.add_argument("--set", nargs="*", default=[], help="config overrides key=value")
    ap.add_argument("--steps", type=int, default=1500)  # about 5 min for the baseline on M1 Pro MPS
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-3)
    ap.add_argument("--min_lr_frac", type=float, default=0.1)
    ap.add_argument("--warmup", type=int, default=100)
    ap.add_argument("--wd", type=float, default=0.1)
    ap.add_argument("--clip", type=float, default=1.0, help="0 disables gradient clipping")
    ap.add_argument("--eval_every", type=int, default=250)
    ap.add_argument("--log_every", type=int, default=10)
    ap.add_argument("--time_budget", type=float, default=600, help="seconds; safety stop, marks the run truncated")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--device", default="mps" if torch.backends.mps.is_available() else "cpu")
    ap.add_argument("--dtype", default="fp32", choices=["fp32", "bf16"], help="autocast dtype for matmuls")
    ap.add_argument("--no_ckpt", action="store_true")
    a = ap.parse_args()

    torch.set_num_threads(4)
    torch.manual_seed(a.seed); np.random.seed(a.seed)
    cfg = get(a.preset, **{k: parse_val(v) for k, v in (s.split("=", 1) for s in a.set)})
    name = a.name or a.preset
    out = os.path.join(SCR, "runs", name); os.makedirs(out, exist_ok=True)
    dev = a.device
    model = GPT(cfg).to(dev)
    groups = model.param_groups()
    decay = [p for n, p in model.named_parameters() if p.dim() >= 2]
    no_decay = [p for n, p in model.named_parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": a.wd}, {"params": no_decay, "weight_decay": 0.0}],
                            lr=a.lr, betas=(0.9, 0.95), eps=1e-8)
    def lr_at(s):  # linear warmup, cosine to min_lr_frac
        if s < a.warmup:
            return a.lr * (s + 1) / a.warmup
        p = (s - a.warmup) / max(1, a.steps - a.warmup)
        return a.lr * (a.min_lr_frac + (1 - a.min_lr_frac) * 0.5 * (1 + math.cos(math.pi * p)))

    batches = Batches("train", a.batch, cfg.ctx, a.seed)
    amp = torch.autocast(device_type=dev, dtype=torch.bfloat16) if a.dtype == "bf16" else torch.autocast(device_type=dev, enabled=False)
    log = {"preset": a.preset, "name": name, "args": vars(a), "config": cfg.to_dict(), "params": groups,
           "tokens_per_step": a.batch * cfg.ctx, "train": [], "eval": [], "status": "running"}
    json.dump(cfg.to_dict(), open(os.path.join(out, "config.json"), "w"), indent=1)
    t0 = time.time(); t_last = t0; tok_since = 0
    step = 0; peak_gpu = 0.0
    log["eval"].append({"step": 0, "val_loss": held_out_loss(model, dev, cfg.ctx)})
    for step in range(a.steps):
        for g in opt.param_groups:
            g["lr"] = lr_at(step)
        x, y = batches.next(dev)
        with amp:
            _, loss, aux, _ = model(x, targets=y)
        (loss + cfg.aux_coef * aux if cfg.n_experts and cfg.balance == "aux" else loss).backward()
        gn = torch.nn.utils.clip_grad_norm_(model.parameters(), a.clip if a.clip > 0 else float("inf"))
        opt.step(); opt.zero_grad(set_to_none=True)
        tok_since += x.numel()
        if step % a.log_every == 0 or step == a.steps - 1:
            lv = loss.item(); now = time.time()
            if dev == "mps":
                peak_gpu = max(peak_gpu, torch.mps.driver_allocated_memory() / 1e6)
            rec = {"step": step, "loss": round(lv, 4), "lr": round(lr_at(step), 6), "grad_norm": round(gn.item(), 4),
                   "tok_s": round(tok_since / max(now - t_last, 1e-9)), "t": round(now - t0, 1)}
            if cfg.n_experts:
                loads = [b.ffn.last["load"].tolist() for b in model.blocks if b.is_moe]
                rec["moe_load"] = loads; rec["aux"] = round(float(aux), 4)
                rec["dropped"] = [round(b.ffn.last["dropped_frac"], 4) for b in model.blocks if b.is_moe]
            log["train"].append(rec); t_last = now; tok_since = 0
            if not math.isfinite(lv):
                log["status"] = "diverged"; break
        if (step + 1) % a.eval_every == 0 or step == a.steps - 1:
            log["eval"].append({"step": step + 1, "val_loss": round(held_out_loss(model, dev, cfg.ctx), 4)})
            print(f"{name} step {step + 1} train {loss.item():.3f} val {log['eval'][-1]['val_loss']:.3f} {time.time() - t0:.0f}s", flush=True)
        if time.time() - t0 > a.time_budget:
            log["status"] = "truncated"; break
    else:
        log["status"] = "done"
    dt = time.time() - t0
    rss, gpu = peak_mem_mb(dev)
    tr = [r["tok_s"] for r in log["train"][2:]] or [0]
    log.update({"seconds": round(dt, 1), "steps_done": step + 1, "tokens_seen": (step + 1) * a.batch * cfg.ctx,
                "median_tok_s": float(np.median(tr)), "peak_rss_mb": rss, "mps_driver_mb_end": gpu, "mps_driver_mb_peak_sampled": round(peak_gpu, 1),
                "device": dev, "torch": torch.__version__,
                "final_val_loss": log["eval"][-1]["val_loss"]})
    json.dump(log, open(os.path.join(out, "log.json"), "w"))
    if not a.no_ckpt:
        torch.save({"config": cfg.to_dict(), "model": model.state_dict(), "step": step + 1}, os.path.join(out, "ckpt.pt"))
    print(json.dumps({k: log[k] for k in ("name", "status", "seconds", "steps_done", "final_val_loss", "median_tok_s", "peak_rss_mb", "mps_driver_mb_end")}))


if __name__ == "__main__":
    main()
