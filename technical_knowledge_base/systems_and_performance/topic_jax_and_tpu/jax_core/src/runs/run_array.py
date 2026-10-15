"""The jax.Array model on one CPU device: what an array is, async dispatch, dtypes, weak types, x64,
type promotion against NumPy, and jax.numpy against NumPy. Writes out/array.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_array.py
"""
import os
import sys
import time
import warnings

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import numpy as np  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402

warnings.filterwarnings("ignore", message="Explicitly requested dtype")

R = {"versions": J.versions(), "numpy": np.__version__, "load_start": J.load1(), "label": J.LABEL}

# ---------------------------------------------------------------- 1. what a jax.Array is
x = jnp.arange(6.0).reshape(2, 3)
R["array"] = {
    "type": type(x).__module__ + "." + type(x).__name__,
    "isinstance_jax_Array": isinstance(x, jax.Array),
    "repr": repr(x),
    "shape": list(x.shape), "dtype": str(x.dtype), "weak_type": bool(x.weak_type),
    "devices": str(x.devices()), "sharding": str(x.sharding), "committed": bool(x.committed),
    "nbytes": int(x.nbytes), "typeof": str(jax.typeof(x)), "aval_repr": repr(jax.typeof(x)),
    "is_ready": bool(x.is_ready()),
}
# committed: placed explicitly vs left to JAX
host = np.ones(3, np.float32)
R["committed"] = {
    "jnp.ones": bool(jnp.ones(3).committed),
    "jnp.asarray(numpy)": bool(jnp.asarray(host).committed),
    "device_put(x)": bool(jax.device_put(host).committed),
    "device_put(x, jax.devices()[0])": bool(jax.device_put(host, jax.devices()[0]).committed),
    "result of committed + uncommitted": bool((jax.device_put(host, jax.devices()[0]) + jnp.ones(3)).committed),
}

# ---------------------------------------------------------------- 2. async dispatch
@jax.jit
def mm(a, b):
    return jnp.tanh(a @ b)


a = jax.random.normal(jax.random.key(0), (1024, 1024))
mm(a, a).block_until_ready()  # compile


def timed(fn, reps=7):
    ws = []
    for _ in range(reps):
        t0 = time.perf_counter()
        fn()
        ws.append(time.perf_counter() - t0)
    return J.median(ws) * 1e3


def dispatch_only():
    mm(a, a)


def dispatch_block():
    mm(a, a).block_until_ready()


def chain10_noblock():
    y = a
    for _ in range(10):
        y = mm(y, a)
    return y


def chain10_blockend():
    chain10_noblock().block_until_ready()


def chain10_blockeach():
    y = a
    for _ in range(10):
        y = mm(y, a).block_until_ready()


def chain10_float():
    y = a
    for _ in range(10):
        y = mm(y, a)
        float(y[0, 0])        # implicit sync: Python needs the number


ready_right_after = []
for _ in range(5):
    r = mm(a, a)
    ready_right_after.append(bool(r.is_ready()))
    r.block_until_ready()

c0 = time.process_time()
R["async"] = {
    "shape": "tanh(a @ b), a and b f32[1024,1024], jitted",
    "dispatch_only_ms": timed(dispatch_only),
    "dispatch_and_block_ms": timed(dispatch_block),
    "chain10_no_block_ms": timed(chain10_noblock),
    "chain10_block_at_end_ms": timed(chain10_blockend),
    "chain10_block_each_ms": timed(chain10_blockeach),
    "chain10_float_each_ms": timed(chain10_float),
    "is_ready_right_after_dispatch": ready_right_after,
    "cpu_s": time.process_time() - c0,
    "load": J.load1(),
}
mm(a, a).block_until_ready()

# ---------------------------------------------------------------- 3. default dtypes and x64
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    f64 = jnp.array([1.0, 2.0], dtype=jnp.float64)
    warn64 = [J.scrub(str(m.message)) for m in w]
