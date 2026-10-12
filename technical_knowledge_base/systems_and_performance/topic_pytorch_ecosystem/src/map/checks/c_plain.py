"""Reference: the plain PyTorch loop for 3 steps, to compare the wrappers' losses against (same seed, same batches)."""
from common import *
import torch
torch.set_num_threads(2)
from model import GPTConfig, make_model, get_batch, make_optimizer, train_step
cfg = GPTConfig(); m = make_model(cfg, "cpu"); opt = make_optimizer(m)
losses = []
for k in range(3):
    x, y = get_batch(cfg, k); losses.append(round(train_step(m, opt, x, y).item(), 5))
save("plain_loop", {"losses": losses})
