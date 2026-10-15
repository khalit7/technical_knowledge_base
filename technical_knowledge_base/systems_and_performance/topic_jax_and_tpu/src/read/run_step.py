"""Run the train step shown in the Reading tab's section 4 on the running example and record code and output.
Usage: JX_SCRATCH=<shared setup folder> JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B src/read/run_step.py
Writes src/read/out/step.json."""
import contextlib, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
os.environ.setdefault("XLA_FLAGS", "--xla_cpu_multi_thread_eigen=false intra_op_parallelism_threads=4")

CODE = '''import jax, optax
from flax import nnx
import common as C, model_nnx as M                # the running example (src/data)

model = M.make_model(C.CFG)                       # built eagerly, like an nn.Module
optimizer = M.make_optimizer(model, C.CFG)        # nnx.Optimizer(model, optax chain, wrt=nnx.Param)

@nnx.jit(donate_argnames=("model", "optimizer"))  # one compiled program; reuse the old buffers
def train_step(model, optimizer, x, y):
    def loss_fn(model):
        logits = model(x)                         # [B, T, vocab]
        return optax.softmax_cross_entropy_with_integer_labels(logits, y).mean()
    loss, grads = nnx.value_and_grad(loss_fn)(model)   # grads mirror the parameters
    optimizer.update(model, grads)                # zero_grad + backward + step, in one call
    return loss

params = nnx.state(model, nnx.Param)
print("parameters:", sum(p.size for p in jax.tree.leaves(params)))
for step in range(3):
    x, y = C.batch(step)                          # int32 [32, 128]: the batches PyTorch reads too
    print(step, x.shape, float(train_step(model, optimizer, x, y)))'''

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    exec(compile(CODE, "<step>", "exec"), {"__name__": "__step__"})
import jax, flax  # noqa: E402
out = buf.getvalue().rstrip()
print(out)
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump({"code": CODE, "output": out,
           "caption": "Ran with jax %s and flax %s on Apple M1 Pro (CPU); output as printed. The model and optimiser come from <code>src/data/model_nnx.py</code> (AdamW with warmup, global-norm clipping and weight decay on weight matrices only); <code>nnx.jit</code> donates nothing unless asked, hence <code>donate_argnames</code>; <code>float(...)</code> forces a host sync, fine for three steps and a mistake in a real loop." % (jax.__version__, flax.__version__)},
          open(os.path.join(HERE, "out", "step.json"), "w"), indent=1)
