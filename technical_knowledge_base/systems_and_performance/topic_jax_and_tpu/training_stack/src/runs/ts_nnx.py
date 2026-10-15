"""Flax NNX in depth on the running example (training_stack child page, section 2 and the State inspector tab).

E1 inventory: graphdef of TinyLM (nodes, attributes, leaves), every leaf with its Variable type and shape.
E2 filters: what nnx.split(model, <filter>, ...) puts in each group, for several filters and model variants.
E3 RNG state: a dropout variant; nnx.Rngs counters advance per call; the pure-jax.jit mistake that freezes the mask.
E4 graph mode vs tree mode: a tied (shared) embedding; split in both modes; the tree-mode error.
E5 nnx.jit semantics: state mutation inside jit is written back; what retraces.
E6 nnx.grad: which leaves get gradients; a custom Variable type; the type of the gradients.
E7 nnx.vmap + nnx.scan over layers: stacked parameters, same logits, jaxpr size and compile time (4, 8, 16 layers).
E9 nnx.Optimizer state.
Output: out/nnx.json
"""
import collections
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import optax  # noqa: E402
from flax import nnx  # noqa: E402

import model_nnx as MN  # noqa: E402

C = T.C
CFG = C.CFG
R = {"versions": T.versions(), "load_start": T.load_avg()}


def pstr(path):
    return ".".join(str(getattr(k, "key", getattr(k, "idx", k))) for k in path)


def leaves_of(state):
    out = []
    for path, v in nnx.to_flat_state(state):
        val = v.get_value() if hasattr(v, "get_value") else v
        shape = list(getattr(val, "shape", ()))
        out.append({"path": pstr(path), "type": type(v).__name__, "shape": shape,
                    "size": int(np.prod(shape)) if shape else 1, "dtype": str(getattr(val, "dtype", type(val).__name__))})
    return out


# ------------------------------------------------------------------ E1 inventory
model = MN.make_model(CFG)
g, st = nnx.split(model)
cnt = collections.Counter()
for n in g.nodes:
    t = getattr(n, "type", None)
    cnt[(type(n).__name__, getattr(t, "__name__", str(t)))] += 1
static_attrs = collections.Counter()
for k, a in g.attributes:
    static_attrs[type(a).__name__] += 1
lin_static = {}
for k, a in g.attributes:
    if type(a).__name__ == "Static" and isinstance(k, str) and not k.startswith("_"):
        v = a.value
        lin_static.setdefault(k, set()).add(v.__name__ if callable(v) and hasattr(v, "__name__") else repr(v))
g2, _ = nnx.split(MN.make_model(CFG, seed=1))
R["E1"] = {
    "n_nodes": len(g.nodes), "n_attributes": len(g.attributes), "num_leaves": g.num_leaves,
    "node_types": sorted([[a, b, c] for (a, b), c in cnt.items()], key=lambda r: -r[2]),
    "attr_kinds": dict(static_attrs),
    "static_attr_values": {k: sorted(v)[:6] for k, v in sorted(lin_static.items())},
    "graphdef_equal_other_seed": bool(g == g2), "graphdef_hash_equal_other_seed": hash(g) == hash(g2),
    "graphdef_repr_chars": len(repr(g)),
    "graphdef_repr_head": T.scrub(repr(g))[:900],
    "leaves": leaves_of(st),
    "n_params": int(sum(int(np.prod(x.shape)) for x in jax.tree.leaves(st))),
}
print("E1", R["E1"]["n_nodes"], R["E1"]["n_attributes"], R["E1"]["num_leaves"], R["E1"]["n_params"])


# ------------------------------------------------------------------ variants used by E2 / E3 / E4
class TinyLMDrop(MN.TinyLM):
    """Running example plus dropout(0.1) on the embeddings: adds RNG state to the model."""

    def __init__(self, cfg, *, rngs):
        super().__init__(cfg, rngs=rngs)
        self.drop = nnx.Dropout(0.1, rngs=rngs)

    def __call__(self, idx):
        T_ = idx.shape[1]
        x = self.drop(self.tok_emb(idx) + self.pos_emb(jnp.arange(T_)))
        for b in self.blocks:
            x = b(x)
        return self.head(self.ln_f(x))


class StepCount(nnx.Variable):
    """A custom Variable type: not a Param, so the optimiser and nnx.grad ignore it."""


class TinyLMCount(MN.TinyLM):
    def __init__(self, cfg, *, rngs):
        super().__init__(cfg, rngs=rngs)
        self.calls = StepCount(jnp.array(0, jnp.int32))

    def __call__(self, idx):
        self.calls[...] += 1
        return super().__call__(idx)


