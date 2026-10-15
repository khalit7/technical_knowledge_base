"""Debugging a compiled step: jax.debug.print, checkify, jax_debug_nans, and what each costs in the compiled program.
Each example is real code run here; its printed output is captured verbatim (paths scrubbed).
Output: src/xla/out/debug.json
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # noqa: E401,E702
import contextlib
import io
import traceback

import xc_common as X

EXAMPLES = {}

EXAMPLES["debug_print"] = '''
import jax, jax.numpy as jnp

@jax.jit
def f(x):
    print("print sees:", x)                  # Python print: runs once, while tracing
    jax.debug.print("debug.print sees: {}", x.sum())   # compiled into the program: runs every call
    return x * 2

f(jnp.arange(3.0))
f(jnp.arange(3.0) + 1)
'''

EXAMPLES["checkify"] = '''
import jax, jax.numpy as jnp
from jax.experimental import checkify

def safe_log(x):
    checkify.check(jnp.all(x > 0), "log of a non-positive value: min {m}", m=x.min())
    return jnp.log(x)

checked = jax.jit(checkify.checkify(safe_log))
err, out = checked(jnp.array([1.0, 2.0]))
print("ok call ->", err.get())
err, out = checked(jnp.array([1.0, -2.0]))
print("bad call ->", err.get())
print("out is still computed:", out)

# automatic checks for NaNs, division by zero and out-of-bounds indexing
g = jax.jit(checkify.checkify(lambda x, i: x[i] / x, errors=checkify.all_checks))
err, _ = g(jnp.array([1.0, 0.0]), 5)
print("all_checks ->", err.get())
'''

EXAMPLES["debug_nans"] = '''
import jax, jax.numpy as jnp
jax.config.update("jax_debug_nans", True)

@jax.jit
def f(x):
    y = jnp.log(x)          # log(-1) = nan
    return y * 2

try:
    f(jnp.array([1.0, -1.0]))
except FloatingPointError as e:
    print(type(e).__name__ + ":", str(e).splitlines()[0])
'''

EXAMPLES["donate"] = '''
import jax, jax.numpy as jnp

@jax.jit
def plain(w, g):
    return w - 0.1 * g

donating = jax.jit(plain, donate_argnums=0)     # promise: w is not used after the call

w, g = jnp.ones((1024, 1024)), jnp.ones((1024, 1024))
w2 = donating(w, g)
print("donated input deleted:", w.is_deleted())
try:
    w + 1
except RuntimeError as e:
    print("RuntimeError:", str(e).splitlines()[0][:110])

# donation XLA cannot use (no output has the donated shape) is ignored, with a warning
import warnings
with warnings.catch_warnings(record=True) as ws:
    warnings.simplefilter("always")
    jax.jit(lambda w: w.sum(), donate_argnums=0)(jnp.ones((256, 256)))
print("warning:", str(ws[0].message).splitlines()[0][:120])
'''

EXAMPLES["cost"] = '''
import jax, jax.numpy as jnp
from jax.experimental import checkify

def step(x):
    return jnp.log(x).sum()

plain = jax.jit(step).lower(jnp.ones(1024)).compile()
dbg = jax.jit(lambda x: (jax.debug.print("{}", x.sum()), step(x))[1]).lower(jnp.ones(1024)).compile()
chk = jax.jit(checkify.checkify(step, errors=checkify.float_checks)).lower(jnp.ones(1024)).compile()
for name, c in [("plain", plain), ("with debug.print", dbg), ("checkified (float_checks)", chk)]:
    t = c.as_text()
    instrs = sum(1 for l in t.splitlines() if l.startswith("  ") and " = " in l)
    calls = t.count('custom_call_target="xla_ffi_python_cpu_callback"')
    print(f"{name:26s} HLO instructions: {instrs:3d}   calls back into Python: {calls}")
'''


def run(name, code):
    buf = io.StringIO()
    g = {"__name__": "__ex__"}
    with contextlib.redirect_stdout(buf):
        try:
            exec(compile(code, "<%s>" % name, "exec"), g)
        except Exception:  # noqa: BLE001
            print(traceback.format_exc(limit=1).strip().splitlines()[-1])
    import jax
    jax.config.update("jax_debug_nans", False)
    return {"code": code.strip(), "output": X.scrub(buf.getvalue().rstrip())}


if __name__ == "__main__":
    res = {"versions": X.versions()}
    for n, c in EXAMPLES.items():
        res[n] = run(n, c)
        print("==", n)
        print(res[n]["output"])
    X.save("debug.json", res)
