"""Train the running example for a few steps and print the loss.

    python train.py --steps 20 --device cpu      # or --device mps
    python train.py --steps 20 --checkpoint      # activation checkpointing per block

Run with any Python that has torch (the topic used torch 2.14.1).
"""
import argparse
import time

import torch

from model import GPTConfig, make_model, get_batch, make_optimizer, train_step, n_params, decode


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", type=int, default=20)
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--attn", default="sdpa", choices=["sdpa", "manual"])
    ap.add_argument("--checkpoint", action="store_true")
    ap.add_argument("--threads", type=int, default=0, help="torch.set_num_threads (0 leaves the default)")
    a = ap.parse_args()
    if a.threads:
        torch.set_num_threads(a.threads)
    cfg = GPTConfig(attn=a.attn, checkpoint=a.checkpoint)
    model = make_model(cfg, a.device)
    opt = make_optimizer(model)
    print(f"torch {torch.__version__}, device {a.device}, {n_params(model):,} parameters, cfg {cfg}")
    for step in range(a.steps):
        x, y = get_batch(cfg, step, a.device)
        t0 = time.perf_counter()
        loss = train_step(model, opt, x, y)
        lv = loss.item()                      # .item() synchronises, so the time covers the whole step
        print(f"step {step:3d}  loss {lv:.4f}  {1e3 * (time.perf_counter() - t0):7.1f} ms")
    # greedy sample, to see it has learned something
    model.eval()
    idx = torch.tensor([[0]], device=a.device)
    with torch.no_grad():
        for _ in range(60):
            logits, _ = model(idx[:, -cfg.block_size:])
            idx = torch.cat([idx, logits[:, -1].argmax(-1, keepdim=True)], 1)
    print("sample:", repr(decode(idx[0].tolist())))


if __name__ == "__main__":
    main()
