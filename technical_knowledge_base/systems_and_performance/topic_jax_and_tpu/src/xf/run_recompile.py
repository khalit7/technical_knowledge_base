"""Will this recompile? Each drill warms a fresh jitted function of the running example with one call,
then makes the probe call(s) and counts what really happened: Python traces (a counter inside the
function), XLA compiles (JAX's monitoring event /jax/core/compile/backend_compile_duration) and the
cache-miss explanation JAX logs with jax_explain_cache_misses. Inputs are built before counting starts
(jnp.ones itself compiles). Output: out/recompile.json"""
import io
import logging
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xfcommon as X  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

cfg = C.CFG
sd = dict(np.load(C.path("data", "init_torch.npz")))
P = MJ.from_torch(sd, cfg)
x32, y32 = (jnp.asarray(a) for a in C.batch(0))
x32b, y32b = (jnp.asarray(a) for a in C.batch(1))
x16, y16 = x32[:16], y32[:16]
x64, y64 = x32[:, :64], y32[:, :64]
xnp, ynp = C.batch(0)                       # numpy int32
xnp64, ynp64 = xnp.astype(np.int64), ynp.astype(np.int64)
P16 = jax.tree.map(lambda a: a.astype(jnp.bfloat16), P)
Pextra = dict(P, extra=jnp.zeros(()))
f32two = jnp.float32(2.0)
SL = [(x32[:, :T], y32[:, :T]) for T in (64, 96, 112, 128)]   # sliced before counting: eager slicing compiles too
jax.block_until_ready((x16, x64, P16, f32two))

COMPILES = [0]
jax.monitoring.register_event_duration_secs_listener(
    lambda name, dur, **kw: COMPILES.__setitem__(0, COMPILES[0] + (name == "/jax/core/compile/backend_compile_duration")))
buf = io.StringIO()
h = logging.StreamHandler(buf)
h.setLevel(logging.WARNING)
logging.getLogger("jax").addHandler(h)
jax.config.update("jax_explain_cache_misses", True)


def clean(msg):
    msg = X.scrub(msg)
    msg = re.sub(r"at \S*run_recompile\.py:\d+(?::\d+)? \([^)]*\):", "at the call site:", msg)
    msg = re.sub(r"<root>/src/xf/run_recompile\.py:\d+(?::\d+)?", "run_recompile.py", msg)
    msg = re.sub(r" id=\d+", "", msg)
    return msg.strip()


def make_loss():
    """A fresh function object per drill: jit's trace cache is keyed on the underlying Python function,
    so two jax.jit(loss) wrappers of the same function would share entries and blur the counts."""
    def loss(params, x, y, scale=1.0):
        TR[0] += 1
        logits = MJ.apply(params, x, cfg) * scale
        return jnp.mean(jax.nn.logsumexp(logits, -1) - jnp.take_along_axis(logits, y[..., None], -1)[..., 0])
    return loss


TR = [0]
drills = []


def drill(id_, title, code, warm, probe, answer, why, opts=None):
    """warm(): calls that set up the cache (not counted). probe(): the calls counted."""
    warm()
    TR[0] = 0
    COMPILES[0] = 0
    buf.seek(0); buf.truncate()
    t0 = time.perf_counter()
    val = probe()
    dt = time.perf_counter() - t0
    log = clean(buf.getvalue())
    d = {"id": id_, "title": title, "code": code, "traces": TR[0], "compiles": COMPILES[0],
         "explain": log, "answer": answer, "why": why, "probe_s": round(dt, 3)}
    if opts:
        d["opts"] = opts
    if val is not None:
        d["value"] = val
    drills.append(d)
    print(id_, "traces", TR[0], "compiles", COMPILES[0], "| expected", answer)


# 1 same shapes, new values
f = jax.jit(make_loss())
drill("values", "Same shapes, different data",
      "f = jax.jit(loss)\nf(params, x, y)          # batch 0, int32[32,128]\nf(params, x_next, y_next) # batch 1, same shapes",
      lambda: f(P, x32, y32).block_until_ready(), lambda: f(P, x32b, y32b).block_until_ready() and None, 0,
      "The cache key is shapes, dtypes, the pytree structure and static values, never the numbers. New data with the same signature reuses the executable.")

