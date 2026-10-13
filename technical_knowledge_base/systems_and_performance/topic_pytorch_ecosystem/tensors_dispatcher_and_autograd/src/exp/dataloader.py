"""DataLoader workers: per-worker seeding and pin_memory on this machine (deterministic).

python dataloader.py > ../inputs/dataloader.json
"""
import json
import multiprocessing
import random

import numpy as np
import torch


class Rand(torch.utils.data.Dataset):
    def __len__(self):
        return 4

    def __getitem__(self, i):
        info = torch.utils.data.get_worker_info()
        return torch.tensor([i, info.id if info else -1, torch.rand(1).item(), random.random(), np.random.rand()])


def rows(**kw):
    torch.manual_seed(0)
    return [[round(float(v), 4) for v in b[0]] for b in torch.utils.data.DataLoader(Rand(), batch_size=1, **kw)]


if __name__ == "__main__":
    import subprocess
    import sys
    if sys.argv[1:] == ["--main-only"]:
        print(json.dumps(rows(num_workers=0)))
        sys.exit(0)
    dl = {"torch": torch.__version__, "start_method": multiprocessing.get_start_method()}
    dl["two_workers"] = rows(num_workers=2)
    dl["same_seed_same_values"] = dl["two_workers"] == rows(num_workers=2)
    dl["no_workers_two_processes"] = [json.loads(subprocess.run([sys.executable, __file__, "--main-only"], capture_output=True, text=True).stdout) for _ in range(2)]
    import warnings
    with warnings.catch_warnings(record=True) as wl:
        warnings.simplefilter("always")
        b = next(iter(torch.utils.data.DataLoader(Rand(), batch_size=2, num_workers=0, pin_memory=True)))
    dl["pin_memory_warning"] = [str(w.message) for w in wl if "pin" in str(w.message)]
    dl["tensor_pin_memory_is_pinned"] = torch.randn(4).pin_memory().is_pinned()
    dl["pin_memory_batch_is_pinned"] = b.is_pinned()
    print(json.dumps(dl, indent=1))
