"""The GQA paper's recipe on the tiny GPT: convert the trained MHA checkpoint (at_mha) to GQA or MQA by mean-pooling
its key and value heads within each group, then "uptrain" for a small share of the original steps.

Ainslie et al. 2023 (arXiv 2305.13245) uptrain with alpha = 5% of the original pre-training steps; at_mha was trained
for 1,500 steps, so 5% is 75 steps. Same batch (32 x 256), AdamW (0.9, 0.95), weight decay 0.1, constant lr 3e-4
(at_mha's final cosine lr) after 10 warmup steps; training windows from a fresh seed. Held-out loss on the same 20
fixed validation windows as every run. CPU, 4 threads.
Writes ../out/uptrain.json.  Run: LA_SCRATCH=<scratch>/la python uptrain.py
"""
import json, os, sys, time
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig  # noqa: E402
from train import held_out_loss, Batches, SCR  # noqa: E402

torch.set_num_threads(int(os.environ.get("AV_THREADS", "4")))


def convert(g):
    ck = torch.load(os.path.join(SCR, "runs", "at_mha", "ckpt.pt"), map_location="cpu")
    c = dict(ck["config"]); H, hd = c["n_head"], c["d_model"] // c["n_head"]
    c.update(attn="mqa" if g == 1 else "gqa", n_kv_head=g)
    m = GPT(GPTConfig(**c))
    sd = dict(ck["model"])
    for k in list(sd):
        if k.endswith(".mix.k.weight") or k.endswith(".mix.v.weight"):
            w = sd[k].view(g, H // g, hd, -1).mean(1)        # mean of the heads in each group
            sd[k] = w.reshape(g * hd, -1)
    m.load_state_dict(sd)
    return m


def uptrain(m, checkpoints, seed=7, lr=3e-4, warmup=10):
    """one optimiser for the whole uptraining; yields (step, curve) at each checkpoint step"""
    torch.manual_seed(seed)
    decay = [p for n, p in m.named_parameters() if p.dim() >= 2]
    nod = [p for n, p in m.named_parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": 0.1}, {"params": nod, "weight_decay": 0.0}],
                            lr=lr, betas=(0.9, 0.95))
    b = Batches("train", 32, m.cfg.ctx, seed)
    curve = []
    for s in range(max(checkpoints)):
        m.train()
        for gp in opt.param_groups:
            gp["lr"] = lr * min(1.0, (s + 1) / warmup)
        x, y = b.next("cpu")
        _, loss, _, _ = m(x, targets=y)
        loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step(); opt.zero_grad(set_to_none=True)
        if s % 5 == 0:
            curve.append([s + 1, round(loss.item(), 4)])
        if s + 1 in checkpoints:
            m.eval()
            yield s + 1, curve


def main():
    t0 = time.time()
    steps = int(sys.argv[1]) if len(sys.argv) > 1 else 75
    res = {"device": "Apple M1 Pro, CPU, 4 threads", "torch": torch.__version__, "source": "at_mha", "rows": []}
    for g in (4, 2, 1):
        m = convert(g)
        l0 = round(held_out_loss(m, "cpu", m.cfg.ctx), 4)
        row = {"kv_heads": g, "converted_no_training": l0, "uptrain": []}
        for st, curve in uptrain(m, [c for c in (15, 75, 150) if c <= steps]):
            row["uptrain"].append({"steps": st, "share_of_1500": round(st / 1500, 3),
                                   "held_out_20win": round(held_out_loss(m, "cpu", m.cfg.ctx), 4)})
            print(g, st, row["uptrain"][-1]["held_out_20win"], round(time.time() - t0), "s", flush=True)
        row["train_curve"] = curve
        res["rows"].append(row)
    res["trained_from_scratch_20win"] = {"4": 2.1612, "2": 2.1604, "1": 2.1536, "mha": 2.1374,
                                         "source": "Attention lab runs_summary.json (1,500 steps)"}
    res["seconds"] = round(time.time() - t0, 1)
    json.dump(res, open(os.path.join(HERE, "..", "out", "uptrain.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
