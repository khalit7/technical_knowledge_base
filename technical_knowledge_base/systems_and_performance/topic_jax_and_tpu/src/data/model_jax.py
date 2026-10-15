"""The running example in plain JAX + optax (no Flax): parameters are a pytree of arrays,
the model is a pure function apply(params, x), and the train step is a pure function
(params, opt_state, x, y) -> (params, opt_state, loss), jitted. This is the version the
transforms and compiler tabs trace, lower and compile.

Layout: Linear weights are [in, out] (x @ w), the transpose of PyTorch's [out, in].
"""
import math

import jax
import jax.numpy as jnp
import optax


# ---------------------------------------------------------------- init and weight transfer
def init_params(cfg, key):
    """Same distributions as model_torch.py (N(0, 0.02) weights, zero biases, LayerNorm 1/0), JAX RNG."""
    d, f, V = cfg["d_model"], cfg["d_ff"], cfg["vocab"]
    keys = iter(jax.random.split(key, 3 + 6 * cfg["n_layers"]))
    n = lambda shape: 0.02 * jax.random.normal(next(keys), shape, jnp.float32)
    lin = lambda i, o: {"w": n((i, o)), "b": jnp.zeros((o,), jnp.float32)}
    ln = lambda: {"scale": jnp.ones((d,), jnp.float32), "bias": jnp.zeros((d,), jnp.float32)}
    blocks = [{"ln1": ln(), "attn": {k: lin(d, d) for k in ("wq", "wk", "wv", "wo")},
               "ln2": ln(), "mlp": {"fc1": lin(d, f), "fc2": lin(f, d)}} for _ in range(cfg["n_layers"])]
    return {"tok_emb": n((V, d)), "pos_emb": n((cfg["ctx"], d)), "blocks": blocks,
            "ln_f": ln(), "head": {"w": n((d, V))}}


def from_torch(sd, cfg):
    """PyTorch state dict as {name: numpy array} (model_torch.state_numpy) -> params pytree."""
    a = lambda k: jnp.asarray(sd[k])
    lin = lambda p: {"w": a(p + ".weight").T, "b": a(p + ".bias")}
    ln = lambda p: {"scale": a(p + ".weight"), "bias": a(p + ".bias")}
    blocks = [{"ln1": ln(f"blocks.{i}.ln1"),
               "attn": {k: lin(f"blocks.{i}.attn.{k}") for k in ("wq", "wk", "wv", "wo")},
               "ln2": ln(f"blocks.{i}.ln2"),
               "mlp": {"fc1": lin(f"blocks.{i}.mlp.fc1"), "fc2": lin(f"blocks.{i}.mlp.fc2")}}
              for i in range(cfg["n_layers"])]
    return {"tok_emb": a("tok_emb.weight"), "pos_emb": a("pos_emb.weight"), "blocks": blocks,
            "ln_f": ln("ln_f"), "head": {"w": a("head.weight").T}}


# ---------------------------------------------------------------- the model as pure functions
def layer_norm(p, x, eps):
    mu = x.mean(-1, keepdims=True)
    var = ((x - mu) ** 2).mean(-1, keepdims=True)            # biased variance, as PyTorch and Flax
    return (x - mu) / jnp.sqrt(var + eps) * p["scale"] + p["bias"]


def linear(p, x):
    return x @ p["w"] + p["b"]


def attention(p, x, n_heads):                                # x [B, T, D]
    B, T, D = x.shape
    dh = D // n_heads
    split = lambda t: t.reshape(B, T, n_heads, dh).transpose(0, 2, 1, 3)   # [B, H, T, dh]
    q, k, v = (split(linear(p[n], x)) for n in ("wq", "wk", "wv"))
    s = q @ k.transpose(0, 1, 3, 2) / math.sqrt(dh)          # [B, H, T, T]
    mask = jnp.tril(jnp.ones((T, T), bool))
    s = jnp.where(mask, s, -jnp.inf)
    a = jax.nn.softmax(s, axis=-1) @ v
    return linear(p["wo"], a.transpose(0, 2, 1, 3).reshape(B, T, D))


