"""Inside a real model (tab t-inside): the tiny GPT baseline trained again exactly as src/data/train.py trains
ref_baseline_s1500 (same preset, seed, batches, schedule, 1,500 steps), with probes every 25 steps and snapshots,
so the page can show the same measurements before, during and after training.

Probes (no_grad, eval mode, fixed inputs, they never touch the training RNG):
  - 8 repeated random sequences: id 0 + R + R, R = 127 random ids in [100, 4096), seed 0 (255 tokens, fits ctx 256);
    per-head induction score (mean attention from a token of the second copy to the token after its earlier copy),
    loss on the first copy and on the second copy;
  - the running sequence (256 tokens): per-head previous-token score, attention mass on token 0 per layer
    (queries at position 8 and later), median residual-stream norm after each block.
Writes $LA_SCRATCH/runs/in_snap/{log.json, probes.json, snap_<step>.pt}.

Run under the bench lock with the MPS cap (about 6 minutes on an M1 Pro):
  LA_SCRATCH=... PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 \
    nice -n 15 $LA_SCRATCH/venv/bin/python src/inside/train_snapshots.py
"""
import json, math, os, sys, time
import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
from configs import get                       # noqa: E402
from tiny_gpt import GPT                      # noqa: E402
from train import Batches, held_out_loss, SCR  # noqa: E402

STEPS, BATCH, LR, MIN_LR, WARM, WD, CLIP, SEED = 1500, 32, 3e-3, 0.1, 100, 0.1, 1.0, 0
PROBE_EVERY = 25
SNAPS = {0, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500}
L_RAND = 127


def probes(dev):
    g = torch.Generator().manual_seed(0)
    R = torch.randint(100, 4096, (8, L_RAND), generator=g)
    rand = torch.cat([torch.zeros(8, 1, dtype=torch.long), R, R], 1).to(dev)
    run = torch.tensor([json.load(open(os.path.join(HERE, "..", "data", "running_sequence.json")))["ids"]], device=dev)
    return rand, run


@torch.no_grad()
def probe(model, rand, run):
    model.eval()
    logits, _, _, rec = model(rand, record=True)
    lp = torch.log_softmax(logits[:, :-1].float(), -1)
    loss = -lp.gather(-1, rand[:, 1:, None])[..., 0]           # index j: loss of predicting token j+1
    qs = torch.arange(L_RAND + 1, 2 * L_RAND + 1, device=rand.device)
    ind = [a[:, :, qs, qs - L_RAND + 1].mean(dim=(0, 2)).tolist() for a in rec["attn"]]
    _, _, _, r2 = model(run, record=True)
    T = run.shape[1]
    prev = [a[0, :, torch.arange(1, T), torch.arange(0, T - 1)].mean(-1).tolist() for a in r2["attn"]]
    sink = [a[0, :, 8:, 0].mean().item() for a in r2["attn"]]
    sink_head = [a[0, :, 8:, 0].mean(-1).tolist() for a in r2["attn"]]
    norms = r2["resid_norm"][:, 0].median(dim=-1).values.tolist()
    model.train()
    r = lambda v: [round(x, 4) for x in v]
    return {"ind": [r(v) for v in ind], "prev": [r(v) for v in prev], "sink": r(sink), "sink_head": [r(v) for v in sink_head],
            "norm_median": r(norms), "loss_copy1": round(loss[:, 1:L_RAND].mean().item(), 4),
            "loss_copy2": round(loss[:, L_RAND + 1:].mean().item(), 4)}


def main():
    torch.set_num_threads(4)
    torch.manual_seed(SEED); np.random.seed(SEED)
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    cfg = get("baseline")
    out = os.path.join(SCR, "runs", "in_snap"); os.makedirs(out, exist_ok=True)
    model = GPT(cfg).to(dev)
    decay = [p for n, p in model.named_parameters() if p.dim() >= 2]
    no_decay = [p for n, p in model.named_parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": WD}, {"params": no_decay, "weight_decay": 0.0}],
                            lr=LR, betas=(0.9, 0.95), eps=1e-8)

    def lr_at(s):  # identical to train.py
        if s < WARM:
            return LR * (s + 1) / WARM
        p = (s - WARM) / max(1, STEPS - WARM)
        return LR * (MIN_LR + (1 - MIN_LR) * 0.5 * (1 + math.cos(math.pi * p)))

    batches = Batches("train", BATCH, cfg.ctx, SEED)
    rand, run = probes(dev)
    log = {"train": [], "eval": [{"step": 0, "val_loss": held_out_loss(model, dev, cfg.ctx)}], "probes": []}
    t0 = time.time()
    for step in range(STEPS + 1):
        if step % PROBE_EVERY == 0 or step in SNAPS:
            p = probe(model, rand, run); p["step"] = step; log["probes"].append(p)
        if step in SNAPS:
            torch.save({"config": cfg.to_dict(), "model": model.state_dict(), "step": step}, os.path.join(out, f"snap_{step}.pt"))
        if step == STEPS:
            break
        for g in opt.param_groups:
            g["lr"] = lr_at(step)
        x, y = batches.next(dev)
        _, loss, _, _ = model(x, targets=y)
        loss.backward()
        gn = torch.nn.utils.clip_grad_norm_(model.parameters(), CLIP)
        opt.step(); opt.zero_grad(set_to_none=True)
        if step % 10 == 0 or step == STEPS - 1:
            log["train"].append({"step": step, "loss": round(loss.item(), 4), "grad_norm": round(gn.item(), 4)})
        if (step + 1) % 250 == 0 or step == STEPS - 1:
            log["eval"].append({"step": step + 1, "val_loss": round(held_out_loss(model, dev, cfg.ctx), 4)})
            pr = log["probes"][-1]
            print(f"step {step + 1} val {log['eval'][-1]['val_loss']:.3f} copy2 {pr['loss_copy2']:.2f} "
                  f"maxind {max(max(v) for v in pr['ind']):.2f} {time.time() - t0:.0f}s", flush=True)
    log["seconds"] = round(time.time() - t0, 1); log["device"] = dev; log["torch"] = torch.__version__
    json.dump(log, open(os.path.join(out, "log.json"), "w"))
    print(json.dumps({"seconds": log["seconds"], "final_val": log["eval"][-1]["val_loss"]}))


if __name__ == "__main__":
    main()
