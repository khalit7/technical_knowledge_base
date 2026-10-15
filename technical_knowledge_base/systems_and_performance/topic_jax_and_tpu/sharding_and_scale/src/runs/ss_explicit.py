"""Explicit sharding mode on the whole running example: the same loss and gradient, traced on an Explicit mesh
under three layouts, first exactly as written for Auto mode, then with the smallest fix JAX asks for. Records the
error each naive version raises, the types (jax.typeof) of a few intermediates, the collectives in the compiled
program and the loss against one device.

    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B ss_explicit.py
Writes ../out/explicit.json.
"""
import math
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ss_common as SC  # noqa: E402
import ss_hlo as SH  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import optax  # noqa: E402
from jax.sharding import AxisType, NamedSharding, PartitionSpec as P  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

CFG = C.CFG
TYPES = []          # (label, str(jax.typeof(x))) recorded while tracing


def note(label, x):
    TYPES.append((label, str(jax.typeof(x))))
    return x


def forward(params, idx, fix):
    """model_jax.apply written out, with the hooks a layout needs. fix=None reproduces model_jax.apply exactly."""
    cfg = CFG
    gather_w = fix == "fsdp"                      # FSDP in Explicit mode: gather each weight right before use
    row_out = P("data", None, None) if fix == "tp" else None   # TP: say where a row-parallel matmul's sum goes

    def w_(w):
        return jax.reshard(w, P(*([None] * w.ndim))) if gather_w else w

    def lin(p, x, row=False):
        if row and row_out is not None:
            return jnp.einsum("btd,df->btf", x, w_(p["w"]), out_sharding=row_out) + w_(p["b"])
        return x @ w_(p["w"]) + w_(p["b"])

    def ln(p, x):
        mu = x.mean(-1, keepdims=True)
        var = ((x - mu) ** 2).mean(-1, keepdims=True)
        return (x - mu) / jnp.sqrt(var + cfg["ln_eps"]) * w_(p["scale"]) + w_(p["bias"])

    B, T = idx.shape
    if fix is None:
        emb = w_(params["tok_emb"])[idx]                       # as model_jax.apply
    else:                                                       # Explicit mode: say where the gathered rows go
        emb = w_(params["tok_emb"]).at[idx].get(out_sharding=P("data", None, None))
    x = note("embedding output h", emb + w_(params["pos_emb"])[:T])
    for li, p in enumerate(params["blocks"]):
        a_in = ln(p["ln1"], x)
        H, dh = cfg["n_heads"], cfg["d_model"] // cfg["n_heads"]
        q = lin(p["attn"]["wq"], a_in)
        if li == 0:
            note("q = h @ wq", q)
        split = lambda t: t.reshape(B, T, H, dh).transpose(0, 2, 1, 3)
        q, k, v = split(q), split(lin(p["attn"]["wk"], a_in)), split(lin(p["attn"]["wv"], a_in))
        if li == 0:
            note("q split into heads [B, H, T, dh]", q)
        s = q @ k.transpose(0, 1, 3, 2) / math.sqrt(dh)
        if li == 0:
            note("scores [B, H, T, T]", s)
        s = jnp.where(jnp.tril(jnp.ones((T, T), bool)), s, -jnp.inf)
        o = (jax.nn.softmax(s, axis=-1) @ v).transpose(0, 2, 1, 3).reshape(B, T, H * dh)
        x = x + lin(p["attn"]["wo"], o, row=True)
        hdn = jax.nn.gelu(lin(p["mlp"]["fc1"], ln(p["ln2"], x)), approximate=False)
        if li == 0:
            note("MLP hidden [B, T, 512]", hdn)
        x = x + lin(p["mlp"]["fc2"], hdn, row=True)
        if li == 0:
            note("block output", x)
    logits = ln(params["ln_f"], x) @ w_(params["head"]["w"])
    note("logits", logits)
    return logits


def loss_fn(params, idx, y, fix):
    return optax.softmax_cross_entropy_with_integer_labels(forward(params, idx, fix), y).mean()


