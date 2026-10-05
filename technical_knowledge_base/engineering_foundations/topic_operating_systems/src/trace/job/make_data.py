"""Create the running example's dataset: one flat binary file of float32 rows.

Layout: N rows of (D features + 1 label), float32, little-endian, no header.
N=8192, D=256 gives 8192 * 257 * 4 = 8,421,376 bytes (about 8 MiB).
Deterministic (seed 0), so every agent and every run sees the same bytes.
Usage: python make_data.py /work/data/train.bin
"""
import sys
import numpy as np

N, D, CLASSES = 8192, 256, 10


def main(path):
    rng = np.random.default_rng(0)
    x = rng.standard_normal((N, D), dtype=np.float32)
    w = rng.standard_normal((D, CLASSES), dtype=np.float32)
    y = (x @ w).argmax(axis=1).astype(np.float32)  # a learnable linear rule
    rows = np.concatenate([x, y[:, None]], axis=1)
    rows.tofile(path)
    print(f"wrote {path}: {rows.nbytes} bytes, {N} rows x {D + 1} float32")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/work/data/train.bin")