class TinyLMTied(MN.TinyLM):
    """Output head tied to the token embedding: the same Embed object referenced twice."""

    def __init__(self, cfg, *, rngs):
        super().__init__(cfg, rngs=rngs)
        del self.head
        self.out_emb = self.tok_emb          # a second reference to the same module

    def __call__(self, idx):
        T_ = idx.shape[1]
        x = self.tok_emb(idx) + self.pos_emb(jnp.arange(T_))
        for b in self.blocks:
            x = b(x)
        return self.out_emb.attend(self.ln_f(x))


x0, y0 = C.batch(0)
x0, y0 = jnp.asarray(x0), jnp.asarray(y0)

# ------------------------------------------------------------------ E2 filters
variants = {"plain": MN.make_model(CFG), "dropout": TinyLMDrop(CFG, rngs=nnx.Rngs(0)),
            "counter": TinyLMCount(CFG, rngs=nnx.Rngs(0))}
filters = {
    "nnx.Param": (nnx.Param,),
    "nnx.RngState": (nnx.RngState,),
    "nnx.PathContains('kernel')": (nnx.PathContains("kernel"),),
    "nnx.All(nnx.Param, nnx.PathContains('attn'))": (nnx.All(nnx.Param, nnx.PathContains("attn")),),
    "nnx.Not(nnx.Param)": (nnx.Not(nnx.Param),),
}
E2 = {}
for vn, m in variants.items():
    _, s_all = nnx.split(m)
    E2[vn] = {"leaves": leaves_of(s_all), "groups": {}}
    for fn, f in filters.items():
        parts = nnx.split(m, *f, ...)
        gs = [leaves_of(p) for p in parts[1:]]
        E2[vn]["groups"][fn] = {"first": [l["path"] for l in gs[0]], "rest_n": len(gs[1]),
                                "first_size": sum(l["size"] for l in gs[0])}
R["E2"] = E2
R["E2_split_error"] = T.err_text(lambda: nnx.split(variants["dropout"], nnx.Param))
print("E2 done; split error:", (R["E2_split_error"] or {}).get("msg", "")[:200])

# ------------------------------------------------------------------ E3 RNG state
md = TinyLMDrop(CFG, rngs=nnx.Rngs(0))
rng_leaves = [l for l in leaves_of(nnx.state(md, nnx.RngState))]


def drop_count(m):
    return int(m.drop.rngs.count[...]) if m.drop.rngs is not None else None


E3 = {"rng_leaves": rng_leaves}
o1 = md(x0[:2]); c1 = drop_count(md)
o2 = md(x0[:2]); c2 = drop_count(md)
E3["eager_two_calls_differ"] = bool(not np.array_equal(np.asarray(o1), np.asarray(o2)))
E3["eager_counts"] = [c1, c2]


@nnx.jit
def fwd(m, x):
    return m(x)


a = fwd(md, x0[:2]); ca = drop_count(md)
b = fwd(md, x0[:2]); cb = drop_count(md)
E3["nnx_jit_two_calls_differ"] = bool(not np.array_equal(np.asarray(a), np.asarray(b)))
E3["nnx_jit_counts"] = [ca, cb]
# the mistake: split once, call a pure jax.jit function, never write the RNG state back
gd, sd = nnx.split(md)


@jax.jit
def pure_fwd(s, x):
    m = nnx.merge(gd, s)
    return m(x)                  # RNG state advanced inside, but the new state is dropped


p1 = pure_fwd(sd, x0[:2]); p2 = pure_fwd(sd, x0[:2])
E3["pure_jit_without_return_differ"] = bool(not np.array_equal(np.asarray(p1), np.asarray(p2)))


@jax.jit
def pure_fwd_ok(s, x):
    m = nnx.merge(gd, s)
    y = m(x)
    return y, nnx.state(m)        # return the new state too


q1, sd2 = pure_fwd_ok(sd, x0[:2]); q2, sd3 = pure_fwd_ok(sd2, x0[:2])
E3["pure_jit_with_return_differ"] = bool(not np.array_equal(np.asarray(q1), np.asarray(q2)))
md.eval()
e1 = md(x0[:2]); e2 = md(x0[:2])
E3["eval_mode_equal"] = bool(np.array_equal(np.asarray(e1), np.asarray(e2)))
E3["eval_count_after"] = drop_count(md)
md.train()
mplain = MN.make_model(CFG)
nnx.update(mplain, nnx.state(md, nnx.Param))
E3["eval_equals_plain_model"] = float(np.abs(np.asarray(e1) - np.asarray(mplain(x0[:2]))).max())
R["E3"] = E3
print("E3", E3)