R["x64_off"] = {
    "jax_enable_x64": bool(jax.config.jax_enable_x64),
    "jnp.array(1.0)": str(jnp.array(1.0).dtype),
    "jnp.array(1)": str(jnp.array(1).dtype),
    "jnp.arange(3)": str(jnp.arange(3).dtype),
    "jnp.asarray(np.float64 array)": str(jnp.asarray(np.ones(2)).dtype),
    "jnp.asarray(np.int64 array)": str(jnp.asarray(np.ones(2, np.int64)).dtype),
    "np.array(1.0)": str(np.array(1.0).dtype),
    "np.arange(3)": str(np.arange(3).dtype),
    "requested float64": str(f64.dtype),
    "warning": warn64[0] if warn64 else None,
    "int32 overflow": int(jnp.array(2**31 - 1, jnp.int32) + 1),
    "jnp.sum(int8 array) dtype": str(jnp.sum(jnp.ones(3, jnp.int8)).dtype),
    "np.sum(int8 array) dtype": str(np.sum(np.ones(3, np.int8)).dtype),
    "1/3 float32 repr": repr(float(jnp.array(1.0) / 3)),
}

# ---------------------------------------------------------------- 4. type promotion: JAX against NumPy
names = ["bool", "uint8", "int8", "int32", "uint32", "int64", "bfloat16", "float16", "float32", "float64", "py int", "py float"]


def operand(n, lib):
    if n == "py int":
        return 2
    if n == "py float":
        return 2.0
    if lib == "jnp":
        return jnp.ones(2, dtype=jnp.dtype(n) if n != "bfloat16" else jnp.bfloat16)
    if n == "bfloat16":
        return None  # NumPy has no bfloat16 (ml_dtypes provides one, but NumPy's promotion does not know it)
    return np.ones(2, dtype=n)


def promote(a, b, lib):
    xa, xb = operand(a, lib), operand(b, lib)
    if xa is None or xb is None:
        return "n/a"
    if isinstance(xa, (int, float)) and isinstance(xb, (int, float)):
        return type(xa + xb).__name__
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            r = xa + xb
        wt = getattr(r, "weak_type", False)
        return str(r.dtype) + ("*" if wt else "")
    except Exception as e:  # noqa: BLE001
        return "error: " + type(e).__name__


def table(x64):
    jax.config.update("jax_enable_x64", x64)
    t = {}
    for a_ in names:
        for b_ in names:
            t[a_ + "|" + b_] = {"jax": promote(a_, b_, "jnp"), "numpy": promote(a_, b_, "np")}
    return t


R["promotion"] = {"names": names, "x64_off": table(False), "x64_on": table(True),
                  "note": "result dtype of x + y; * marks a weakly typed result; numpy 2 rules (NEP 50)"}
jax.config.update("jax_enable_x64", False)

# weak types in practice
bf = jnp.ones(3, jnp.bfloat16)
R["weak"] = {
    "typeof(2.0)": str(jax.typeof(2.0)),
    "typeof(jnp.float32(2.0))": str(jax.typeof(jnp.float32(2.0))),
    "bf16 * 2.0": str((bf * 2.0).dtype),
    "bf16 * jnp.float32(2.0)": str((bf * jnp.float32(2.0)).dtype),
    "bf16 * np.float32(2.0)": str((bf * np.float32(2.0)).dtype),
    "bf16 * jnp.array(2.0)": str((bf * jnp.array(2.0)).dtype),
    "jnp.array(2.0).weak_type": bool(jnp.array(2.0).weak_type),
    "jnp.asarray(2.0).weak_type": bool(jnp.asarray(2.0).weak_type),
    "int8 + 1000": J.err(lambda: jnp.ones(2, jnp.int8) + 1000) or str((jnp.ones(2, jnp.int8) + 1000).dtype),
    "int8 + 1000 value": [int(v) for v in (jnp.ones(2, jnp.int8) + 1000)] if J.err(lambda: jnp.ones(2, jnp.int8) + 1000) is None else None,
    "uint8 array + -1": J.err(lambda: jnp.ones(2, jnp.uint8) + (-1)) or [int(v) for v in jnp.ones(2, jnp.uint8) + (-1)],
}

