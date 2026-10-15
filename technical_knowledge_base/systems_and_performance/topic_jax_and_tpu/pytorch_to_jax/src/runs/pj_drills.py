"""'Port this snippet' drills: each PyTorch snippet and each candidate JAX port is real code, executed here exactly as
the page shows it; the page shows each candidate's real output or error. Writes out/drills.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B pj_drills.py
"""
import os
import sys
import textwrap

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pjcommon as P  # noqa: E402

os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np  # noqa: E402
import torch  # noqa: E402

torch.set_num_threads(4)
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import optax  # noqa: E402
from flax import nnx  # noqa: E402

import common as C  # noqa: E402

sd0 = dict(np.load(C.path("data", "init_torch.npz")))
x0, y0 = C.batch(0)
h0 = (sd0["tok_emb.weight"][x0] + sd0["pos_emb.weight"][: x0.shape[1]])[:2, :8]     # real block-0 input, [2, 8, 128]
SETUP = dict(np=np, torch=torch, F=torch.nn.functional, nn=torch.nn, jax=jax, jnp=jnp, optax=optax, nnx=nnx)


def show(v):
    if isinstance(v, (torch.Tensor, jax.Array, np.ndarray)):
        a = np.asarray(v.detach() if isinstance(v, torch.Tensor) else v)
        if a.ndim == 0:
            return "%s %.6g" % (a.dtype, float(a)) if a.dtype.kind == "f" else "%s %s" % (a.dtype, a)
        flat = a.reshape(-1)[:4]
        fmt = ", ".join(("%.5g" % t) if a.dtype.kind == "f" else str(t) for t in flat)
        return "%s%s [%s%s]" % (a.dtype, list(a.shape), fmt, ", ..." if a.size > 4 else "")
    if isinstance(v, tuple):
        return "(" + ", ".join(show(t) for t in v) + ")"
    return P.scrub(repr(v))[:200]


def run(code, env):
    ns = dict(SETUP); ns.update(env)
    try:
        exec(textwrap.dedent(code), ns)
        return dict(ok=True, out=show(ns.get("out")), value=ns.get("out"))
    except Exception as e:  # noqa: BLE001
        return dict(ok=False, out=P.scrub(type(e).__name__ + ": " + str(e).strip().splitlines()[0])[:400], value=None)


def num(v):
    if v is None:
        return None
    if isinstance(v, tuple):
        return [num(t) for t in v]
    if isinstance(v, torch.Tensor):
        v = v.detach()
    return np.asarray(v, dtype=np.float64)


def compare(ref, got):
    """max |difference| against the PyTorch output, or None if not comparable"""
    try:
        r, g = num(ref), num(got)
    except (ValueError, TypeError):
        return None
    if r is None or g is None:
        return None
    try:
        if isinstance(r, list) or isinstance(g, list):
            if not (isinstance(r, list) and isinstance(g, list) and len(r) == len(g)):
                return None
            return max(float(np.nanmax(np.abs(a - b))) if a.shape == b.shape else float("inf") for a, b in zip(r, g))
        if r.shape != g.shape:
            return None
        d = np.abs(r - g)
        return float("nan") if np.isnan(d).any() else float(d.max())
    except Exception:  # noqa: BLE001
        return None


ENV = dict(h=h0, logits_np=np.random.default_rng(0).standard_normal((4, 65)).astype(np.float32),
           labels_np=np.array([3, 7, -100, 11]), w_np=sd0["blocks.0.attn.wq.weight"], wfc_np=sd0["blocks.0.mlp.fc1.weight"],
           g_np=np.linspace(-4, 4, 9, dtype=np.float32), x2_np=np.array([[0.1, 2.0, -1.0, 0.5, 0.3], [1.5, -0.2, 0.9, 3.0, 0.0]], np.float32))