# ------------------------------------------------------------------ E4 graph vs tree mode
mt = TinyLMTied(CFG, rngs=nnx.Rngs(0))
E4 = {"defaults": {"graph_mode": bool(nnx.set_graph_mode.current_value()),
                   "graph_updates": bool(nnx.set_graph_updates.current_value())}}
gt, stt = nnx.split(mt)
E4["graph_mode_leaves"] = len(jax.tree.leaves(stt))
E4["graph_mode_params"] = int(sum(int(np.prod(x.shape)) for x in jax.tree.leaves(stt)))
E4["tied_is_same_object"] = mt.out_emb is mt.tok_emb
E4["tree_mode_error"] = T.err_text(lambda: nnx.split(mt, graph=False))
gp, sp = nnx.split(MN.make_model(CFG), graph=False)
E4["tree_mode_plain_ok_leaves"] = len(jax.tree.leaves(sp))
E4["tree_mode_plain_same_graphdef_type"] = type(gp).__name__
R["E4"] = E4
print("E4", {k: (v if k != "tree_mode_error" else str(v)[:300]) for k, v in E4.items()})

# ------------------------------------------------------------------ E5 nnx.jit semantics
TR = {"n": 0}
mc = TinyLMCount(CFG, rngs=nnx.Rngs(0))


@nnx.jit
def step_count(m, x):
    TR["n"] += 1                   # Python side effect: runs only when tracing
    return m(x).mean()


log = []
for i in range(3):
    step_count(mc, x0[:2])
    log.append({"call": i, "traces": TR["n"], "calls_var": int(mc.calls[...])})
mc.blocks[0].attn.h = 4            # same value: static attribute unchanged
step_count(mc, x0[:2]); log.append({"call": "set h=4 (same)", "traces": TR["n"], "calls_var": int(mc.calls[...])})
mc.extra = nnx.Param(jnp.zeros(3))  # new attribute: graphdef changes
step_count(mc, x0[:2]); log.append({"call": "added extra Param", "traces": TR["n"], "calls_var": int(mc.calls[...])})
step_count(mc, x0[:4]); log.append({"call": "batch 2 -> 4", "traces": TR["n"], "calls_var": int(mc.calls[...])})
R["E5"] = {"log": log}
print("E5", log)

# ------------------------------------------------------------------ E6 nnx.grad
mg = TinyLMCount(CFG, rngs=nnx.Rngs(0))


def loss_fn(m, x, y):
    return optax.softmax_cross_entropy_with_integer_labels(m(x), y).mean()


grads = nnx.grad(loss_fn)(mg, x0, y0)
gl = leaves_of(grads)
E6 = {"grads_type": type(grads).__name__, "n_grad_leaves": len(gl),
      "grad_types": sorted(set(l["type"] for l in gl)),
      "has_calls": any("calls" in l["path"] for l in gl), "calls_after": int(mg.calls[...])}
kb = np.asarray(grads["blocks"][0]["attn"]["wk"]["bias"][...])
E6["key_bias_grad_absmax"] = float(np.abs(kb).max())
E6["wq_kernel_grad_absmax"] = float(np.abs(np.asarray(grads["blocks"][0]["attn"]["wq"]["kernel"][...])).max())
# DiffState: gradients with respect to the attention only
g_attn = nnx.grad(loss_fn, argnums=nnx.DiffState(0, nnx.All(nnx.Param, nnx.PathContains("attn"))))(mg, x0, y0)
E6["attn_only_leaves"] = len(jax.tree.leaves(g_attn))
R["E6"] = E6
print("E6", E6)

# ------------------------------------------------------------------ E7 scan over layers


