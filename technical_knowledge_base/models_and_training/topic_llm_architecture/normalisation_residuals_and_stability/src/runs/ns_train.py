"""Train one tiny-GPT run for the Normalisation, residuals and stability page.

The loop is the root's src/data/train.py (same seeded batches, same AdamW groups, same warmup + cosine schedule,
same fixed held-out windows, same clipping), with four additions:
  * every step's loss and gradient norm (before clipping) are kept, not one in ten (spikes are single steps);
  * every --probe_every steps a no_grad forward on a fixed probe batch (8 held-out windows) records, per layer, the
    largest attention logit, attention entropy, mean |q| and |k|, the residual-stream RMS and largest entry, and the
    output logits' largest value and mean log Z (the softmax normaliser that z-loss pushes toward 0);
  * page switches from ns_model.py: --norm_pos output (OLMo 2), --attn_softcap c (Gemma 2), --init flat;
  * --zloss c adds c * mean(logsumexp(logits)^2) (PaLM); --final_softcap c caps output logits (Gemma 2).
With none of the additions switched on, a run reproduces train.py (checked on bl_pre_lr3e-3, see README).

  ns_train.py --name ns_x --preset baseline [--set key=value ...] [--lr 3e-2] [--clip 0] [--zloss 1e-4] ...
Writes $LA_SCRATCH/runs/<name>/{config.json, ns.json, log.json, ckpt.pt}.
"""
import argparse, json, math, os, sys, time
import numpy as np
import torch
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from ns_model import NS, probe  # noqa: E402  (patches tiny_gpt, puts src/data on sys.path)
from configs import get  # noqa: E402
from tiny_gpt import GPT  # noqa: E402
from train import Batches, parse_val, peak_mem_mb, SCR  # noqa: E402


def ce(logits, y, final_softcap):
    if final_softcap:
        logits = final_softcap * torch.tanh(logits / final_softcap)
    return F.cross_entropy(logits.float().view(-1, logits.shape[-1]), y.reshape(-1)), logits


