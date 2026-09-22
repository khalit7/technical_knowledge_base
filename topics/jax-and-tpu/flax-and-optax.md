# Flax NNX, optax, orbax: the training stack

⏱ 7 min read · +3h 45m resources

### Best resources

- [Flax NNX basics](https://flax.readthedocs.io/en/latest/nnx_basics.html) (~30 min) and the
  [NNX vs JAX transforms guide](https://flax.readthedocs.io/en/latest/guides/jax_and_nnx_transforms.html) (~20 min):

  the current recommended API, from the source.

- [Linen to NNX migration guide](https://flax.readthedocs.io/en/latest/migrating/linen_to_nnx.html) (~30 min):
  read it even as a newcomer; most existing JAX code (big_vision, older MaxText) is

  Linen, and this doc is the Rosetta stone.

- [optax docs](https://optax.readthedocs.io/) (docs, ~40 min for the core pages): gradient transformations, `chain`,
  schedules, `MultiSteps` (grad accumulation).

- [orbax checkpointing docs](https://orbax.readthedocs.io/) (docs, ~30 min for the core pages): async + sharded
  checkpointing, the standard everywhere (MaxText, Tunix).

- [JAX AI stack tutorials](https://docs.jaxstack.ai/) (~1h 15m): Google's blessed end-to-end
  examples wiring JAX + Flax NNX + optax + orbax + grain together.

NNX is the recommended API for new code; Linen is maintained, not deprecated, and

interops via `flax.nnx.bridge`.

### The library landscape

|  | Status | Model | Feel |
| --- | --- | --- | --- |
| **Flax NNX** | Recommended for new code | Modules own their state as attributes, eager init | Closest to `torch.nn.Module` |
| **Flax Linen** | Maintained, huge installed base | Stateless modules, params returned by `.init()`, lazy shape inference | Functional, `apply(params, x)` everywhere |
| **Equinox** | Active, research favourite | Model is itself a pytree; filtered jit/grad | Minimal, elegant |
| **Haiku** | Legacy (DeepMind moved to Flax) | `hk.transform` impurity-to-purity wrapper | Read-only knowledge for old DeepMind repos |

For the PyTorch-LM port: use NNX. Learn to *read* Linen.

### NNX in one screen

```python
from flax import nnx
import jax, jax.numpy as jnp, optax

class Block(nnx.Module):
    def __init__(self, d, rngs: nnx.Rngs):
        self.attn_proj = nnx.Linear(d, 3 * d, rngs=rngs)
        self.mlp = nnx.Linear(d, 4 * d, rngs=rngs)
        self.norm = nnx.LayerNorm(d, rngs=rngs)
        self.drop = nnx.Dropout(0.1, rngs=rngs)
    def __call__(self, x):
        ...  # plain Python, reads like forward()

model = Block(512, rngs=nnx.Rngs(0))       # eager init, like PyTorch
y = model(x)                                # direct call, stateful
```

Key ideas:

- Parameters are `nnx.Param` attributes; mutable non-param state (BN stats, KV cache)
  is `nnx.Variable` subclasses (`nnx.BatchStat`, custom). No separate "collections"

  dance as in Linen.

- `nnx.Rngs` carries PRNG streams (`params`, `dropout`, ...) so you do not hand-split
  keys inside layers.

- `nnx.split(model)` / `nnx.merge(...)` convert between the stateful Python object and
  (graphdef, state-pytree) form when you need raw JAX; `nnx.jit`, `nnx.grad`,

  `nnx.value_and_grad`, `nnx.scan` are lifted transforms that do this for you and allow

  in-place-looking mutation of modules inside jit.

- Linen contrast: Linen's `model.init(key, x)` returns a params dict and
  `model.apply({'params': p}, x, mutable=['batch_stats'])` threads state explicitly;

  `@nn.compact` defines submodules inline with lazy shapes. NNX removes that ceremony at

  the cost of an explicit `d_in` on every layer (`nnx.Linear(din, dout)`), like PyTorch.

### optax: optimisers as pure gradient transformations

An optax optimiser is a pair of pure functions, `init(params) -> opt_state` and

`update(grads, opt_state, params) -> (updates, opt_state)`. You then apply updates with

`optax.apply_updates(params, updates)`. Everything composes with `optax.chain`:

```python
schedule = optax.warmup_cosine_decay_schedule(
    init_value=0.0, peak_value=3e-4, warmup_steps=2_000,
    decay_steps=100_000, end_value=3e-5)
tx = optax.chain(
    optax.clip_by_global_norm(1.0),                      # like clip_grad_norm_
    optax.adamw(schedule, b1=0.9, b2=0.95, weight_decay=0.1),
)
```

- Schedules are just functions `step -> lr` passed in place of a float; no
  `scheduler.step()`, no separate object to checkpoint (the step count lives in the

  optimiser state).

- Gradient accumulation: `optax.MultiSteps(tx, every_k_schedule=k)`.
- Per-parameter behaviour (e.g. no weight decay on norms/bias): `optax.multi_transform`
  or `adamw(mask=...)` with a pytree mask; the mask replaces PyTorch param-group lists.

- EMA (`optax.ema`), SAM, Lion, Muon, apply-if-finite, are all stock transformations you
  chain, not new optimiser classes.

In NNX, `optimizer = nnx.Optimizer(model, tx, wrt=nnx.Param)` bundles model reference +

opt state; `optimizer.update(model, grads)` applies the step in place.

### The train loop, line by line vs PyTorch

```python
# PyTorch                                  # JAX / Flax NNX
model = GPT(cfg).cuda()                    model = GPT(cfg, rngs=nnx.Rngs(0))   # device placement is implicit/sharded
opt = torch.optim.AdamW(model.parameters(),optimizer = nnx.Optimizer(model,
    lr=3e-4, weight_decay=0.1)                 optax.adamw(3e-4, weight_decay=0.1), wrt=nnx.Param)

                                           @nnx.jit                              # compile whole step; donates internally
def train_step(model, opt, batch):         def train_step(model, optimizer, batch):
    x, y = batch                               def loss_fn(model):
    logits = model(x)                              logits = model(batch['x'])
    loss = F.cross_entropy(                        return optax.softmax_cross_entropy_with_integer_labels(
        logits.view(-1, V), y.view(-1))                logits, batch['y']).mean()
    opt.zero_grad()                            loss, grads = nnx.value_and_grad(loss_fn)(model)
    loss.backward()                            optimizer.update(model, grads)     # replaces zero_grad+backward+step
    torch.nn.utils.clip_grad_norm_(...)        # clipping lives inside the optax chain
    opt.step()                                 return loss
    return loss.item()

for step, batch in enumerate(loader):      for step, batch in enumerate(loader):  # loader: grain or plain iterator
    loss = train_step(model, opt, batch)       loss = train_step(model, optimizer, batch)
                                               # loss is an async device array; log loss.item() sparingly
```

Differences that matter: the whole step is one compiled XLA program (fusion across

forward/backward/update, so JAX loops are typically fast without kernel work); there is

no `.train()`/`.eval()` global mode (pass `deterministic=True` or use

`model.eval()` in NNX to toggle dropout); metrics you pull to host every step force a

device sync, so log every N steps.

### orbax checkpointing

```python
import orbax.checkpoint as ocp
ckptr = ocp.StandardCheckpointer()
_, state = nnx.split(model)                       # state is a pytree
ckptr.save(path / f'step_{step}', state)          # async by default; sharded-safe

# restore: build abstract target, then restore into it
abs_state = jax.eval_shape(lambda: nnx.state(GPT(cfg, rngs=nnx.Rngs(0))))
state = ckptr.restore(path / 'step_1000', abs_state)
nnx.update(model, state)
```

Use `ocp.CheckpointManager` for rotation/retention and to save model + optimiser + data

iterator (grain iterators are checkpointable) atomically. Orbax saves each shard from

its own host (no gather-to-rank-0 as in naive `torch.save`), restores directly into a

sharding layout, and supports emergency/multi-tier local checkpointing at scale. This is

the `torch.distributed.checkpoint` analogue, but it is the default path, not the

advanced one.

### Data: grain in one paragraph

`grain` is the JAX-blessed input pipeline: deterministic global shuffle, worker

processes, and an iterator whose state can be checkpointed alongside the model (exact

resume mid-epoch). API shape: `grain.MapDataset.source(...).shuffle(seed).map(...)

.batch(B)`. A plain Python generator or a PyTorch `DataLoader` also works fine for the

small-LM port; adopt grain when you care about reproducible resume.

Next: sharding this loop across devices in [Sharding and scale: GSPMD, Mesh, shard_map](sharding-and-scale.md).
