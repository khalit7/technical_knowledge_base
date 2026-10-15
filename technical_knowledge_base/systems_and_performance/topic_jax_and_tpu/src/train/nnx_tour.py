"""Run every short code snippet shown in the Training lab and record its real output (stdout, warnings and
errors, with absolute paths removed). Writes out/snippets.json: {name: {code, output}}.
Run: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B nnx_tour.py
"""
import contextlib
import io
import json
import os
import re
import traceback
import warnings

os.environ.setdefault("JAX_PLATFORMS", "cpu")
HERE = os.path.dirname(os.path.abspath(__file__))
EX = {}

EX["nnx_module"] = '''import jax, jax.numpy as jnp
from flax import nnx

class MLP(nnx.Module):                       # like torch.nn.Module: the object holds its state
    def __init__(self, d, f, *, rngs):
        self.fc1 = nnx.Linear(d, f, rngs=rngs)
        self.fc2 = nnx.Linear(f, d, rngs=rngs)
        self.calls = nnx.Variable(jnp.zeros((), jnp.int32))  # state that is not a parameter

    def __call__(self, x):
        self.calls[...] += 1                 # mutate in place, like a PyTorch buffer
        return self.fc2(jax.nn.gelu(self.fc1(x), approximate=False))

m = MLP(128, 512, rngs=nnx.Rngs(0))
y = m(jnp.ones((4, 128)))
print(type(m.fc1.kernel).__name__, m.fc1.kernel.shape, "calls:", m.calls[...])
graphdef, params, rest = nnx.split(m, nnx.Param, ...)   # structure | parameters | everything else
print(jax.tree.map(jnp.shape, nnx.to_pure_dict(params)))
print(nnx.to_pure_dict(rest))
m2 = nnx.merge(graphdef, params, rest)                # a new module object with the same state
print((m2(jnp.ones((4, 128))) == y).all())'''

EX["nnx_pure"] = '''import jax, jax.numpy as jnp
from flax import nnx

m = nnx.Linear(128, 64, rngs=nnx.Rngs(0))
graphdef, state = nnx.split(m)

@jax.jit                                   # plain jax.jit: only arrays (the state) cross the boundary
def forward(state, x):
    model = nnx.merge(graphdef, state)     # rebuild the module inside the trace
    return model(x)

x = jnp.ones((2, 128))
print(jnp.allclose(forward(state, x), m(x)))
print(nnx.jit(lambda m, x: m(x))(m, x).shape)   # nnx.jit does the split and merge for you'''

EX["optimizer_wrt"] = '''import optax
from flax import nnx

m = nnx.Linear(4, 4, rngs=nnx.Rngs(0))
try:
    nnx.Optimizer(m, optax.adamw(1e-3))
except TypeError as e:
    print("TypeError:", e)
opt = nnx.Optimizer(m, optax.adamw(1e-3), wrt=nnx.Param)
print(type(opt).__name__, "step", opt.step[...])'''

EX["value_dep"] = '''import warnings, jax.numpy as jnp
from flax import nnx

m = nnx.Linear(2, 2, rngs=nnx.Rngs(0))
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    m.kernel.value = jnp.eye(2)            # the pre-0.12 spelling
    print(w[0].category.__name__ + ":", str(w[0].message).splitlines()[0])
m.kernel[...] = jnp.eye(2)                 # what flax 0.12 asks for
print(m.kernel[...])'''

EX["optax_chain"] = '''import jax, jax.numpy as jnp, optax

params = {"w": jnp.ones((2, 2)), "ln": jnp.ones(2)}
grads = {"w": jnp.full((2, 2), 3.0), "ln": jnp.full(2, 4.0)}
tx = optax.chain(
    optax.clip_by_global_norm(1.0),                       # torch: clip_grad_norm_
    optax.adamw(learning_rate=1e-3, b1=0.9, b2=0.95, weight_decay=0.1,
                mask={"w": True, "ln": False}))           # torch: parameter groups
state = tx.init(params)                                   # optimiser state is a pytree too
updates, state = tx.update(grads, state, params)          # pure: returns new state
params = optax.apply_updates(params, updates)
print(jax.tree.map(lambda u: u.round(6), updates))
print(type(state[1][0]).__name__, int(state[1][0].count))'''

EX["muon"] = '''import inspect, optax, optax.contrib
print(optax.__version__, "muon" in dir(optax.contrib))
print(list(inspect.signature(optax.contrib.muon).parameters)[:7])'''

EX["jmp_policy"] = '''import jax.numpy as jnp, jmp

policy = jmp.get_policy("params=float32,compute=bfloat16,output=float32")
w = jnp.ones((128, 128), jnp.float32)          # master weights stay float32
w_c = policy.cast_to_compute(w)                 # the copy the matmuls use
print(w.dtype, "->", w_c.dtype)
scale = jmp.DynamicLossScale(jnp.float32(2 ** 15))  # only needed for float16, not bfloat16
print(scale.loss_scale)'''


def scrub(s):
    s = re.sub(r"/[^\s\"']*/site-packages/", "<site-packages>/", s)
    s = re.sub(r"/(Users|private|home)/[^\s\"']*", "<path>", s)
    return s


out = {}
for name, code in EX.items():
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            exec(compile(code, name, "exec"), {"__name__": "__main__"})
        except Exception:
            buf.write(traceback.format_exc(limit=0))
    out[name] = {"code": code, "output": scrub(buf.getvalue().rstrip())}
    print("==", name); print(out[name]["output"])
import flax, jax, optax
out["_versions"] = {"jax": jax.__version__, "flax": flax.__version__, "optax": optax.__version__}
json.dump(out, open(os.path.join(HERE, "out", "snippets.json"), "w"), indent=1)
