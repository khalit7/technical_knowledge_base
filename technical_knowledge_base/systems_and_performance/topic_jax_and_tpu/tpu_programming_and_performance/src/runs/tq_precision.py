"""What TPU matmul precision does to the running example, emulated on CPU (measured here).

1. On CPU every precision setting is accepted and ignored: jnp.dot gives the same float32 result for
   precision None, 'default', 'high', 'highest', 'bfloat16' and DotAlgorithmPreset BF16_BF16_F32(_X3,_X6)
   (TF32 is refused). So precision cannot be tested on a CPU by just setting it.
2. So we emulate the TPU's bf16 passes: split each float32 operand into bf16 pieces
   (hi = bf16(x), mid = bf16(x - hi), lo = bf16(x - hi - mid)), multiply the pieces in float32
   (bf16 x bf16 products are exact in float32), and add 1, 3 or 6 of the partial products, the counts
   jax's lax.Precision docstring gives for DEFAULT, HIGH and HIGHEST on TPU. The split scheme is the
   standard one (an emulation, not XLA:TPU's code, which is not public).
   Every dot_general in the trained running example (final_jax_500 weights) is replaced by the
   emulation, via the module attribute jnp.matmul looks up at call time; reference: float64.
"""
import time
import numpy as np
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tq_common as T
import jax
jax.config.update("jax_enable_x64", True)
import jax.numpy as jnp
from jax import lax
from jax._src.lax import lax as _lax
import common as C
import model_jax as MJ

cfg = C.CFG
sd = dict(np.load(C.path("data", "final_jax_500.npz")))
p32 = MJ.from_torch({k: v.astype(np.float32) for k, v in sd.items()}, cfg)
p64 = jax.tree.map(lambda a: jnp.asarray(a, jnp.float64), p32)
xs, ys = [], []
for s in range(4):
    x, y = C.batch(s, "val", n_steps=4)
    xs.append(x); ys.append(y)
x = np.concatenate(xs); y = np.concatenate(ys)            # 128 validation sequences x 128 chars

# 1. presets on CPU
a = jax.random.normal(jax.random.key(0), (256, 128), jnp.float32)
b = jax.random.normal(jax.random.key(1), (128, 512), jnp.float32)
ref = np.asarray(a, np.float64) @ np.asarray(b, np.float64)
cpu = {}
for name in ["None", "default", "high", "highest", "bfloat16", "BF16_BF16_F32", "BF16_BF16_F32_X3", "BF16_BF16_F32_X6", "TF32_TF32_F32"]:
    try:
        pr = None if name == "None" else (getattr(lax.DotAlgorithmPreset, name) if name.isupper() else name)
        out = np.asarray(jnp.dot(a, b, precision=pr), np.float64)
        cpu[name] = {"max_err": float(np.abs(out - ref).max())}
    except Exception as e:
        cpu[name] = {"error": T.scrub(f"{type(e).__name__}: {str(e).splitlines()[0]}")}
print(cpu)

ORIG = _lax.dot_general
bf = lambda t: t.astype(jnp.bfloat16).astype(jnp.float32)


def split3(t):
    hi = bf(t); r = t - hi; mid = bf(r); lo = bf(r - mid)
    return hi, mid, lo


TERMS = {1: [(0, 0)], 3: [(0, 1), (1, 0), (0, 0)], 6: [(0, 2), (1, 1), (2, 0), (0, 1), (1, 0), (0, 0)]}
STATE = {"passes": None, "calls": 0}


def emulated(lhs, rhs, dimension_numbers, precision=None, preferred_element_type=None, **kw):
    n = STATE["passes"]
    if n is None:
        return ORIG(lhs, rhs, dimension_numbers, precision=precision, preferred_element_type=preferred_element_type, **kw)
    STATE["calls"] += 1
    A = split3(lhs.astype(jnp.float32)); B = split3(rhs.astype(jnp.float32))
    out = None
    for i, j in TERMS[n]:                       # smallest terms first, as a careful implementation would
        t = ORIG(A[i], B[j], dimension_numbers, preferred_element_type=jnp.float32)
        out = t if out is None else out + t
    return out


def run(params, passes):
    STATE["passes"] = passes; STATE["calls"] = 0
    _lax.dot_general = emulated
    try:
        with jax.disable_jit():                 # jnp.matmul is jitted: without this its cache would skip the patch
            logits = MJ.apply(params, jnp.asarray(x), cfg)
    finally:
        _lax.dot_general = ORIG
    return np.asarray(logits, np.float64), STATE["calls"]


def loss(lg):
    lg = lg - lg.max(-1, keepdims=True)
    lp = lg - np.log(np.exp(lg).sum(-1, keepdims=True))
    return float(-np.take_along_axis(lp, y[..., None], -1).mean())


t0 = time.time()
l64, _ = run(p64, None)
rows = []
for name, passes in [("float32 (CPU, exact products)", None), ("DEFAULT: 1 bf16 pass", 1), ("HIGH: 3 bf16 passes", 3), ("HIGHEST: 6 bf16 passes", 6)]:
    lg, calls = run(p32, passes)
    d = np.abs(lg - l64)
    rel = float(np.linalg.norm(lg - l64) / np.linalg.norm(l64))
    rows.append({"name": name, "passes": passes, "dot_calls": calls, "max_abs_logit_err": float(d.max()),
                 "mean_abs_logit_err": float(d.mean()), "rel_err": rel, "loss": loss(lg),
                 "argmax_agree": float((lg.argmax(-1) == l64.argmax(-1)).mean())})
    print(rows[-1])
res = {"cpu_presets": cpu, "cpu_preset_matrix": [256, 128, 512], "reference": "float64 forward of the same weights",
       "loss_f64": loss(l64), "rows": rows, "tokens": int(x.size),
       "weights": "final_jax_500.npz (the root's 500-step JAX run)", "batch": "4 validation batches, 128 x 128 characters",
       "jax_version": jax.__version__, "doc_line": T.src_line("jax", "jax/_src/lax/lax.py", r"bfloat16_3x'\] = Precision.HIGH"),
       "seconds": round(time.time() - t0, 1)}
T.save("precision.json", res)
