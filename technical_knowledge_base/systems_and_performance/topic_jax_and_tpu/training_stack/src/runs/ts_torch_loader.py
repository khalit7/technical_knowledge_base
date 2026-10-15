"""The PyTorch contrast for the Data lab: torch.utils.data.DataLoader on the same 7,781 windows.

T1 order: shuffle=True with a seeded generator, num_workers 0 and 2: the sampler runs in the main process.
T2 augmentation: a random crop offset drawn with torch.randint inside __getitem__, num_workers 0 vs 2.
T3 resume: the DataLoader has no state; resuming at batch k means re-creating it and skipping k batches.
Output: out/torch_loader.json
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

import numpy as np  # noqa: E402
import torch  # noqa: E402

C = T.C
SEQ, B = C.CFG["ctx"] + 1, C.CFG["batch"]


class DS(torch.utils.data.Dataset):
    def __init__(self):
        train, _ = C.tokens()
        n = len(train) // SEQ
        self.w = train[: n * SEQ].reshape(n, SEQ)

    def __len__(self):
        return len(self.w)

    def __getitem__(self, i):
        off = int(torch.randint(0, 8, ()).item())     # augmentation from torch's global generator
        return {"idx": i, "off": off}


def run(workers, seed=0, n=4):
    g = torch.Generator().manual_seed(seed)
    dl = torch.utils.data.DataLoader(DS(), batch_size=B, shuffle=True, generator=g, num_workers=workers, drop_last=True)
    it = iter(dl)
    out = [next(it) for _ in range(n)]
    return [[int(v) for v in b["idx"]] for b in out], {int(i): int(o) for b in out for i, o in zip(b["idx"], b["off"])}


def main():
    torch.set_num_threads(4)
    torch.manual_seed(0)
    o0, a0 = run(0)
    torch.manual_seed(0)
    o2, a2 = run(2)
    torch.manual_seed(0)
    o0b, a0b = run(0)
    common = set(a0) & set(a2)
    R = {"torch": torch.__version__,
         "T1": {"order_equal_0_2": o0 == o2, "first8": o0[0][:8]},
         "T2": {"offsets_equal_0_vs_2_workers": all(a0[i] == a2[i] for i in common), "records": len(common),
                "fraction_equal": float(np.mean([a0[i] == a2[i] for i in common])),
                "offsets_equal_rerun_0_workers": a0 == a0b,
                "example": [[i, a0[i], a2[i]] for i in sorted(common)[:6]]},
         "T3": {"has_state_dict": hasattr(torch.utils.data.DataLoader, "state_dict")}}
    print(R)
    T.save("torch_loader", R)


if __name__ == "__main__":
    main()