@torch.no_grad()
def held_out(model, dev, ctx, final_softcap, n_batches=20, batch=32, seed=1234):
    model.eval(); b = Batches("val", batch, ctx, seed); tot = 0.0
    for _ in range(n_batches):
        x, y = b.next(dev)
        logits = model(x)[0]
        tot += ce(logits, y, final_softcap)[0].item()
    model.train()
    return tot / n_batches


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preset", default="baseline"); ap.add_argument("--name", required=True)
    ap.add_argument("--set", nargs="*", default=[])
    ap.add_argument("--steps", type=int, default=1500); ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-3); ap.add_argument("--min_lr_frac", type=float, default=0.1)
    ap.add_argument("--warmup", type=int, default=100); ap.add_argument("--wd", type=float, default=0.1)
    ap.add_argument("--clip", type=float, default=1.0); ap.add_argument("--eval_every", type=int, default=100)
    ap.add_argument("--probe_every", type=int, default=10); ap.add_argument("--time_budget", type=float, default=900)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--device", default="mps" if torch.backends.mps.is_available() else "cpu")
    ap.add_argument("--norm_pos", default=None, help="output = OLMo 2 reordered norm (else the preset's)")
    ap.add_argument("--attn_softcap", type=float, default=0); ap.add_argument("--final_softcap", type=float, default=0)
    ap.add_argument("--zloss", type=float, default=0); ap.add_argument("--init", default="gpt2", choices=["gpt2", "flat"])
    ap.add_argument("--no_ckpt", action="store_true")
    a = ap.parse_args()

    torch.set_num_threads(4)
    torch.manual_seed(a.seed); np.random.seed(a.seed)
    NS.update(norm_pos=a.norm_pos, attn_softcap=a.attn_softcap or None, init=a.init)
    cfg = get(a.preset, **{k: parse_val(v) for k, v in (s.split("=", 1) for s in a.set)})
    out = os.path.join(SCR, "runs", a.name); os.makedirs(out, exist_ok=True)
    dev = a.device
    model = GPT(cfg).to(dev)
    decay = [p for n, p in model.named_parameters() if p.dim() >= 2]
    no_decay = [p for n, p in model.named_parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": a.wd}, {"params": no_decay, "weight_decay": 0.0}],
                            lr=a.lr, betas=(0.9, 0.95), eps=1e-8)

    def lr_at(s):
        if s < a.warmup:
            return a.lr * (s + 1) / a.warmup
        p = (s - a.warmup) / max(1, a.steps - a.warmup)
        return a.lr * (a.min_lr_frac + (1 - a.min_lr_frac) * 0.5 * (1 + math.cos(math.pi * p)))

    ns = {k: getattr(a, k) for k in ("norm_pos", "attn_softcap", "final_softcap", "zloss", "init")}
    json.dump(cfg.to_dict(), open(os.path.join(out, "config.json"), "w"), indent=1)
    json.dump(ns, open(os.path.join(out, "ns.json"), "w"))
    pb = Batches("val", 8, cfg.ctx, 4321); px, _ = pb.next(dev)            # the fixed probe batch
    batches = Batches("train", a.batch, cfg.ctx, a.seed)
    log = {"preset": a.preset, "name": a.name, "args": vars(a), "ns": ns, "config": cfg.to_dict(),
           "params": model.param_groups(), "loss": [], "grad_norm": [], "probe": [], "eval": [], "status": "running"}

    def do_probe(step):
        st, rec, logits = probe(model, px)
        rn = rec["resid_norm"]                                              # (L+1, B, T) L2 norms
        lz = torch.logsumexp(logits.float(), -1)
        log["probe"].append({"step": step,
                             "max_logit": [round(s["max_logit"], 3) for s in st],
                             "entropy": [round(s["entropy"], 4) for s in st],
                             "top_w": [round(s["top_w"], 4) for s in st],
                             "q_norm": [round(s["q_norm"], 3) for s in st], "k_norm": [round(s["k_norm"], 3) for s in st],
                             "resid_rms": [round(v, 3) for v in (rn.pow(2).mean((1, 2)).sqrt() / math.sqrt(cfg.d_model)).tolist()],
                             "out_logit_max": round(logits.abs().max().item(), 3),
                             "log_z": round(lz.mean().item(), 4)})

    t0 = time.time(); pend_l, pend_g = [], []
    log["eval"].append({"step": 0, "val_loss": round(held_out(model, dev, cfg.ctx, a.final_softcap), 4)})
    do_probe(0)
    status = "done"
    for step in range(a.steps):
        for g in opt.param_groups:
            g["lr"] = lr_at(step)
        x, y = batches.next(dev)
        logits = model(x)[0]
        loss, capped = ce(logits, y, a.final_softcap)
        tot = loss
        if a.zloss:
            tot = tot + a.zloss * torch.logsumexp(capped.float(), -1).pow(2).mean()
        tot.backward()
        gn = torch.nn.utils.clip_grad_norm_(model.parameters(), a.clip if a.clip > 0 else float("inf"))
        opt.step(); opt.zero_grad(set_to_none=True)
        pend_l.append(loss.detach()); pend_g.append(gn.detach())
        if (step + 1) % a.probe_every == 0 or step == a.steps - 1:
            ls = torch.stack(pend_l).tolist(); gs = torch.stack(pend_g).tolist(); pend_l, pend_g = [], []
            log["loss"] += [round(v, 4) if math.isfinite(v) else None for v in ls]
            log["grad_norm"] += [round(v, 4) if math.isfinite(v) else None for v in gs]
            if not all(math.isfinite(v) for v in ls):
                status = "diverged"; break
            do_probe(step + 1)
        if (step + 1) % a.eval_every == 0 or step == a.steps - 1:
            log["eval"].append({"step": step + 1, "val_loss": round(held_out(model, dev, cfg.ctx, a.final_softcap), 4)})
            print(f"{a.name} step {step + 1} train {log['loss'][-1]} val {log['eval'][-1]['val_loss']} "
                  f"maxlogit {max(log['probe'][-1]['max_logit']):.1f} {time.time() - t0:.0f}s", flush=True)
        if time.time() - t0 > a.time_budget:
            status = "truncated"; break
    rss, gpu = peak_mem_mb(dev)
    log.update({"status": status, "seconds": round(time.time() - t0, 1), "steps_done": len(log["loss"]),
                "device": dev, "torch": torch.__version__, "peak_rss_mb": rss, "mps_driver_mb_end": gpu,
                "final_val_loss": log["eval"][-1]["val_loss"]})
    json.dump(log, open(os.path.join(out, "log.json"), "w"))
    if not a.no_ckpt and status != "diverged":
        torch.save({"config": cfg.to_dict(), "ns": ns, "model": model.state_dict(), "step": len(log["loss"])},
                   os.path.join(out, "ckpt.pt"))
    print(json.dumps({k: log[k] for k in ("name", "status", "seconds", "steps_done", "final_val_loss")}))


if __name__ == "__main__":
    main()
