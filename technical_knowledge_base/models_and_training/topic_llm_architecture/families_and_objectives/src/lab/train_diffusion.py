"""train_diffusion.py: turn the causal reference tiny GPT into a masked diffusion LM (CPU, about 10 minutes).

The objective is LLaDA's (Nie et al. 2025, arXiv 2502.09992, Eq. 3 and Algorithm 1): draw t ~ U(0,1) per sequence,
replace each token by [MASK] with probability t, run the model with a BIDIRECTIONAL mask, and score only the
masked positions, each weighted by 1/t:  loss = sum_masked( -log p(x0_i | x_t) ) / t / (B * L).
At t = 0.15 this is BERT's masked-LM objective; the random t is what makes it a generative model.

Adaptation from an AR checkpoint (as DiffuLLaMA, arXiv 2410.17891, and Dream 7B adapt Llama and Qwen) rather than
from scratch: the trunk already knows TinyStories, so a short run is enough to learn the new mask and objective.
A [MASK] token (id 4096) is added to the tied embedding. --shift keeps the AR alignment (the logits at position
i-1 predict token i, DiffuLLaMA's "shift operation"); without it, position i predicts its own token (LLaDA).

  LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python train_diffusion.py --steps 1500 --shift
  then: train_diffusion.py --resume fo_diffusion --name fo_diffusion_long --steps 3000 --lr 5e-4 --shift
Writes $LA_SCRATCH/runs/fo_diffusion/{ckpt.pt, log.json} and out/diffusion_train.json.
"""
import argparse, json, math, time
import torch
import torch.nn.functional as F

import fo_common as C
from fo_common import MASK, SCR, OUT, Batches, load_ref, GPT, GPTConfig

MASK_ID = 4096
EPS = 1e-3


def diffusion_loss(model, x0, shift, gen=None):
    B, L = x0.shape
    t = torch.rand(B, 1, generator=gen)
    p = (1 - EPS) * t + EPS                                   # LLaDA's p_mask, never exactly 0
    masked = torch.rand(B, L, generator=gen) < p
    if shift:                                                 # never mask the first token: nothing to its left predicts it
        masked[:, 0] = False
    xt = torch.where(masked, torch.full_like(x0, MASK_ID), x0)
    logits, *_ = model(xt)
    if shift:
        logits = torch.cat([logits[:, :1], logits[:, :-1]], 1)  # position i's prediction comes from logits at i-1
    logits = logits.float()
    logits[..., MASK_ID] = float("-inf")                      # the model never predicts [MASK] itself
    ce = F.cross_entropy(logits.transpose(1, 2), x0, reduction="none")
    return ((ce * masked) / p).sum() / (B * L), masked.float().mean().item()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", type=int, default=1200)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--shift", action="store_true")
    ap.add_argument("--name", default="fo_diffusion")
    ap.add_argument("--resume", default=None, help="continue from runs/<resume>/ckpt.pt instead of the AR reference")
    a = ap.parse_args()
    torch.set_num_threads(4)
    torch.manual_seed(0)
    C.enable_masks(); MASK.update(mode="bidir")
    if a.resume:
        ck = torch.load(SCR / "runs" / a.resume / "ckpt.pt", map_location="cpu", weights_only=False)
        model = GPT(GPTConfig(**ck["config"])); model.load_state_dict(ck["model"]); model.train()
    else:
        model = load_ref(vocab_extra=1).train()
    decay = [p for p in model.parameters() if p.dim() >= 2]; nod = [p for p in model.parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": 0.1}, {"params": nod, "weight_decay": 0.0}],
                            lr=a.lr, betas=(0.9, 0.95))
    warm = 50
    lr_at = lambda s: a.lr * (s + 1) / warm if s < warm else \
        a.lr * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * (s - warm) / max(1, a.steps - warm))))
    b = Batches("train", a.batch, 256, 11 if not a.resume else 12)  # new windows when continuing
    g = torch.Generator().manual_seed(0)
    vb = Batches("val", 16, 256, 1234); val = [vb.next()[:, :256] for _ in range(4)]
    gv = torch.Generator()

    @torch.no_grad()
    def val_loss():
        model.eval(); gv.manual_seed(123)
        v = sum(diffusion_loss(model, x, a.shift, gv)[0].item() for x in val) / len(val)
        model.train(); return round(v, 4)

    log = {"args": vars(a), "train": [], "eval": [{"step": 0, "val": val_loss()}]}
    print("step 0 val", log["eval"][0]["val"], flush=True)
    t0 = time.time()
    for s in range(a.steps):
        for gr in opt.param_groups:
            gr["lr"] = lr_at(s)
        x0 = b.next()[:, :256]
        loss, frac = diffusion_loss(model, x0, a.shift, g)
        loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0); opt.step(); opt.zero_grad()
        if s % 10 == 0:
            log["train"].append([s, round(loss.item(), 4)])
        if (s + 1) % 100 == 0 or s == a.steps - 1:
            log["eval"].append({"step": s + 1, "val": val_loss(), "t": round(time.time() - t0)})
            print("step", s + 1, "train", round(loss.item(), 3), "val", log["eval"][-1]["val"], f"{time.time() - t0:.0f}s", flush=True)
    log["seconds"] = round(time.time() - t0, 1)
    out = SCR / "runs" / a.name; out.mkdir(parents=True, exist_ok=True)
    cfg = model.cfg.to_dict()
    torch.save({"config": cfg, "model": model.state_dict(), "shift": a.shift}, out / "ckpt.pt")
    json.dump(log, open(out / "log.json", "w"))
    C.dump(f"{a.name}_train.json", {"args": vars(a), "eval": log["eval"], "train_every_50": log["train"][::5],
                                    "seconds": log["seconds"], "torch": torch.__version__,
                                    "note": "measured on Apple M1 Pro (CPU, 4 threads, nice 15)"})


if __name__ == "__main__":
    main()
