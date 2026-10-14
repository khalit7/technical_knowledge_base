"""Rough loader throughput on CPU (shared machine, nice 15, at most 4 workers): how many tokens per second can a
memory-mapped token file deliver, read the nanoGPT way (random windows) and the Megatron/datatrove way (a precomputed
index, windows read in a shuffled order), with a PyTorch DataLoader and 0, 2 or 4 workers. Timings are rough.
  nice -n 15 <venv>/bin/python -I loader_speed.py <tokens .bin (uint32)> <out.json>
"""
import json, sys, time
import numpy as np, torch
from torch.utils.data import DataLoader, Dataset
binp, out = sys.argv[1], sys.argv[2]
L, BS, STEPS = 2048, 8, 60
data = np.memmap(binp, dtype=np.uint32, mode="r"); n = len(data)
res = {"tokens_in_file": int(n), "L": L, "batch": BS, "steps": STEPS}

def nanogpt_style():  # train.py get_batch (nanoGPT 3adf61e, lines 116-131): new memmap each batch, random offsets
    t0 = time.perf_counter(); g = torch.Generator().manual_seed(0)
    for _ in range(STEPS):
        d = np.memmap(binp, dtype=np.uint32, mode="r")
        ix = torch.randint(len(d) - L, (BS,), generator=g)
        x = torch.stack([torch.from_numpy(d[i:i + L].astype(np.int64)) for i in ix])
        y = torch.stack([torch.from_numpy(d[i + 1:i + 1 + L].astype(np.int64)) for i in ix])
    return STEPS * BS * L / (time.perf_counter() - t0)
class Windows(Dataset):  # Megatron/datatrove style: sample i = window i of a fixed tiling, order from a shuffled index
    def __init__(self): self.n = (n - 1) // L
    def __len__(self): return self.n
    def __getitem__(self, i):
        d = np.memmap(binp, dtype=np.uint32, mode="r"); w = torch.from_numpy(d[i * L:i * L + L + 1].astype(np.int64)); return w[:-1], w[1:]
def dl(workers):
    g = torch.Generator().manual_seed(0)
    loader = DataLoader(Windows(), batch_size=BS, shuffle=True, generator=g, num_workers=workers,
                        multiprocessing_context="fork" if workers else None, prefetch_factor=2 if workers else None)
    it = iter(loader); next(it)  # start-up excluded
    t0 = time.perf_counter()
    for _ in range(STEPS): next(it)
    return STEPS * BS * L / (time.perf_counter() - t0)
best = lambda f, k=3: max(f() for _ in range(k))
res["nanogpt_get_batch_tok_s"] = best(nanogpt_style)
for w in (0, 2, 4): res["dataloader_%d_workers_tok_s" % w] = best(lambda: dl(w))
res["versions"] = {"torch": torch.__version__, "numpy": np.__version__}
json.dump(res, open(out, "w"), indent=1); print(res)
