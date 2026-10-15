"""Prepare the running example's data from $JX_SCRATCH/data/tinyshakespeare.txt (downloaded once,
URL and sha256 in README.md and manifest.json): the character vocabulary (vocab.json, in the repo)
and the fixed 90/10 split as uint8 arrays ($JX_SCRATCH/data/train.bin, val.bin)."""
import hashlib
import json
import os

import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script folder from sys.path
import common as C  # noqa: E402

raw = open(C.path("data", "tinyshakespeare.txt"), "rb").read()
print("bytes", len(raw), "sha256", hashlib.sha256(raw).hexdigest())
txt = raw.decode("utf-8")
chars = sorted(set(txt))
assert len(chars) == C.CFG["vocab"], len(chars)
with open(os.path.join(C.HERE, "vocab.json"), "w", encoding="utf-8") as f:
    json.dump({"chars": chars, "n": len(chars)}, f, ensure_ascii=False)
stoi = {c: i for i, c in enumerate(chars)}
ids = np.array([stoi[c] for c in txt], dtype=np.uint8)
n_val = int(len(ids) * C.CFG["val_frac"])
train, val = ids[:-n_val], ids[-n_val:]
train.tofile(C.path("data", "train.bin"))
val.tofile(C.path("data", "val.bin"))
print("chars", len(txt), "vocab", len(chars), "train", len(train), "val", len(val))
