"""Build the running example's arrays and fixed splits from the four official Fashion-MNIST files.

Input: GM_SCRATCH/data/fmnist_raw/*.gz (downloaded from the official mirror, md5 checked below).
Output: GM_SCRATCH/data/fmnist.npz (not committed), src/data/splits.json, src/data/test16/*.png (committed).
Run: GM_SCRATCH=... nice -n 15 python -I prepare_data.py
"""
import hashlib, json, os, sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import HERE, CLASSES, _read_idx, scratch, sha256

MD5 = {  # the values torchvision 0.29.1 checks (torchvision/datasets/mnist.py, FashionMNIST.resources)
    "train-images-idx3-ubyte.gz": "8d4fb7e6c68d591d4c3dfef9ec88bf0d",
    "train-labels-idx1-ubyte.gz": "25c81989df183df01b3e8a0aad5dffbe",
    "t10k-images-idx3-ubyte.gz": "bef4ecab320f06d8554ea6380940ec79",
    "t10k-labels-idx1-ubyte.gz": "bb300cfdad3c16e7a12a480ee83cd310",
}

raw = scratch("data", "fmnist_raw")
files = {}
for name, md5 in MD5.items():
    p = os.path.join(raw, name)
    got = hashlib.md5(open(p, "rb").read()).hexdigest()
    assert got == md5, (name, got)
    files[name] = {"md5": md5, "sha256": sha256(p), "bytes": os.path.getsize(p)}

xtr = _read_idx(os.path.join(raw, "train-images-idx3-ubyte.gz"))
ytr = _read_idx(os.path.join(raw, "train-labels-idx1-ubyte.gz"))
xte = _read_idx(os.path.join(raw, "t10k-images-idx3-ubyte.gz"))
yte = _read_idx(os.path.join(raw, "t10k-labels-idx1-ubyte.gz"))
assert xtr.shape == (60000, 28, 28) and xte.shape == (10000, 28, 28)

perm = np.random.default_rng(0).permutation(60000)
val_idx, train_idx = np.sort(perm[:5000]), np.sort(perm[5000:])
np.savez(scratch("data", "fmnist.npz"),
         x_train=xtr[train_idx], y_train=ytr[train_idx], x_val=xtr[val_idx], y_val=ytr[val_idx],
         x_test=xte, y_test=yte)

# 16 fixed test images: the first test image of each class 0..9, then the second of classes 0..5
first = [int(np.flatnonzero(yte == c)[0]) for c in range(10)]
second = [int(np.flatnonzero(yte == c)[1]) for c in range(6)]
t16 = first + second

out = os.path.join(HERE, "test16")
os.makedirs(out, exist_ok=True)
for k, i in enumerate(t16):
    Image.fromarray(xte[i]).save(os.path.join(out, f"{k:02d}_test{i}_c{yte[i]}.png"), optimize=True)
grid = np.full((2 * 30 + 2, 8 * 30 + 2), 0, np.uint8)
for k, i in enumerate(t16):
    r, c = divmod(k, 8)
    grid[2 + r * 30:2 + r * 30 + 28, 2 + c * 30:2 + c * 30 + 28] = xte[i]
Image.fromarray(grid).save(os.path.join(out, "grid_8x2.png"), optimize=True)


def h(a):
    return hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()[:16]


meta = {
    "dataset": "Fashion-MNIST (Xiao, Rasul, Vollgraf 2017), MIT licence, Zalando SE",
    "source": "http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/ (official mirror listed in github.com/zalandoresearch/fashion-mnist)",
    "files": files,
    "classes": CLASSES,
    "split_rule": "train/val: np.random.default_rng(0).permutation(60000); first 5000 -> val, rest -> train (both sorted); test: official 10000",
    "sizes": {"train": len(train_idx), "val": len(val_idx), "test": 10000},
    "val_indices_sha16": h(val_idx), "train_indices_sha16": h(train_idx),
    "array_sha16": {"x_train": h(xtr[train_idx]), "x_val": h(xtr[val_idx]), "x_test": h(xte)},
    "class_counts": {s: np.bincount(y, minlength=10).tolist() for s, y in
                     (("train", ytr[train_idx]), ("val", ytr[val_idx]), ("test", yte))},
    "test16_rule": "first test image of each class 0..9, then the second test image of classes 0..5",
    "test16_indices": t16,
    "test16_labels": [int(yte[i]) for i in t16],
    "model_format": "uint8 28x28 -> float [-1,1], padded by 2 pixels of -1 to 32x32, 1 channel (common.to_model)",
    "pixel_stats_train": {"mean_uint8": float(xtr[train_idx].mean()), "std_uint8": float(xtr[train_idx].std())},
}
json.dump(meta, open(os.path.join(HERE, "splits.json"), "w"), indent=1)
print(json.dumps({k: meta[k] for k in ("sizes", "test16_indices", "test16_labels", "pixel_stats_train")}))