def mlp(p, x):
    # approximate=False: exact erf GELU like PyTorch. jax.nn.gelu defaults to the tanh approximation.
    return linear(p["fc2"], jax.nn.gelu(linear(p["fc1"], x), approximate=False))


def block(p, x, cfg):
    x = x + attention(p["attn"], layer_norm(p["ln1"], x, cfg["ln_eps"]), cfg["n_heads"])
    return x + mlp(p["mlp"], layer_norm(p["ln2"], x, cfg["ln_eps"]))


def apply(params, idx, cfg):
    """idx int32 [B, T] -> logits float32 [B, T, V]. A Python loop over layers (unrolled when traced)."""
    T = idx.shape[1]
    x = params["tok_emb"][idx] + params["pos_emb"][:T]
    for p in params["blocks"]:
        x = block(p, x, cfg)
    return layer_norm(params["ln_f"], x, cfg["ln_eps"]) @ params["head"]["w"]


def stack_blocks(params):
    """Same params with the per-layer list stacked into arrays with a leading layer axis (for lax.scan)."""
    out = dict(params)
    out["blocks"] = jax.tree.map(lambda *xs: jnp.stack(xs), *params["blocks"])
    return out


def apply_scan(sparams, idx, cfg):
    """Same model as apply(), with the layers run by lax.scan over stacked params (one traced layer)."""
    T = idx.shape[1]
    x = sparams["tok_emb"][idx] + sparams["pos_emb"][:T]
    x, _ = jax.lax.scan(lambda h, p: (block(p, h, cfg), None), x, sparams["blocks"])
    return layer_norm(sparams["ln_f"], x, cfg["ln_eps"]) @ sparams["head"]["w"]


def loss_fn(params, x, y, cfg):
    logits = apply(params, x, cfg)
    return optax.softmax_cross_entropy_with_integer_labels(logits, y).mean()


# ---------------------------------------------------------------- optimizer and train step
def decay_mask(params):
    """Weight decay on 2-D weight matrices only (the 'w' leaves), matching model_torch.make_optimizer."""
    return jax.tree_util.tree_map_with_path(
        lambda path, _: getattr(path[-1], "key", None) == "w", params)


def make_optimizer(cfg, lr_at):
    return optax.chain(
        optax.clip_by_global_norm(cfg["clip"]),
        optax.adamw(learning_rate=lambda count: cfg["lr"] * jnp.minimum(1.0, (count + 1) / cfg["warmup"]),
                    b1=cfg["betas"][0], b2=cfg["betas"][1], eps=cfg["adam_eps"],
                    weight_decay=cfg["weight_decay"], mask=decay_mask))


def make_train_step(cfg, tx):
    def train_step(params, opt_state, x, y):
        loss, grads = jax.value_and_grad(loss_fn)(params, x, y, cfg)
        updates, opt_state = tx.update(grads, opt_state, params)
        params = optax.apply_updates(params, updates)
        return params, opt_state, loss, optax.global_norm(grads)
    return jax.jit(train_step, donate_argnums=(0, 1))


def to_torch_names(params):
    """params pytree -> {pytorch name: numpy array in PyTorch layout} (inverse of from_torch)."""
    import numpy as np
    out = {"tok_emb.weight": np.asarray(params["tok_emb"]), "pos_emb.weight": np.asarray(params["pos_emb"]),
           "ln_f.weight": np.asarray(params["ln_f"]["scale"]), "ln_f.bias": np.asarray(params["ln_f"]["bias"]),
           "head.weight": np.asarray(params["head"]["w"]).T}
    for i, b in enumerate(params["blocks"]):
        for ln in ("ln1", "ln2"):
            out[f"blocks.{i}.{ln}.weight"] = np.asarray(b[ln]["scale"])
            out[f"blocks.{i}.{ln}.bias"] = np.asarray(b[ln]["bias"])
        for grp, names in (("attn", ("wq", "wk", "wv", "wo")), ("mlp", ("fc1", "fc2"))):
            for n in names:
                out[f"blocks.{i}.{grp}.{n}.weight"] = np.asarray(b[grp][n]["w"]).T
                out[f"blocks.{i}.{grp}.{n}.bias"] = np.asarray(b[grp][n]["b"])
    return out