f = jax.jit(make_loss())
drill("batch16", "A smaller last batch",
      "f(params, x, y)            # int32[32,128]\nf(params, x[:16], y[:16])  # int32[16,128]: the ragged last batch",
      lambda: f(P, x32, y32).block_until_ready(), lambda: f(P, x16, y16).block_until_ready() and None, 1,
      "A new shape is a new program: XLA compiles for exact shapes. The usual fix is to drop the last batch or pad it to the full size and mask the padding out of the loss.")

f = jax.jit(make_loss())
drill("back", "Back to a shape seen before",
      "f(params, x, y)            # [32,128]: compile 1\nf(params, x[:16], y[:16])  # [16,128]: compile 2\nf(params, x, y)            # [32,128] again",
      lambda: (f(P, x32, y32).block_until_ready(), f(P, x16, y16).block_until_ready()),
      lambda: f(P, x32, y32).block_until_ready() and None, 0,
      "Every signature stays in the cache for the life of the jitted function, so alternating between two shapes compiles twice in total, not on every switch.")

f = jax.jit(make_loss())
drill("seqlen", "Variable sequence length",
      "f(params, x, y)                  # [32,128]\nfor T in (64, 96, 112, 128):     # real text arrives in many lengths\n    f(params, x[:, :T], y[:, :T])",
      lambda: f(P, x32, y32).block_until_ready(),
      lambda: [f(P, xs, ys).block_until_ready() for xs, ys in SL] and None, 3,
      "Three new lengths, three compiles (128 was cached). With free-form lengths this becomes a recompilation storm; production code pads to a few bucket sizes (for example powers of two) so the number of programs is bounded.")

f = jax.jit(make_loss())
drill("bf16", "Parameters cast to bfloat16",
      "f(params, x, y)\nparams16 = jax.tree.map(lambda a: a.astype(jnp.bfloat16), params)\nf(params16, x, y)",
      lambda: f(P, x32, y32).block_until_ready(), lambda: f(P16, x32, y32).block_until_ready() and None, 1,
      "Dtype is part of the abstract value (bfloat16[128,128] is not float32[128,128]), so a precision change is a new program.")

f = jax.jit(make_loss())
drill("numpy", "A NumPy array instead of a JAX array",
      "f(params, x, y)                  # jax.Array int32[32,128]\nf(params, np.asarray(x), np.asarray(y))  # numpy int32[32,128]",
      lambda: f(P, x32, y32).block_until_ready(), lambda: f(P, xnp, ynp).block_until_ready() and None, 0,
      "The abstract value is the same (int32[32,128]); jit copies the NumPy array to the device and reuses the executable.")

f = jax.jit(make_loss())
drill("int64", "NumPy int64 input",
      "f(params, x, y)                  # int32\nf(params, x.astype(np.int64), y.astype(np.int64))",
      lambda: f(P, x32, y32).block_until_ready(), lambda: f(P, xnp64, ynp64).block_until_ready() and None, 0,
      "With 64-bit mode off (the default, jax_enable_x64=False) JAX canonicalises int64 to int32 before building the key, so this hits the cache. Turn x64 on and it would be a new program.")

f = jax.jit(make_loss())
drill("pyfloat", "A Python float that changes",
      "f(params, x, y, 1.0)\nf(params, x, y, 0.5)   # scale is an ordinary (traced) argument",
      lambda: f(P, x32, y32, 1.0).block_until_ready(), lambda: f(P, x32, y32, 0.5).block_until_ready() and None, 0,
      "A Python scalar passed as a normal argument becomes a traced weakly typed float32[] (shown as ~float32[]); its value is data, not part of the key.")

fs = jax.jit(make_loss(), static_argnames="scale")
drill("static", "The same float, marked static",
      "fs = jax.jit(loss, static_argnames='scale')\nfs(params, x, y, scale=1.0)\nfor s in (0.5, 0.25, 1.0):\n    fs(params, x, y, scale=s)",
      lambda: fs(P, x32, y32, scale=1.0).block_until_ready(),
      lambda: [fs(P, x32, y32, scale=s).block_until_ready() for s in (0.5, 0.25, 1.0)] and None, 2,
      "A static argument's Python value is baked into the program, so each new value compiles (0.5 and 0.25), and a value seen before (1.0) is a hit. Make an argument static only when it changes the program's structure (a flag, a layer count, a shape), never for a value that varies each step such as a learning rate.")

