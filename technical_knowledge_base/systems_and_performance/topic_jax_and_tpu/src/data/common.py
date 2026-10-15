"""Shared helper for the running example of Topic: jax-and-tpu.

Every tab imports this. Large artefacts (the text, the token arrays, initial weights, training logs)
live outside the repo, in the shared setup folder named by the environment variable JX_SCRATCH
(it holds venv/, data/, src/, SETUP.md, FACTS.md). Nothing here hard-codes a user path.

    import os, sys; sys.path.insert(0, "<root>/src/data"); import common as C
    C.CFG                         # the model and training configuration (a dict)
    train, val = C.tokens()       # uint8 numpy arrays of character ids
    x, y = C.batch(step)          # int32 [B, T] inputs and next-character targets, same for every framework
    C.encode("ROMEO:"), C.decode(ids)

Run with the shared venv:
    JAX_PLATFORMS=cpu $JX_SCRATCH/venv/bin/python -I -B your_script.py
(-I ignores the user site and PYTHON* variables, -B keeps __pycache__ out of the repo.)
"""
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- configuration
# One tiny decoder-only transformer, the same in PyTorch (model_torch.py), Flax NNX (model_nnx.py)
# and plain JAX (model_jax.py). See README.md for why these sizes.
CFG = dict(
    vocab=65,          # characters in TinyShakespeare (sorted set of the whole file)
    d_model=128,       # residual width
    n_layers=4,
    n_heads=4,         # head dimension 32
    d_ff=512,          # MLP hidden width (4 x d_model)
    ctx=128,           # context length in characters
    ln_eps=1e-5,       # LayerNorm epsilon, set explicitly (PyTorch default 1e-5, Flax default 1e-6)
    batch=32,          # sequences per step (4,096 characters per step)
    steps=500,         # steps of the setup equivalence run
    lr=1e-3,           # peak learning rate (AdamW)
    warmup=50,         # linear warmup steps, then constant
    betas=(0.9, 0.95),
    adam_eps=1e-8,
    weight_decay=0.1,  # on 2-D weight matrices only (not biases, LayerNorm, embeddings)
    clip=1.0,          # global gradient-norm clip
    seed=0,            # weight init seed (PyTorch) and batch-order seed (numpy)
    val_frac=0.1,      # last 10% of the text is the validation split
)


def scratch():
    s = os.environ.get("JX_SCRATCH")
    if not s or not os.path.isdir(s):
        raise RuntimeError("set JX_SCRATCH to the shared jax-and-tpu setup folder (see src/data/README.md)")
    return s


def path(*parts):
    return os.path.join(scratch(), *parts)


# ---------------------------------------------------------------- data
def text():
    with open(path("data", "tinyshakespeare.txt"), encoding="utf-8") as f:
        return f.read()


def vocab():
    with open(os.path.join(HERE, "vocab.json"), encoding="utf-8") as f:
        return json.load(f)["chars"]


def encode(s):
    stoi = {c: i for i, c in enumerate(vocab())}
    return np.array([stoi[c] for c in s], dtype=np.int32)


def decode(ids):
    chars = vocab()
    return "".join(chars[int(i)] for i in ids)


_TOK = {}


def tokens():
    """(train, val) uint8 arrays of character ids, the fixed 90/10 split."""
    if not _TOK:
        _TOK["train"] = np.fromfile(path("data", "train.bin"), dtype=np.uint8)
        _TOK["val"] = np.fromfile(path("data", "val.bin"), dtype=np.uint8)
    return _TOK["train"], _TOK["val"]


def offsets(n_steps=None, split="train"):
    """Start offsets [n_steps, batch] of every sequence, from numpy's PCG64 with seed CFG['seed']
    (train) or seed+1 (val). Deterministic and framework-free: PyTorch and JAX read the same batches."""
    tr, va = tokens()
    data = tr if split == "train" else va
    n_steps = n_steps or CFG["steps"]
    rng = np.random.default_rng(CFG["seed"] + (0 if split == "train" else 1))
    return rng.integers(0, len(data) - CFG["ctx"] - 1, size=(n_steps, CFG["batch"]))


_OFF = {}


def batch(step, split="train", n_steps=None):
    """int32 inputs x [B, T] and targets y [B, T] (y is x shifted by one character)."""
    key = (split, n_steps or CFG["steps"])
    if key not in _OFF:
        _OFF[key] = offsets(key[1], split)
    tr, va = tokens()
    data = tr if split == "train" else va
    o = _OFF[key][step]
    idx = o[:, None] + np.arange(CFG["ctx"] + 1)[None, :]
    seq = data[idx].astype(np.int32)
    return seq[:, :-1], seq[:, 1:]


def lr_at(step):
    """Learning rate used at optimizer step `step` (0-based): linear warmup to CFG['lr'], then constant.
    Both twins use exactly this schedule (optax: a schedule function; PyTorch: LambdaLR)."""
    return CFG["lr"] * min(1.0, (step + 1) / CFG["warmup"])


def decay_mask_name(name):
    """True if a parameter (by its dotted PyTorch name) gets weight decay: 2-D weight matrices only."""
    return name.endswith(".weight") and not (".ln" in name or name.startswith("ln_f") or "emb" in name)
