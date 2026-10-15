"""Recompile detective: what makes jax.jit trace and compile again, with JAX's own explanations.

Each scenario runs a few calls of a small jitted function and records, through jax.monitoring, how many times
JAX traced (/jax/core/compile/jaxpr_trace_duration), lowered (.../jaxpr_to_mlir_module_duration) and compiled
(.../backend_compile_duration), plus the warnings jax_explain_cache_misses printed, scrubbed of paths.
Then a recompilation storm: a decoding-style loop over 64 sequence lengths, against the same loop with lengths
padded up to 4 buckets. Compile counts are deterministic; times are rough (shared machine, low priority).
Output: lab/out/recompile.json
"""
import logging
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
from jax import monitoring  # noqa: E402

EV = {"/jax/core/compile/jaxpr_trace_duration": "trace",
      "/jax/core/compile/jaxpr_to_mlir_module_duration": "lower",
      "/jax/core/compile/backend_compile_duration": "compile"}
COUNT = {"trace": 0, "lower": 0, "compile": 0}
TIMES = {"trace": 0.0, "lower": 0.0, "compile": 0.0}


def _listen(event, duration, **kw):
    k = EV.get(event)
    if k:
        COUNT[k] += 1
        TIMES[k] += duration


monitoring.register_event_duration_secs_listener(_listen)


class Grab(logging.Handler):
    def __init__(self):
        super().__init__(logging.WARNING)
        self.msgs = []

    def emit(self, rec):
        self.msgs.append(rec.getMessage())


grab = Grab()
logging.getLogger("jax").addHandler(grab)
logging.getLogger("jax").propagate = False
jax.config.update("jax_explain_cache_misses", True)

SCEN = [
    ("shape", "A new shape", "The batch shrinks from 32 to 31 rows (the last, smaller batch of an epoch).",
     """f = jax.jit(lambda x: jnp.tanh(x) * 2)
f(np.ones((32, 128)))
f(np.ones((31, 128)))"""),
    ("dtype", "A new dtype", "The same array in bfloat16.",
     """f = jax.jit(lambda x: jnp.tanh(x) * 2)
f(np.ones((32, 128)))
f(np.ones((32, 128), jnp.bfloat16))"""),
    ("weak", "A Python float, then a float32 scalar", "2.0 is weakly typed; np.float32(2.0) is not, so the abstract signature differs.",
     """f = jax.jit(lambda x, s: x * s)
f(np.ones(4), 2.0)
f(np.ones(4), np.float32(2.0))"""),
    ("value", "A new value of a traced argument", "Only the value changes: the signature (shape, dtype) is the same.",
     """f = jax.jit(lambda x, s: x * s)
f(np.ones(4), 2.0)
f(np.ones(4), 3.0)"""),
    ("static", "A new value of a static argument", "static_argnums makes the value part of the cache key.",
     """f = jax.jit(lambda x, n: x * n, static_argnums=1)
f(np.ones(4), 2)
f(np.ones(4), 3)"""),
    ("lambda", "A new function object every call", "jax.jit(lambda ...) inside a loop: each lambda is a new function, so the cache never hits.",
     """for i in range(3):
    jax.jit(lambda x: x * 2)(np.ones(4))"""),
    ("named", "jax.jit of the same function every call", "Wrapping the same module-level function again is fine: the cache is keyed on the function.",
     """def double(x):
    return x * 2
for i in range(3):
    jax.jit(double)(np.ones(4))"""),
    ("tree", "A new pytree structure", "A dict that gains a key: the tree structure is part of the signature.",
     """f = jax.jit(lambda d: sum(v.sum() for v in d.values()))
f({"a": np.ones(4)})
f({"a": np.ones(4), "b": np.ones(4)})"""),
    ("config", "A config change between calls", "jax_default_matmul_precision is part of the tracing context.",
     """f = jax.jit(lambda a, b: a @ b)
f(np.ones((8, 8)), np.ones((8, 8)))
jax.config.update("jax_default_matmul_precision", "highest")
f(np.ones((8, 8)), np.ones((8, 8)))
jax.config.update("jax_default_matmul_precision", None)"""),
    ("closure", "A Python global read inside the function", "No recompile, and a stale answer: the global was baked in as a constant when the function was traced.",
     """scale = 2.0
f = jax.jit(lambda x: x * scale)
print(f(np.ones(2)))
scale = 10.0
print(f(np.ones(2)))"""),
]


def clean(msg):
    msg = X.scrub(msg)
    msg = re.sub(r"id=\d+", "id=<id>", msg)
    msg = re.sub(r"(defined at |at )[^\s:]*/([\w.]+\.py)", r"\1\2", msg)
    msg = re.sub(r"<string>", "<scenario>", msg)
    return msg


