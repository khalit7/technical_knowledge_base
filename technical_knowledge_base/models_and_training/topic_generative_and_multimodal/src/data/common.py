"""Shared helpers for every lab of Topic: generative-and-multimodal.

Import from a lab script with:
    import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "data"))
    from common import *

Large files (the dataset arrays, checkpoints, Inception statistics, the venv, source clones) live
outside the repo in the folder named by the environment variable GM_SCRATCH (the shared setup folder).
Nothing here hard-codes a machine path.
"""
import gzip, hashlib, json, os, random, resource, struct, threading, time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SCRATCH = os.environ.get("GM_SCRATCH")


def scratch(*parts):
    """Path inside the shared setup folder (GM_SCRATCH must be set)."""
    if not SCRATCH:
        raise RuntimeError("set GM_SCRATCH to the shared setup folder (see src/data/README.md)")
    return os.path.join(SCRATCH, *parts)


# ---------------------------------------------------------------- threads, seeds, device
def cap_threads(n=4):
    """At most 4 CPU threads per job (machine rule). Call before heavy CPU work."""
    for k in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "VECLIB_MAXIMUM_THREADS", "OPENBLAS_NUM_THREADS"):
        os.environ[k] = str(n)
    import torch
    torch.set_num_threads(n)


def seed_all(seed=0):
    import torch
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)


def device(prefer="mps"):
    """'mps' only if asked and available; GPU work must run under the bench lock (README)."""
    import torch
    if prefer == "mps" and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def empty_cache():
    import torch, gc
    gc.collect()
    if torch.backends.mps.is_available():
        torch.mps.empty_cache()


# ---------------------------------------------------------------- the running example: Fashion-MNIST
CLASSES = ["T-shirt/top", "Trouser", "Pullover", "Dress", "Coat",
           "Sandal", "Shirt", "Sneaker", "Bag", "Ankle boot"]
NULL_CLASS = 10          # the "no label" index used for classifier-free guidance (label dropout)
IMG = 32                 # 28x28 padded by 2 on each side, so a U-Net can halve it three times


def _read_idx(path):
    with gzip.open(path, "rb") as f:
        magic, = struct.unpack(">I", f.read(4))
        nd = magic & 0xFF
        dims = struct.unpack(">" + "I" * nd, f.read(4 * nd))
        return np.frombuffer(f.read(), dtype=np.uint8).reshape(dims)


def load_split(split):
    """uint8 images [N,28,28] and int64 labels [N] for split in train|val|test.

    train/val: the official 60,000 training images split 55,000/5,000 by a fixed permutation (seed 0);
    test: the official 10,000 test images. Arrays are cached in GM_SCRATCH/data/fmnist.npz.
    """
    npz = scratch("data", "fmnist.npz")
    d = np.load(npz)
    return d[f"x_{split}"], d[f"y_{split}"].astype(np.int64)


def to_model(x_uint8):
    """uint8 [N,28,28] -> float32 tensor [N,1,32,32] in [-1,1], background -1 (padding = background)."""
    import torch
    x = torch.from_numpy(np.asarray(x_uint8)).float().div(127.5).sub(1.0)
    x = torch.nn.functional.pad(x, (2, 2, 2, 2), value=-1.0)
    return x.unsqueeze(1)


def from_model(x):
    """float tensor [N,1,32,32] in [-1,1] -> uint8 numpy [N,28,28] (crop the padding, clamp, round)."""
    x = x.detach().float().cpu().clamp(-1, 1)[:, 0, 2:30, 2:30]
    return ((x + 1) * 127.5).round().to(dtype=__import__("torch").uint8).numpy()


def batches(x_uint8, y, batch_size, seed=0, drop_last=True):
    """Endless shuffled minibatches (x [-1,1] padded, y) with a fixed seed: identical across labs."""
    import torch
    rng = np.random.default_rng(seed)
    n = len(y)
    while True:
        p = rng.permutation(n)
        for i in range(0, n - (batch_size if drop_last else 1) + 1, batch_size):
            j = p[i:i + batch_size]
            yield to_model(x_uint8[j]), torch.from_numpy(y[j])


def test16():
    """The 16 fixed test images: uint8 [16,28,28], labels [16], test-set indices [16] (see README)."""
    meta = json.load(open(os.path.join(HERE, "splits.json")))
    idx = np.array(meta["test16_indices"])
    x, y = load_split("test")
    return x[idx], y[idx], idx


# ---------------------------------------------------------------- measurement helpers
class PeakMem:
    """Samples MPS driver memory every 0.1 s; .peak_mb is the maximum seen, .rss_mb the process max RSS.

    On Apple silicon GPU memory is unified: the MPS driver figure is the honest one for model weights and
    activations; ru_maxrss covers the Python process (CPU tensors, the interpreter, mapped files).
    """
    def __init__(self):
        self.peak = 0; self._stop = False

    def _run(self):
        import torch
        while not self._stop:
            try:
                self.peak = max(self.peak, torch.mps.driver_allocated_memory())
            except Exception:
                pass
            time.sleep(0.1)

    def __enter__(self):
        self.t = threading.Thread(target=self._run, daemon=True); self.t.start(); return self

    def __exit__(self, *a):
        self._stop = True; self.t.join()

    @property
    def peak_mb(self):
        return round(self.peak / 2**20, 1)

    @property
    def rss_mb(self):
        return round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**20, 1)  # bytes on macOS


def sync(dev):
    import torch
    if str(dev) == "mps":
        torch.mps.synchronize()


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def touch_bench(prefix):
    """Keep the shared bench lock fresh during long GPU runs (call at least every 10 minutes)."""
    lock = os.environ.get("GM_LOCK")  # path to lock.sh, set by the caller
    if lock:
        os.system(f"sh '{lock}' touch bench {prefix} >/dev/null 2>&1")


MACHINE = "Apple M1 Pro (10 CPU cores, 16 GB unified memory), macOS 27.0.1"