f = jax.jit(make_loss())
drill("weak", "A Python 2.0 against jnp.float32(2.0)",
      "f(params, x, y, 2.0)              # Python float: weakly typed ~float32[]\nf(params, x, y, jnp.float32(2.0))  # a strongly typed float32[] array",
      lambda: f(P, x32, y32, 2.0).block_until_ready(), lambda: f(P, x32, y32, f32two).block_until_ready() and None, 1,
      "Same value, same shape, same dtype, but weak typing is part of the abstract value: a Python scalar is ~float32[] (it defers to the other operand's dtype in arithmetic), a jnp scalar is float32[]. The cache-miss log says exactly that.")

f = jax.jit(make_loss())
drill("pytree", "One more entry in the parameter dict",
      "f(params, x, y)\nf({**params, 'extra': jnp.zeros(())}, x, y)   # unused by the model",
      lambda: f(P, x32, y32).block_until_ready(), lambda: f(Pextra, x32, y32).block_until_ready() and None, 1,
      "The pytree structure (the tree definition: keys, nesting, number of leaves) is part of the key, even if the new leaf is never used.")

LOSS = make_loss()


def lam_loop():
    for _ in range(3):
        g = jax.jit(lambda p, x, y: LOSS(p, x, y))
        g(P, x32, y32).block_until_ready()


drill("lambda", "jax.jit called inside the loop",
      "for step in range(3):\n    g = jax.jit(lambda p, x, y: loss(p, x, y))   # a new function object each time\n    g(params, x, y)",
      lambda: None, lambda: lam_loop() or None, 3,
      "The trace cache is keyed on the Python function object; a new lambda each iteration is a function never seen before, so every step traces, lowers and compiles again (measured: 3 traces and 3 XLA compiles for 3 steps), even though the program is identical each time. JAX's own log even guesses the cause: \"maybe the function is being re-defined repeatedly\". Jit once, outside the loop.")

LOSS2 = make_loss()


def inline_loop():
    for _ in range(3):
        jax.jit(LOSS2)(P, x32, y32).block_until_ready()


drill("inline", "jax.jit(loss) re-wrapped every step, same function",
      "for step in range(3):\n    jax.jit(loss)(params, x, y)   # a new jit wrapper, the same loss function",
      lambda: None, lambda: inline_loop() or None, 1,
      "One trace and one compile for three steps (measured). The trace cache is keyed on the underlying Python function, not on the jit wrapper, so re-wrapping the same function hits the cache; it is the new lambda per step (the drill above) that defeats it. Still, jit once outside the loop: it is clearer and skips the wrapper overhead.")


SCALE = [1.0]


def apply_mean_global(p, x):
    TR[0] += 1
    return MJ.apply(p, x, cfg).mean() * SCALE[0]   # reads a global (here a list cell) while tracing


fg = jax.jit(apply_mean_global)
v1 = []


def g_probe():
    SCALE[0] = 100.0
    return round(float(fg(P, x32)), 6)


drill("global", "A global changed between calls",
      "SCALE = 1.0\nfg = jax.jit(lambda p, x: apply(p, x).mean() * SCALE)\nfg(params, x)    # traced with SCALE = 1.0\nSCALE = 100.0\nfg(params, x)    # what does it return?",
      lambda: v1.append(round(float(fg(P, x32)), 6)), g_probe, 0,
      "No recompile, and a stale answer: the global was read once, while tracing, and baked into the program as a constant. The second call returns exactly the first value, not 100 times it. Pass anything that changes as an argument.")
drills[-1]["value"] = {"first": v1[0], "second": drills[-1]["value"]}

X.save("recompile", {"versions": X.versions(), "drills": drills,
                     "note": "Counted on Apple M1 Pro (CPU) with jax 0.11.2; counts are deterministic, independent of the machine."})
