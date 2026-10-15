"""The running example in Flax NNX: the same tiny decoder-only character LM as model_torch.py,
written the way a PyTorch user would expect (modules are Python objects that hold their state).

Differences from PyTorch that matter for equality, all set explicitly here:
- nnx.Linear stores `kernel` as [in, out] (PyTorch's Linear.weight is [out, in]): transfer transposes.
- nnx.LayerNorm's default epsilon is 1e-6 (PyTorch 1e-5): passed explicitly.
- jax.nn.gelu defaults to the tanh approximation (PyTorch's F.gelu defaults to exact erf): approximate=False.
- Initialisers: Flax defaults are lecun_normal kernels and zero biases (PyTorch Linear uses
  kaiming_uniform(a=sqrt(5))); both twins use N(0, 0.02) here, and from_torch() copies the exact
  PyTorch weights anyway.
"""
import math

import jax
import jax.numpy as jnp
import optax
from flax import nnx

_init = nnx.initializers.normal(0.02)
_List = getattr(nnx, "List", list)   # Flax 0.12 wants module lists wrapped in nnx.List


def _linear(i, o, rngs, bias=True):
    return nnx.Linear(i, o, use_bias=bias, kernel_init=_init, rngs=rngs)


class Attention(nnx.Module):
    def __init__(self, d, h, *, rngs):
        self.h, self.dh = h, d // h
        self.wq, self.wk, self.wv, self.wo = (_linear(d, d, rngs) for _ in range(4))

    def __call__(self, x):                                   # x [B, T, D]
        B, T, D = x.shape
        split = lambda t: t.reshape(B, T, self.h, self.dh).transpose(0, 2, 1, 3)
        q, k, v = split(self.wq(x)), split(self.wk(x)), split(self.wv(x))
        s = q @ k.transpose(0, 1, 3, 2) / math.sqrt(self.dh)
        s = jnp.where(jnp.tril(jnp.ones((T, T), bool)), s, -jnp.inf)
        a = jax.nn.softmax(s, axis=-1) @ v
        return self.wo(a.transpose(0, 2, 1, 3).reshape(B, T, D))


class MLP(nnx.Module):
    def __init__(self, d, f, *, rngs):
        self.fc1, self.fc2 = _linear(d, f, rngs), _linear(f, d, rngs)

    def __call__(self, x):
        return self.fc2(jax.nn.gelu(self.fc1(x), approximate=False))


class Block(nnx.Module):
    def __init__(self, cfg, *, rngs):
        d = cfg["d_model"]
        self.ln1 = nnx.LayerNorm(d, epsilon=cfg["ln_eps"], rngs=rngs)
        self.attn = Attention(d, cfg["n_heads"], rngs=rngs)
        self.ln2 = nnx.LayerNorm(d, epsilon=cfg["ln_eps"], rngs=rngs)
        self.mlp = MLP(d, cfg["d_ff"], rngs=rngs)

    def __call__(self, x):
        x = x + self.attn(self.ln1(x))
        return x + self.mlp(self.ln2(x))


class TinyLM(nnx.Module):
    def __init__(self, cfg, *, rngs):
        d = cfg["d_model"]
        self.tok_emb = nnx.Embed(cfg["vocab"], d, embedding_init=_init, rngs=rngs)
        self.pos_emb = nnx.Embed(cfg["ctx"], d, embedding_init=_init, rngs=rngs)
        self.blocks = _List([Block(cfg, rngs=rngs) for _ in range(cfg["n_layers"])])
        self.ln_f = nnx.LayerNorm(d, epsilon=cfg["ln_eps"], rngs=rngs)
        self.head = _linear(d, cfg["vocab"], rngs, bias=False)

    def __call__(self, idx):                                 # idx int32 [B, T] -> logits [B, T, V]
        T = idx.shape[1]
        x = self.tok_emb(idx) + self.pos_emb(jnp.arange(T))
        for b in self.blocks:
            x = b(x)
        return self.head(self.ln_f(x))


def make_model(cfg, seed=0):
    return TinyLM(cfg, rngs=nnx.Rngs(seed))


def from_torch(model, sd):
    """Copy a PyTorch state dict ({name: numpy array}, model_torch.state_numpy) into an NNX model in place."""
    a = lambda k: jnp.asarray(sd[k])

    def lin(m, p, bias=True):
        m.kernel.value = a(p + ".weight").T                  # [out, in] -> [in, out]
        if bias:
            m.bias.value = a(p + ".bias")

    def ln(m, p):
        m.scale.value, m.bias.value = a(p + ".weight"), a(p + ".bias")

    model.tok_emb.embedding.value = a("tok_emb.weight")
    model.pos_emb.embedding.value = a("pos_emb.weight")
    for i, b in enumerate(model.blocks):
        ln(b.ln1, f"blocks.{i}.ln1"); ln(b.ln2, f"blocks.{i}.ln2")
        for n in ("wq", "wk", "wv", "wo"):
            lin(getattr(b.attn, n), f"blocks.{i}.attn.{n}")
        lin(b.mlp.fc1, f"blocks.{i}.mlp.fc1"); lin(b.mlp.fc2, f"blocks.{i}.mlp.fc2")
    ln(model.ln_f, "ln_f")
    lin(model.head, "head", bias=False)
    return model


def loss_fn(model, x, y):
    return optax.softmax_cross_entropy_with_integer_labels(model(x), y).mean()


def _decay_mask(state):
    # weight decay on Linear kernels only (2-D weight matrices), as in model_torch.make_optimizer
    return jax.tree_util.tree_map_with_path(
        lambda path, _: any(getattr(k, "key", None) == "kernel" for k in path), state)


def make_optimizer(model, cfg):
    tx = optax.chain(
        optax.clip_by_global_norm(cfg["clip"]),
        optax.adamw(learning_rate=lambda count: cfg["lr"] * jnp.minimum(1.0, (count + 1) / cfg["warmup"]),
                    b1=cfg["betas"][0], b2=cfg["betas"][1], eps=cfg["adam_eps"],
                    weight_decay=cfg["weight_decay"], mask=_decay_mask))
    return nnx.Optimizer(model, tx, wrt=nnx.Param)


@nnx.jit
def train_step(model, optimizer, x, y):
    loss, grads = nnx.value_and_grad(loss_fn)(model, x, y)
    optimizer.update(model, grads)                           # Flax >= 0.11: update(model, grads)
    return loss, optax.global_norm(grads)


def to_torch_names(model):
    """NNX model -> {pytorch name: numpy array in PyTorch layout} (inverse of from_torch)."""
    import numpy as np
    g = lambda v: np.asarray(v.value)
    out = {"tok_emb.weight": g(model.tok_emb.embedding), "pos_emb.weight": g(model.pos_emb.embedding),
           "ln_f.weight": g(model.ln_f.scale), "ln_f.bias": g(model.ln_f.bias), "head.weight": g(model.head.kernel).T}
    for i, b in enumerate(model.blocks):
        for n in ("ln1", "ln2"):
            out[f"blocks.{i}.{n}.weight"], out[f"blocks.{i}.{n}.bias"] = g(getattr(b, n).scale), g(getattr(b, n).bias)
        for grp, names in (("attn", ("wq", "wk", "wv", "wo")), ("mlp", ("fc1", "fc2"))):
            for n in names:
                m = getattr(getattr(b, grp), n)
                out[f"blocks.{i}.{grp}.{n}.weight"], out[f"blocks.{i}.{grp}.{n}.bias"] = g(m.kernel).T, g(m.bias)
    return out
