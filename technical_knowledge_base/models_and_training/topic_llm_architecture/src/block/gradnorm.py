"""Block lab: gradient norm by layer for pre-norm and post-norm tiny GPTs, at initialisation and after training,
on a fixed batch of held-out windows (the measurement behind Xiong et al. 2020, Figure 3: post-norm's gradients are
largest near the output at initialisation, which is why it needs a warmup).

Run on CPU: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python src/block/gradnorm.py run1 run2 ...
Each run contributes "init" (fresh model with its config, seed 0) and "trained" (its checkpoint).
Writes src/block/out/gradnorm.json.
"""
import json, os, sys
import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig  # noqa: E402

SCR = os.environ["LA_SCRATCH"]


def batch(n=8, ctx=256, seed=1234):
    data = np.memmap(os.path.join(SCR, "data", "val.bin"), dtype=np.uint16, mode="r")
    ix = np.random.default_rng(seed).integers(0, len(data) - ctx - 1, n)
    x = torch.from_numpy(np.stack([data[i:i + ctx + 1].astype(np.int64) for i in ix]))
    return x[:, :-1], x[:, 1:]


def measure(m, x, y):
    m.zero_grad(set_to_none=True)
    _, loss, _, _ = m(x, targets=y)
    loss.backward()
    per_block, ffn_down, attn_o = [], [], []
    for b in m.blocks:
        g = torch.sqrt(sum((p.grad.float() ** 2).sum() for p in b.parameters() if p.grad is not None))
        per_block.append(float("%.4g" % float(g)))
        ffn_down.append(float("%.4g" % float(b.ffn.down.weight.grad.norm())))
        attn_o.append(float("%.4g" % float(b.mix.o.weight.grad.norm())))
    total = torch.sqrt(sum((p.grad.float() ** 2).sum() for p in m.parameters() if p.grad is not None))
    return {"loss": round(loss.item(), 4), "total": round(float(total), 5), "per_block": per_block,
            "ffn_down_w": ffn_down, "attn_o_w": attn_o}


def main():
    torch.set_num_threads(4)
    x, y = batch()
    res = {"batch": "8 held-out windows of 256 tokens (val split, seed 1234)", "runs": {}}
    for name in sys.argv[1:]:
        ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
        cfg = GPTConfig(**ck["config"])
        torch.manual_seed(0)
        m = GPT(cfg).train()
        r = {"norm_pos": cfg.norm_pos, "init": measure(m, x, y)}
        m.load_state_dict(ck["model"])
        r["trained"] = measure(m, x, y)
        res["runs"][name] = r
        print(name, cfg.norm_pos, "init per block", r["init"]["per_block"], "trained", r["trained"]["per_block"])
    json.dump(res, open(os.path.join(HERE, "out", "gradnorm.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
