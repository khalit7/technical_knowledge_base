"""The running example with logical-axis sharding annotations (used by ts_nnx_shard.py and ts_ckpt_mesh.py)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402,F401
from flax import nnx  # noqa: E402

import model_nnx as MN  # noqa: E402

init = MN._init
W = nnx.with_partitioning


def lin(i, o, rngs, names, bias=True):
    return nnx.Linear(i, o, use_bias=bias, kernel_init=W(init, names), rngs=rngs)


class Attention(MN.Attention):
    def __init__(self, d, h, *, rngs):
        self.h, self.dh = h, d // h
        self.wq, self.wk, self.wv = (lin(d, d, rngs, ("embed", "heads")) for _ in range(3))
        self.wo = lin(d, d, rngs, ("heads", "embed"))


class MLP(MN.MLP):
    def __init__(self, d, f, *, rngs):
        self.fc1, self.fc2 = lin(d, f, rngs, ("embed", "mlp")), lin(f, d, rngs, ("mlp", "embed"))


class Block(MN.Block):
    def __init__(self, cfg, *, rngs):
        d = cfg["d_model"]
        self.ln1 = nnx.LayerNorm(d, epsilon=cfg["ln_eps"], rngs=rngs)
        self.attn = Attention(d, cfg["n_heads"], rngs=rngs)
        self.ln2 = nnx.LayerNorm(d, epsilon=cfg["ln_eps"], rngs=rngs)
        self.mlp = MLP(d, cfg["d_ff"], rngs=rngs)


class ShardedLM(MN.TinyLM):
    def __init__(self, cfg, *, rngs):
        d = cfg["d_model"]
        self.tok_emb = nnx.Embed(cfg["vocab"], d, embedding_init=W(init, ("vocab", "embed")), rngs=rngs)
        self.pos_emb = nnx.Embed(cfg["ctx"], d, embedding_init=W(init, (None, "embed")), rngs=rngs)
        self.blocks = nnx.List([Block(cfg, rngs=rngs) for _ in range(cfg["n_layers"])])
        self.ln_f = nnx.LayerNorm(d, epsilon=cfg["ln_eps"], rngs=rngs)
        self.head = lin(d, cfg["vocab"], rngs, ("embed", "vocab"), bias=False)


RULES = (("batch", "data"), ("embed", None), ("heads", "model"), ("mlp", "model"), ("vocab", None))
