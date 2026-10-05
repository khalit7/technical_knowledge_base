"""SIGTERM handled with a flag that is checked only at the end of a gradient-accumulation cycle of
64 micro-batches, so the loop keeps fetching batches after the signal. Sent with pkill -TERM -f, the
signal also reached the DataLoader workers, which have no handler of their own and die."""
import os, signal, sys, time
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

stop = False


def on_term(sig, frame):
    global stop
    stop = True
    print(f"main {os.getpid()}: got SIGTERM, will stop at the end of this accumulation cycle", flush=True)


class Rows(Dataset):
    def __len__(self):
        return 10**7

    def __getitem__(self, i):
        time.sleep(0.002)
        return torch.randn(256)


signal.signal(signal.SIGTERM, on_term)
torch.set_num_threads(1)
m = torch.nn.Linear(256, 10)
dl = DataLoader(Rows(), batch_size=16, num_workers=2, multiprocessing_context="fork")
print(f"main {os.getpid()} training", flush=True)
try:
    for step, x in enumerate(dl):
        m(x).sum().backward()
        if step % 64 == 63:
            if stop:
                torch.save(m.state_dict(), "/work/ckpt.pt"); print("checkpoint saved", flush=True); break
except Exception as e:
    print(f"{type(e).__name__}: {e}", flush=True)
    sys.exit(1)
