"""Keep many received batches alive in the main process. With PyTorch's default sharing strategy on
Linux ("file_descriptor"), each shared-memory tensor from a worker arrives as an open descriptor.
Usage: fdshare.py file_descriptor|file_system"""
import os, sys
import torch
import torch.multiprocessing as tmp
from torch.utils.data import Dataset, DataLoader

tmp.set_sharing_strategy(sys.argv[1])


class Many(Dataset):
    def __len__(self):
        return 1024

    def __getitem__(self, i):
        return [torch.full((16,), i) for _ in range(4)]  # four small tensors per sample


kept = []
try:
    for b in DataLoader(Many(), batch_size=None, num_workers=2, multiprocessing_context="fork"):
        kept.append(b)  # e.g. a list of outputs kept for evaluation
    print(f"strategy {sys.argv[1]}: kept {len(kept)} samples; open descriptors now: {len(os.listdir('/proc/self/fd'))}")
except Exception as e:
    print(f"strategy {sys.argv[1]}: failed after {len(kept)} samples with {type(e).__name__}: {str(e).splitlines()[0][:400]}")
    print(f"open descriptors at that point: {len(os.listdir('/proc/self/fd'))}")
