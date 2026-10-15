"""Run every code snippet shown in the Reading tab and record its real output.

Usage (shared venv, CPU only, low priority):
  JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_VENV/bin/python -I src/read/run_examples.py
Writes src/read/out/examples.json: {name: {code, output, versions}}. make_read_data.py pastes them into the parts.
Error messages are kept as JAX prints them, with absolute paths removed.
"""
import contextlib, io, json, os, re, sys, traceback

os.environ.setdefault("JAX_PLATFORMS", "cpu")
os.environ.setdefault("XLA_FLAGS", "--xla_cpu_multi_thread_eigen=false intra_op_parallelism_threads=4")
import jax, jax.numpy as jnp  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

EX = {}

EX["jaxpr"] = '''import jax, jax.numpy as jnp

def mlp(w1, w2, x):          # x: [tokens, d_model]
    h = jax.nn.gelu(x @ w1)  # [tokens, 4 * d_model]
    return h @ w2

w1, w2 = jnp.ones((128, 512)), jnp.ones((512, 128))
x = jnp.ones((8, 128))
print(jax.make_jaxpr(mlp)(w1, w2, x))'''

EX["print"] = '''import jax, jax.numpy as jnp

@jax.jit
def f(x):
    print("step", x)
    return x * 2

for _ in range(3):
    f(jnp.ones(4))'''

EX["err_if"] = '''import jax, jax.numpy as jnp

@jax.jit
def relu_or_not(x):
    if x.sum() > 0:          # a Python bool of a traced value
        return x
    return -x

relu_or_not(jnp.ones(3))'''

EX["err_shape"] = '''import jax, jax.numpy as jnp

@jax.jit
def positives(x):
    return x[x > 0]          # how many? depends on the data

positives(jnp.array([1.0, -2.0, 3.0]))'''

EX["err_set"] = '''import jax.numpy as jnp
x = jnp.zeros(3)
try:
    x[0] = 1.0
except TypeError as e:
    print("TypeError:", e)
x = x.at[0].set(1.0)         # a new array
print(x)'''

EX["err_side"] = '''import jax, jax.numpy as jnp
seen = []

@jax.jit
def f(x):
    seen.append(x)           # runs while tracing only
    return x + 1

for _ in range(3):
    f(jnp.ones(2))
print(len(seen), seen[0])'''

EX["err_global"] = '''import jax, jax.numpy as jnp
scale = 2.0

@jax.jit
def f(x):
    return x * scale         # read once, while tracing

print(f(jnp.ones(2)))
scale = 10.0
print(f(jnp.ones(2)))        # same shape: cached, still 2.0'''

EX["err_key"] = '''import jax
key = jax.random.key(0)
a = jax.random.normal(key, (3,))
b = jax.random.normal(key, (3,))      # same key: same numbers
key, sub = jax.random.split(key)
c = jax.random.normal(sub, (3,))      # fresh subkey: new numbers
print(a); print(b); print(c)'''

EX["err_recompile"] = '''import jax, jax.numpy as jnp

@jax.jit
def f(x):
    return jnp.tanh(x).sum()

batches = [jnp.ones(n) for n in [100, 100, 101, 102]]
jax.config.update("jax_log_compiles", True)
for x in batches:                     # a new length is a new signature
    f(x)
print("cache size:", f._cache_size())'''

EX["err_oob"] = '''import jax, jax.numpy as jnp
x = jnp.arange(5.0)
print(x[10])                          # no error: clamped to the last element
print(x.at[10].set(99.0))             # no error: the write is dropped'''


def strip_paths(s):
    s = re.sub(r'File "[^"]*/(site-packages|lib/python3\.\d+)/', r'File "<\1>/', s)
    s = re.sub(r'/(?:Users|private|tmp|home)/[^\s"\']+', '<path>', s)
    return s


def run(code):
    buf = io.StringIO()
    err = None
    import logging
    h = logging.StreamHandler(buf)
    lg = logging.getLogger("jax")
    lg.addHandler(h)
    try:
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
            exec(compile(code, "<snippet>", "exec"), {"__name__": "__snippet__"})
    except Exception as e:  # keep the exception as JAX raises it
        msg = "".join(traceback.format_exception_only(type(e), e)).strip()
        err = msg
    finally:
        lg.removeHandler(h)
        jax.config.update("jax_log_compiles", False)
    out = buf.getvalue().rstrip()
    if "jax_log_compiles" in code:   # keep the log's "Compiling" lines; drop the per-phase timing lines
        out = "\n".join(l for l in out.splitlines() if l.startswith("Compiling") or not l.startswith("Finished"))
    if err:   # the message as raised, up to its documentation link (JAX's note about filtered frames dropped)
        m = err.split("\n--------------------")[0]
        err = m.strip()
    if err:
        out = (out + "\n" if out else "") + err
    return strip_paths(out)


def main():
    res = {"_versions": {"jax": jax.__version__, "jaxlib": jax.lib.__version__ if hasattr(jax.lib, "__version__") else None,
                         "python": sys.version.split()[0], "platform": jax.devices()[0].platform}}
    for k, code in EX.items():
        res[k] = {"code": code, "output": run(code)}
        print("==", k); print(res[k]["output"][:600])
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    with open(os.path.join(HERE, "out", "examples.json"), "w") as f:
        json.dump(res, f, indent=1)


if __name__ == "__main__":
    main()