DRILLS = [
    dict(id="var", title="Variance over the last axis",
         torch="out = torch.from_numpy(h).var(dim=-1)",
         cands=[("a", "out = jnp.var(h, axis=-1)", False, "jnp.var uses ddof=0 (population variance); torch.var defaults to the unbiased estimator (correction=1)"),
                ("b", "out = jnp.asarray(h).var(axis=-1)", False, "the array method has the same default as jnp.var"),
                ("c", "out = jnp.var(h, axis=-1, ddof=1)", True, "ddof=1 matches torch's unbiased default")]),
    dict(id="gelu", title="GELU",
         torch="out = F.gelu(torch.from_numpy(g_np))",
         cands=[("a", "out = jax.nn.gelu(g_np)", False, "tanh approximation by default (approximate=True)"),
                ("b", "out = nnx.gelu(g_np)", False, "nnx.gelu is jax.nn.gelu: same tanh default"),
                ("c", "out = jax.nn.gelu(g_np, approximate=False)", True, "exact erf GELU, as torch's default")]),
    dict(id="ln", title="LayerNorm(128) on the real block-0 input",
         torch="out = nn.LayerNorm(128)(torch.from_numpy(h))",
         cands=[("a", "out = nnx.LayerNorm(128, rngs=nnx.Rngs(0))(h)", False, "epsilon 1e-6: at init the input variance is about 8e-4, so the epsilon is visible"),
                ("b", "out = nnx.LayerNorm(128, epsilon=1e-5, rngs=nnx.Rngs(0))(h)", True, "right epsilon; Flax still computes the variance as E[x^2] - E[x]^2, harmless here"),
                ("c", "out = nnx.LayerNorm(128, epsilon=1e-5, use_fast_variance=False, rngs=nnx.Rngs(0))(h)", True, "right epsilon and the two-pass variance PyTorch uses")]),
    dict(id="inplace", title="Zero the first position in place",
         torch="t = torch.from_numpy(h.copy()); t[:, 0] = 0.0; out = t",
         cands=[("a", "x = jnp.asarray(h); x[:, 0] = 0.0; out = x", False, "JAX arrays are immutable"),
                ("b", "x = jnp.asarray(h); out = x.at[:, 0].set(0.0)", True, "functional update: returns a new array (in place under jit when the old one is dead)")]),
    dict(id="ce", title="Cross-entropy with padding labels (-100)",
         torch="out = F.cross_entropy(torch.from_numpy(logits_np), torch.from_numpy(labels_np))",
         cands=[("a", "out = optax.softmax_cross_entropy_with_integer_labels(logits_np, labels_np).mean()", False, "no ignore_index: the -100 row gathers out of range and the mean becomes NaN"),
                ("b", "m = labels_np != -100\nl = optax.softmax_cross_entropy_with_integer_labels(logits_np, jnp.where(m, labels_np, 0))\nout = (l * m).sum() / m.sum()",
                 True, "mask the ignored rows and average over the rest, as torch does")]),
    dict(id="maxdim", title="Max over the last axis, with indices",
         torch="v, i = torch.max(torch.from_numpy(x2_np), dim=-1); out = (v, i)",
         cands=[("a", "v, i = jnp.max(x2_np, axis=-1); out = (v, i)", False, "jnp.max returns only values; with a batch of 2 the unpacking silently splits the batch"),
                ("b", "out = (jnp.max(x2_np, axis=-1), jnp.argmax(x2_np, axis=-1))", True, "values and indices are two calls")]),
    dict(id="transpose", title="Split heads: view then transpose(1, 2)",
         torch="t = torch.from_numpy(h).view(2, 8, 4, 32).transpose(1, 2); out = t",
         cands=[("a", "out = jnp.asarray(h).reshape(2, 8, 4, 32).transpose(1, 2)", False, "jnp's transpose takes a full permutation of the axes, not two axes to swap"),
                ("b", "out = jnp.swapaxes(jnp.asarray(h).reshape(2, 8, 4, 32), 1, 2)", True, "swapaxes is torch.transpose"),
                ("c", "out = jnp.asarray(h).reshape(2, 8, 4, 32).transpose(0, 2, 1, 3)", True, "or the whole permutation")]),
    dict(id="rng", title="Two random draws", cmp=False,
         torch="torch.manual_seed(0); a = torch.randn(3); b = torch.randn(3); out = (a, b)",
         cands=[("a", "key = jax.random.key(0)\na = jax.random.normal(key, (3,)); b = jax.random.normal(key, (3,))\nout = (a, b)", False, "the same key gives the same numbers: a == b"),
                ("b", "k1, k2 = jax.random.split(jax.random.key(0))\nout = (jax.random.normal(k1, (3,)), jax.random.normal(k2, (3,)))", True, "split the key: two independent draws (different numbers from torch's, by design)")]),
    dict(id="mask", title="Causal mask from nn.MultiheadAttention code",
         torch="T = 4; q = torch.randn(1, 1, T, 8, generator=torch.Generator().manual_seed(0))\nmask_mha = torch.triu(torch.ones(T, T, dtype=torch.bool), 1)  # True = blocked (MHA convention)\nout = F.scaled_dot_product_attention(q, q, q, attn_mask=~mask_mha)",
         cands=[("a", "T = 4; q = torch.randn(1, 1, T, 8, generator=torch.Generator().manual_seed(0)).numpy().transpose(0, 2, 1, 3)\nmask_mha = np.triu(np.ones((T, T), bool), 1)\nout = jax.nn.dot_product_attention(q, q, q, mask=mask_mha[None, None]).transpose(0, 2, 1, 3)",
                 False, "passes the 'blocked' mask where JAX expects 'allowed': each position attends only to the future, and the last row to nothing"),
                ("b", "T = 4; q = torch.randn(1, 1, T, 8, generator=torch.Generator().manual_seed(0)).numpy().transpose(0, 2, 1, 3)\nout = jax.nn.dot_product_attention(q, q, q, is_causal=True).transpose(0, 2, 1, 3)",
                 True, "is_causal, or mask=~mask_mha; note jax.nn.dot_product_attention takes [B, T, H, D]")]),
    dict(id="weights", title="Copy an nn.Linear(128, 512) weight into nnx.Linear", cmp=False,
         torch="out = torch.from_numpy(wfc_np).shape  # [out, in]",
         cands=[("a", "m = nnx.Linear(128, 512, rngs=nnx.Rngs(0))\nm.kernel[...] = wfc_np\nout = m.kernel[...].shape", False, "PyTorch stores [out, in], Flax [in, out]"),
                ("b", "m = nnx.Linear(128, 128, rngs=nnx.Rngs(0))\nm.kernel[...] = w_np\nout = m.kernel[...].shape", False, "a square matrix loads without error, transposed: the worst case"),
                ("c", "m = nnx.Linear(128, 512, rngs=nnx.Rngs(0))\nm.kernel[...] = wfc_np.T\nout = m.kernel[...].shape", True, "transpose on the way in")]),
    dict(id="clip", title="Clip the gradients, then AdamW (three steps; gradient norms 50, 0.5, 0.5)",
         torch="p = torch.zeros(2, requires_grad=True); opt = torch.optim.AdamW([p], lr=1e-3)\nfor g in ([30.0, 40.0], [0.3, 0.4], [0.3, 0.4]):\n    p.grad = torch.tensor(g)\n    nn.utils.clip_grad_norm_([p], 1.0); opt.step()\nout = p",
         cands=[("a", "tx = optax.chain(optax.adamw(1e-3), optax.clip_by_global_norm(1.0))\np = jnp.zeros(2); s = tx.init(p)\nfor g in ([30.0, 40.0], [0.3, 0.4], [0.3, 0.4]):\n    u, s = tx.update(jnp.array(g), s, p); p = optax.apply_updates(p, u)\nout = p",
                 False, "clips Adam's updates instead of the gradients: Adam's second moment remembers the norm-50 gradient and shrinks the next steps"),
                ("b", "tx = optax.chain(optax.clip_by_global_norm(1.0), optax.adamw(1e-3, weight_decay=0.01))\np = jnp.zeros(2); s = tx.init(p)\nfor g in ([30.0, 40.0], [0.3, 0.4], [0.3, 0.4]):\n    u, s = tx.update(jnp.array(g), s, p); p = optax.apply_updates(p, u)\nout = p",
                 True, "clip first, and torch's weight_decay default (0.01; optax's is 1e-4)")]),
]

R = {"drills": []}
for d in DRILLS:
    ref = run(d["torch"], ENV)
    rec = dict(id=d["id"], title=d["title"], torch=d["torch"], torch_out=ref["out"], cands=[])
    for cid, code, right, why in d["cands"]:
        r = run(code, ENV)
        rec["cands"].append(dict(id=cid, code=code, right=right, why=why, ok=r["ok"], out=r["out"],
                                 maxdiff_vs_torch=compare(ref["value"], r["value"]) if (r["ok"] and d.get("cmp", True)) else None))
    R["drills"].append(rec)
    print(d["id"], ref["out"][:80], [(c["id"], c["ok"], c["out"][:70], c["maxdiff_vs_torch"]) for c in rec["cands"]], flush=True)
R["versions"] = dict(P.versions(), torch=torch.__version__, flax=__import__("flax").__version__, optax=optax.__version__)
P.save("drills", R)
