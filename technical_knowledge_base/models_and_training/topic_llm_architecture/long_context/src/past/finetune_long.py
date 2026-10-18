"""Continue training the tiny GPT (at_mha: RoPE, trained 1,500 steps at 256 tokens by the root's Attention lab) for
300 steps at 1,024 tokens, either with position interpolation (RoPE linear x4: 'lc_pi_ft') or with plain RoPE
('lc_plain_ft'): the toy version of a long-context training phase. 300 x 8 x 1,024 = 2.46M tokens, 20% of the
original 12.3M. MPS under the bench lock; both MPS watermark variables set by the caller.
Run: LA_SCRATCH=<scratch>/la python finetune_long.py lc_pi_ft linear4 | lc_plain_ft plain"""
import json, math, os, sys, time
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../../../src/data"))
from tiny_gpt import GPT, GPTConfig
from train import Batches, held_out_loss, SCR

name, kind = sys.argv[1], sys.argv[2]
STEPS, BATCH, CTX, LR, WARM = 300, 8, 1024, 3e-4, 20
torch.manual_seed(0)
dev = "mps" if torch.backends.mps.is_available() else "cpu"
ck = torch.load(os.path.join(SCR, "runs", "at_mha", "ckpt.pt"), map_location="cpu")
cfg = dict(ck["config"]); cfg["ctx"] = CTX
cfg["rope_scaling"] = {"type": "linear", "factor": 4} if kind == "linear4" else None
m = GPT(GPTConfig(**cfg)); m.load_state_dict(ck["model"]); m.to(dev).train()
opt = torch.optim.AdamW(m.parameters(), lr=LR, betas=(0.9, 0.95), weight_decay=0.1)
b = Batches("train", BATCH, CTX, 7)
log = {"name": name, "from": "at_mha", "scaling": cfg["rope_scaling"], "steps": STEPS, "batch": BATCH, "ctx": CTX, "lr": LR,
       "eval": [{"step": 0, "val_1024": round(held_out_loss(m, dev, CTX, n_batches=10, batch=8), 4),
                 "val_256": round(held_out_loss(m, dev, 256, n_batches=20), 4)}], "train": []}
t0 = time.time()
for s in range(STEPS):
    lr = LR * min(1, (s + 1) / WARM) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * s / STEPS)))
    for g in opt.param_groups:
        g["lr"] = lr
    x, y = b.next(dev)
    _, loss, _, _ = m(x, targets=y)
    loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step(); opt.zero_grad(set_to_none=True)
    if s % 10 == 0:
        log["train"].append({"step": s, "loss": round(loss.item(), 4)})
    if (s + 1) % 100 == 0:
        log["eval"].append({"step": s + 1, "val_1024": round(held_out_loss(m, dev, CTX, n_batches=10, batch=8), 4),
                            "val_256": round(held_out_loss(m, dev, 256, n_batches=20), 4)})
        print(name, log["eval"][-1], round(time.time() - t0), flush=True)
log["seconds"] = round(time.time() - t0, 1)
out = os.path.join(SCR, "runs", name); os.makedirs(out, exist_ok=True)
cfg_save = dict(cfg); cfg_save["ctx"] = 256      # keep 256 so past_len.py evaluates from the same windows
torch.save({"config": cfg_save, "model": {k: v.cpu() for k, v in m.state_dict().items()}}, os.path.join(out, "ckpt.pt"))
json.dump(log, open(os.path.join(out, "log.json"), "w"), indent=1)
json.dump(log, open(os.path.join(HERE, "out", name + "_log.json"), "w"), indent=1)