def run_scenario(code):
    for k in COUNT:
        COUNT[k] = 0
        TIMES[k] = 0.0
    grab.msgs.clear()
    out = []
    ns = {"jax": jax, "jnp": jnp, "np": np, "print": lambda *a: out.append(" ".join(str(x) for x in a))}
    err = None
    try:
        exec(compile(code, "<string>", "exec"), ns)
    except Exception as e:  # noqa: BLE001
        err = "%s: %s" % (type(e).__name__, str(e).splitlines()[0])
    return {"counts": dict(COUNT), "printed": out, "error": err,
            "explain": [clean(m) for m in grab.msgs if "CACHE MISS" in m][:4]}


res = {"versions": X.versions(), "load1_start": X.load1(), "scenarios": []}
for key, title, why, code in SCEN:
    r = run_scenario(code)
    r.update(key=key, title=title, why=why, code=code)
    res["scenarios"].append(r)
    print("%-8s %s %s %s" % (key, r["counts"], r["printed"], r["error"] or ""))
    for m in r["explain"][-1:]:
        print("   ", m.replace("\n", "\n    ")[:600])

# unhashable static argument: the real error
r = run_scenario("""f = jax.jit(lambda x, dims: x.sum(dims), static_argnums=1)
f(np.ones((2, 3)), [0, 1])""")
r.update(key="unhashable", title="A list as a static argument", why="Static arguments are dictionary keys, so they must be hashable.",
         code="f = jax.jit(lambda x, dims: x.sum(dims), static_argnums=1)\nf(np.ones((2, 3)), [0, 1])")
res["scenarios"].append(r)
print("unhashable", r["error"])

# ------------------------------------------------------------------ storm vs buckets
jax.config.update("jax_explain_cache_misses", False)
W = np.random.default_rng(0).standard_normal((128, 128)).astype(np.float32)


def make_fn():
    def step(x, w):           # one "decoding" step on a growing prefix: attention-like work on L positions
        s = x @ x.T / 11.3
        L = x.shape[0]
        s = jnp.where(jnp.tril(jnp.ones((L, L), bool)), s, -jnp.inf)
        return jax.nn.softmax(s, -1) @ x @ w
    return step


def storm(pad):
    f = jax.jit(make_fn())
    calls = []
    for k in COUNT:
        COUNT[k] = 0
        TIMES[k] = 0.0
    t_all = time.perf_counter()
    c_all = time.process_time()
    for L in range(1, 65):
        Lp = (16 * -(-L // 16)) if pad else L
        x = np.ones((Lp, 128), np.float32)
        before = COUNT["compile"]
        t0 = time.perf_counter()
        f(x, W).block_until_ready()
        calls.append({"L": L, "shape": Lp, "compiled": COUNT["compile"] - before,
                      "ms": round((time.perf_counter() - t0) * 1000, 2)})
    return {"calls": calls, "compiles": COUNT["compile"], "traces": COUNT["trace"],
            "compile_s": round(TIMES["compile"], 3), "trace_s": round(TIMES["trace"], 3), "lower_s": round(TIMES["lower"], 3),
            "wall_s": round(time.perf_counter() - t_all, 3), "cpu_s": round(time.process_time() - c_all, 3)}


res["storm"] = {"what": "64 calls with prefix lengths 1..64 of a [L, 128] array; pad=True rounds L up to a multiple of 16 (4 shapes)",
                "label": "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority",
                "runs": []}
for rep in range(3):
    a = storm(False)
    b = storm(True)
    res["storm"]["runs"].append({"exact": a, "bucketed": b, "load1": X.load1()})
    print("storm rep", rep, "exact compiles", a["compiles"], a["compile_s"], a["wall_s"], "| bucketed", b["compiles"], b["compile_s"], b["wall_s"])

# ------------------------------------------------------------------ jax_log_compiles and the cache size
grab.msgs.clear()
jax.config.update("jax_log_compiles", True)
g = jax.jit(lambda x: jnp.sin(x) + 1)
g(np.ones(8, np.float32))
g(np.ones(9, np.float32))
g(np.ones(9, np.float32))
jax.config.update("jax_log_compiles", False)
res["log_compiles"] = {"code": "jax.config.update(\"jax_log_compiles\", True)\ng = jax.jit(lambda x: jnp.sin(x) + 1)\ng(np.ones(8, np.float32))\ng(np.ones(9, np.float32))\ng(np.ones(9, np.float32))\nprint(g._cache_size())",
                       "messages": [clean(m)[:300] for m in grab.msgs][:6], "cache_size": g._cache_size()}
print("log_compiles", res["log_compiles"]["messages"], res["log_compiles"]["cache_size"])
X.save("recompile.json", res)