class ScanLM(nnx.Module):
    """Same model with the blocks created by nnx.vmap (parameters stacked on a leading layer axis)
    and run by nnx.scan (one traced block body, looped by XLA)."""

    def __init__(self, cfg, *, rngs):
        d = cfg["d_model"]
        self.tok_emb = nnx.Embed(cfg["vocab"], d, embedding_init=MN._init, rngs=rngs)
        self.pos_emb = nnx.Embed(cfg["ctx"], d, embedding_init=MN._init, rngs=rngs)

        @nnx.split_rngs(splits=cfg["n_layers"])
        @nnx.vmap(in_axes=(0,), out_axes=0)
        def make_blocks(r):
            return MN.Block(cfg, rngs=r)

        self.blocks = make_blocks(rngs)
        self.ln_f = nnx.LayerNorm(d, epsilon=cfg["ln_eps"], rngs=rngs)
        self.head = MN._linear(d, cfg["vocab"], rngs, bias=False)

    def __call__(self, idx):
        T_ = idx.shape[1]
        x = self.tok_emb(idx) + self.pos_emb(jnp.arange(T_))

        @nnx.scan(in_axes=(nnx.Carry, 0), out_axes=nnx.Carry)
        def body(x, blk):
            return blk(x)

        x = body(x, self.blocks)
        return self.head(self.ln_f(x))


def copy_unrolled_to_scan(mu, ms):
    """Stack the unrolled model's per-layer weights on a leading axis and load them into the scanned model."""
    fu = {p: np.asarray(v[...]) for p, v in nnx.to_flat_state(nnx.state(mu, nnx.Param))}
    fs = nnx.to_flat_state(nnx.state(ms, nnx.Param))
    for path, v in fs:
        if path[0] == "blocks":
            v[...] = jnp.asarray(np.stack([fu[("blocks", i) + tuple(path[1:])] for i in range(CFG["n_layers"])]))
        else:
            v[...] = jnp.asarray(fu[tuple(path)])
    nnx.update(ms, nnx.from_flat_state(fs))


mu = MN.make_model(CFG)
ms = ScanLM(CFG, rngs=nnx.Rngs(0))
copy_unrolled_to_scan(mu, ms)
lu, ls_ = np.asarray(mu(x0)), np.asarray(ms(x0))
E7 = {"stacked_leaves": [l for l in leaves_of(nnx.state(ms, nnx.Param)) if l["path"].startswith("blocks")][:16],
      "logits_maxdiff_scan_vs_unrolled": float(np.abs(lu - ls_).max()), "rows": []}
print("E7 logits diff", E7["logits_maxdiff_scan_vs_unrolled"])


def count_eqns(jaxpr):
    n = 0
    for e in jaxpr.eqns:
        n += 1
        for sub in jax.core.subjaxprs(e.params) if hasattr(jax.core, "subjaxprs") else []:
            n += count_eqns(sub)
    return n


def measure(kind, n_layers):
    cfg = dict(CFG, n_layers=n_layers)
    m = MN.TinyLM(cfg, rngs=nnx.Rngs(0)) if kind == "unrolled" else ScanLM(cfg, rngs=nnx.Rngs(0))
    gd_, st_ = nnx.split(m)

    def loss_p(s, x, y):
        mm = nnx.merge(gd_, s)
        return optax.softmax_cross_entropy_with_integer_labels(mm(x), y).mean()

    f = jax.jit(jax.value_and_grad(loss_p))
    jp = jax.make_jaxpr(jax.value_and_grad(loss_p))(st_, x0, y0)
    top = len(jp.jaxpr.eqns)
    with T.Timer() as t1:
        low = f.lower(st_, x0, y0)
    with T.Timer() as t2:
        comp = low.compile()
    hlo = comp.as_text()
    return {"kind": kind, "layers": n_layers, "jaxpr_top_eqns": top,
            "hlo_lines": hlo.count("\n"), "trace_lower_s": round(t1.wall, 3), "compile_s": round(t2.wall, 3),
            "compile_cpu_s": round(t2.cpu, 3)}


for nl in (4, 8, 16):
    for kind in ("unrolled", "scan"):
        r = measure(kind, nl)
        E7["rows"].append(r)
        print("E7", r)
E7["load"] = T.load_avg()
R["E7"] = E7

# ------------------------------------------------------------------ E9 nnx.Optimizer state
mo = MN.make_model(CFG)
opt = MN.make_optimizer(mo, CFG)
os_leaves = leaves_of(nnx.state(opt))
R["E9"] = {"n_leaves": len(os_leaves), "types": dict(collections.Counter(l["type"] for l in os_leaves)),
           "size": sum(l["size"] for l in os_leaves),
           "sample": [l for l in os_leaves if "blocks.0.attn.wq" in l["path"] or l["size"] == 1][:12]}
R["E9"]["no_wrt_error"] = T.err_text(lambda: nnx.Optimizer(mo, optax.adam(1e-3)))
print("E9", R["E9"]["n_leaves"], R["E9"]["types"], R["E9"]["size"])
R["load_end"] = T.load_avg()
T.save("nnx", R)