def param_spec(layout, names, shape):
    if layout == "dp":
        return P()
    if layout == "fsdp":
        for i, d in enumerate(shape):
            if d % 8 == 0:
                s = [None] * len(shape)
                s[i] = "data"
                return P(*s)
        return P()
    if layout == "tp":
        if len(names) < 2:
            return P()
        if names[-2] in ("wq", "wk", "wv", "fc1"):
            return P(None, "model") if names[-1] == "w" else P("model")
        if names[-2] in ("wo", "fc2"):
            return P("model", None) if names[-1] == "w" else P()
        return P()


LAYOUTS = [("dp", (8,), ("data",)), ("fsdp", (8,), ("data",)), ("tp", (2, 4), ("data", "model"))]


def scrub_err(e):
    msg = "".join(traceback.format_exception_only(type(e), e)).strip()
    msg = SC.H.scrub(msg)
    lines = [ln for ln in msg.splitlines() if ln.strip() and not ln.startswith("-----") and not ln.startswith("For simplicity")]
    return "\n".join(lines[:6])[:900]


def attempt(layout, mshape, names, fix):
    mesh = jax.make_mesh(mshape, names, axis_types=(AxisType.Explicit,) * len(names))
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    params = MJ.from_torch(sd, CFG)
    psh = jax.tree_util.tree_map_with_path(
        lambda pa, a: NamedSharding(mesh, param_spec(layout, [k for k in (getattr(q, "key", None) for q in pa) if isinstance(k, str)], a.shape)), params)
    x0, y0 = C.batch(0)
    xs = NamedSharding(mesh, P("data", None))
    TYPES.clear()
    rec = {"layout": layout, "fix": fix}
    with jax.set_mesh(mesh):
        p = jax.device_put(params, psh)
        x, y = jax.device_put(x0, xs), jax.device_put(y0, xs)
        try:
            f = jax.jit(jax.value_and_grad(lambda p, x, y: loss_fn(p, x, y, fix)))
            comp = f.lower(p, x, y).compile()
            (loss, g) = f(p, x, y)
            rec["ok"] = True
            rec["loss"] = float(loss)
            rec["grad_types"] = {k: str(jax.typeof(v)) for k, v in
                                 {"blocks.0.mlp.fc1.w": g["blocks"][0]["mlp"]["fc1"]["w"],
                                  "blocks.0.mlp.fc2.w": g["blocks"][0]["mlp"]["fc2"]["w"]}.items()}
            cnt = {}
            for ins in SH.instructions(comp.as_text()):
                k = ins["op"].replace("-start", "")
                if k in SC.H.COLL:
                    b, _ = SC.H.shape_bytes(ins["type"])
                    c = cnt.setdefault(k, [0, 0])
                    c[0] += 1
                    c[1] += b
            rec["collectives"] = {k: {"count": v[0], "bytes": v[1]} for k, v in cnt.items()}
        except Exception as e:  # noqa: BLE001
            rec["ok"] = False
            rec["error"] = scrub_err(e)
    rec["types"] = list(dict(TYPES).items())
    return rec


def main():
    print("load", os.getloadavg(), flush=True)
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    params = MJ.from_torch(sd, CFG)
    x0, y0 = C.batch(0)
    ref = float(jax.jit(lambda p, x, y: loss_fn(p, x, y, None))(params, x0, y0))
    recs = []
    for layout, mshape, names in LAYOUTS:
        for fix in ([None, layout] if layout == "dp" else [None, "emb", layout]):
            r = attempt(layout, mshape, names, fix)
            if r.get("ok"):
                r["abs_loss_diff_vs_one_device"] = abs(r["loss"] - ref)
            print(layout, fix, r.get("ok"), r.get("error", "")[:200], r.get("collectives"), flush=True)
            recs.append(r)
    SC.dump("explicit.json", {"what": "Running example loss and gradient (batch 0) on an Explicit mesh of 8 simulated CPU devices, jax "
                                      + jax.__version__ + "; naive = the Auto-mode code unchanged; fix = the smallest change JAX asks for.",
                              "one_device_loss": ref, "runs": recs})


if __name__ == "__main__":
    main()