# ---------------------------------------------------------------- 5. jax.numpy against NumPy
diffs = {}
diffs["list input"] = {"jax": J.err(lambda: jnp.sum([1, 2, 3])), "numpy": int(np.sum([1, 2, 3]))}
diffs["int / int"] = {"jax": str((jnp.arange(3) / 2).dtype), "numpy": str((np.arange(3) / 2).dtype)}
diffs["unique under jit"] = {"jax": J.err(lambda: jax.jit(jnp.unique)(jnp.array([1, 1, 2])), 2),
                             "jax_with_size": [int(v) for v in jax.jit(lambda v: jnp.unique(v, size=3, fill_value=-1))(jnp.array([1, 1, 2]))],
                             "numpy": [1, 2]}
diffs["nonzero under jit"] = {"jax": J.err(lambda: jax.jit(jnp.nonzero)(jnp.array([0, 3, 0, 4])), 2),
                              "jax_with_size": [int(v) for v in jax.jit(lambda v: jnp.nonzero(v, size=2)[0])(jnp.array([0, 3, 0, 4]))]}
diffs["boolean mask under jit"] = {"jax": J.err(lambda: jax.jit(lambda v: v[v > 0])(jnp.array([-1.0, 2.0])), 2),
                                   "fix": [float(v) for v in jax.jit(lambda v: jnp.where(v > 0, v, 0.0))(jnp.array([-1.0, 2.0]))]}


def np_warn(fn):
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        try:
            v = fn()
        except Exception as e:  # noqa: BLE001
            return J.scrub(type(e).__name__ + ": " + str(e))
    return {"value": str(v), "warnings": [type(m.message).__name__ + ": " + str(m.message) for m in w]}


diffs["log(-1)"] = {"jax": str(float(jnp.log(-1.0))), "numpy": np_warn(lambda: np.log(np.float32(-1.0)))}
diffs["7 // 0 (int32)"] = {"jax": int(jnp.array(7) // 0), "numpy": np_warn(lambda: np.array(7, np.int32) // 0)}
diffs["7 % 0 (int32)"] = {"jax": int(jnp.array(7) % 0), "numpy": np_warn(lambda: np.array(7, np.int32) % 0)}
diffs["int8 array + 1000"] = {"jax": [int(v) for v in jnp.ones(2, jnp.int8) + 1000], "numpy": np_warn(lambda: np.ones(2, np.int8) + 1000)}
diffs["uint8 array + (-1)"] = {"jax": [int(v) for v in jnp.ones(2, jnp.uint8) + (-1)], "numpy": np_warn(lambda: np.ones(2, np.uint8) + (-1))}
diffs["float32 array * 2.0"] = {"jax": str((jnp.ones(2) * 2.0).dtype), "numpy": str((np.ones(2, np.float32) * 2.0).dtype)}
diffs["jnp.array([1.5, 2]) vs np.array"] = {"jax": str(jnp.array([1.5, 2]).dtype), "numpy": str(np.array([1.5, 2]).dtype)}
diffs["np.asarray(jax_array)"] = {"type": type(np.asarray(x)).__name__, "note": "device-to-host copy (a sync point); on CPU may share memory"}
diffs["inplace"] = {"jax": J.err(lambda: x.__setitem__(0, 1.0), 1)}
R["jnp_vs_np"] = diffs

# matmul precision default on CPU: f32 matmul against float64 reference
k = jax.random.key(1)
A = jax.random.normal(k, (256, 256))
B = jax.random.normal(jax.random.fold_in(k, 1), (256, 256))
ref = np.asarray(A, np.float64) @ np.asarray(B, np.float64)
prec = {}
for p in ["default", "high", "highest"]:
    with jax.default_matmul_precision(p):
        out = np.asarray(jax.jit(lambda u, v: u @ v)(A, B), np.float64)
    prec[p] = float(np.max(np.abs(out - ref)))
bfo = np.asarray((A.astype(jnp.bfloat16) @ B.astype(jnp.bfloat16)).astype(jnp.float32), np.float64)
prec["inputs cast to bfloat16"] = float(np.max(np.abs(bfo - ref)))
R["matmul_precision_cpu"] = {"max_abs_err_vs_float64": prec, "max_abs_ref": float(np.max(np.abs(ref))),
                             "note": "256x256 f32 matmul on CPU; on CPU every precision setting computes in float32"}
R["load_end"] = J.load1()
J.save("array", R)
