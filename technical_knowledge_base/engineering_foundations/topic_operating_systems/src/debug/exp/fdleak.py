"""A Dataset that opens one file per sample and never closes it (a classic leak: open() without
'with', kept alive by a cache). Usage: fdleak.py"""
import os
import torch
from torch.utils.data import Dataset, DataLoader

os.makedirs("/work/samples", exist_ok=True)
for i in range(256):
    with open(f"/work/samples/{i}.bin", "wb") as f:
        f.write(os.urandom(1024))


class Files(Dataset):
    def __init__(self):
        self.handles = []

    def __len__(self):
        return 256

    def __getitem__(self, i):
        f = open(f"/work/samples/{i}.bin", "rb")
        self.handles.append(f)  # the leak: the file object stays alive, so its descriptor stays open
        return torch.frombuffer(bytearray(f.read()), dtype=torch.uint8)


for i, b in enumerate(DataLoader(Files(), batch_size=8, num_workers=0)):
    pass
print("epoch done", flush=True)
