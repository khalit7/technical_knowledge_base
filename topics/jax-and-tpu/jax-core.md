# JAX core: the functional model

⏱ 9 min read · +4h 50m resources

### Best resources

- [Thinking in JAX](https://docs.jax.dev/en/latest/notebooks/thinking_in_jax.html) (~25 min) and
  the [JAX tutorials](https://docs.jax.dev/en/latest/tutorials.html) (docs, ~1h 5m for the tutorial set): jit, grad, vmap,

  PRNG, pytrees; the fastest correct mental model.

- [How to think about jit / tracing](https://docs.jax.dev/en/latest/jit-compilation.html) (~20 min)
  and [Common gotchas](https://docs.jax.dev/en/latest/notebooks/Common_Gotchas_in_JAX.html) (~25 min):

  the official footgun list; read before debugging anything.

- [Autodidax](https://docs.jax.dev/en/latest/autodidax.html) (~2h): build JAX's core (tracing,
  jaxprs, jvp/vjp) from scratch; the deepest explanation of why JAX behaves as it does.

- [PyTorch-to-JAX comparison in the scaling book, ch. 10](https://jax-ml.github.io/scaling-book/jax-stuff/) (~35 min):
  how a PyTorch person should read JAX code.

*Current as of JAX 0.11.2; minimum Python 3.11.*

### The one-sentence model

JAX = numpy + composable function transformations (`jit`, `grad`, `vmap`, `shard_map`),

where each transformation works by tracing a **pure** Python function into a small

intermediate program (a jaxpr) and then rewriting or compiling it with XLA.

PyTorch translation: PyTorch records ops eagerly as they execute on real tensors (define

by run); JAX runs your Python function once with abstract **tracer** values (shape +

dtype, no data) to extract the computation, then compiles it. `torch.compile` moved

PyTorch toward this model; JAX started there.

### Purity and explicit state

Transformed functions must be pure: output depends only on inputs, no side effects.

Consequences:

- No hidden `param.grad`, no `optimizer.state`, no module-owned buffers. Parameters,
  optimiser state, and RNG state are ordinary values you pass in and get back:

  `new_state = train_step(state, batch)`.

- Printing inside a jitted function prints tracers, once, at trace time. Use
  `jax.debug.print("x={x}", x=x)` for runtime values.

- In-place mutation of arrays is impossible; arrays are immutable. Instead of
  `x[0] = 1.0`, write `x = x.at[0].set(1.0)` (also `.add`, `.multiply`, `.min`, `.max`).

  Under jit, XLA turns these into true in-place updates, so no copy cost in practice.

- Python-level side effects (appending to a list, mutating a dict) silently happen only
  at trace time. This is the single most common source of "it worked once then stopped

  updating" confusion.

### PRNG: keys, not global state

PyTorch: `torch.manual_seed(0)` sets a hidden global generator that mutates on every

call. JAX: randomness is a value.

```python
key = jax.random.key(0)                 # PRNGKey; an array
key, sub = jax.random.split(key)        # split, never reuse
x = jax.random.normal(sub, (B, D))
```

Rules: never reuse a key (identical "random" numbers); `split` as many subkeys as you

need (`jax.random.split(key, n)`); thread the key through your train step like any

other state. Benefit: bitwise reproducibility, and `vmap`/`shard_map` can

give each element or device its own key deterministically. Flax NNX wraps this in

`nnx.Rngs` so you rarely split by hand inside models.

### jit: tracing rules

`jax.jit(f)` traces `f` with abstract shapes and compiles one executable per distinct

(shape, dtype, static-arg) signature.

- **Traced vs static.** Array arguments are traced (their values are unknown at trace
  time). Python scalars/bools used in control flow, and anything passed via

  `static_argnums`/`static_argnames`, are compile-time constants; a new static value

  triggers recompilation. Shapes are always static: `jnp.reshape(x, (n, -1))` is fine,

  but a shape that depends on a traced value is not (no data-dependent shapes; hence

  padding + masking for variable-length batches, exactly like XLA-era TF).

- **Python control flow** on traced values fails (`TracerBoolConversionError`). Options:
  make the condition static, or use structured control flow:

  `jax.lax.cond(pred, true_fn, false_fn, x)` (both branches compiled),

  `jax.lax.select`/`jnp.where` (both branches computed, then masked),

  `jax.lax.scan(f, carry, xs)` (compiled loop with a carried state; this is how you

  write RNNs, optimiser loops, and decode loops; also drastically cuts compile time vs

  an unrolled Python loop), `jax.lax.while_loop` (dynamic trip count, not reverse-mode

  differentiable), `jax.lax.fori_loop`.

- **Recompilation** is the silent perf killer: changing shapes (variable batch/sequence
  lengths) or static args recompiles. Log it with `jax_log_compiles=True`; bucket your

  shapes.

- **Async dispatch**: like CUDA, ops return before finishing. Call
  `x.block_until_ready()` before timing, and remember the first call includes compile

  time.

- **donate_argnums**: `jit(f, donate_argnums=(0,))` tells XLA the caller no longer needs
  argument 0's buffer, so the output can reuse its memory. Essential for train steps:

  donate the params/optimiser state you are replacing, or you briefly hold two copies of

  the model and can OOM at exactly the scale you care about.

### grad and value_and_grad

`jax.grad(f)` returns a function computing `df/darg0` for scalar-output `f`; it is

source-to-source, not tape-based.

```python
def loss_fn(params, batch):
    ...
    return loss                              # must be scalar
loss, grads = jax.value_and_grad(loss_fn)(params, batch)
```

- `grads` has exactly the same pytree structure as `params`; no `.backward()`, no
  `.grad` attributes, no `zero_grad()` (grads are fresh values every call).

- `argnums` picks which args to differentiate; `has_aux=True` lets `loss_fn` return
  `(loss, aux)` (metrics, updated batch-norm stats).

- `jax.value_and_grad` avoids recomputing the forward pass; always prefer it in train
  steps. Composition is free: `jit(grad(f))`, `grad(grad(f))` for higher order,

  `jax.jvp`/`jax.vjp` for forward/reverse primitives.

- `jax.lax.stop_gradient` = `tensor.detach()`. `jax.checkpoint` (a.k.a. `jax.remat`) =
  activation checkpointing, applied as a function transformation.

### vmap

`jax.vmap(f)` vectorises `f` over a new leading axis: write the per-example function,

get the batched one. `in_axes`/`out_axes` control which arguments are mapped

(`in_axes=(0, None)` broadcasts the second arg). PyTorch's `torch.vmap`/functorch is a

port of this idea; in JAX it is core and composes cleanly: per-example gradients are

`vmap(grad(f))`, and model ensembles are `vmap` over a stacked parameter pytree.

### Pytrees

A pytree is any nested structure of lists/tuples/dicts (and registered classes like

NNX modules or Equinox models) with arrays at the leaves. All transformations operate on

pytrees: params are pytrees, grads are matching pytrees, optimiser states are pytrees.

Key API: `jax.tree.map(lambda p, g: p - lr * g, params, grads)`,

`jax.tree.leaves`, `jax.tree.flatten/unflatten`. This replaces PyTorch's

`model.parameters()` iterator and `state_dict()` in one concept.

### PyTorch-user footguns, condensed

1. Reusing a PRNG key: identical randomness. Always `split`.
2. Python `if`/`for` on traced values: crash, or (worse) a silently unrolled giant
   graph. Use `lax.cond`/`lax.scan`.

3. Varying shapes between steps: recompilation every step. Pad and mask.
4. Side effects in jitted code (prints, list appends, global counters): run at trace
   time only.

5. Forgetting `block_until_ready()` in benchmarks: you time dispatch, not compute.
6. Not donating buffers in the train step: 2x memory for params + optimiser state.
7. Expecting `x[0] = v` to work: use `x.at[0].set(v)`.
8. Out-of-bounds indexing does not raise under jit; it clamps (reads) or drops (writes).
   Silent wrong answers; validate indices yourself.

9. Default dtype is float32; and on TPU, matmuls may use bf16 accumulation semantics you
   control via `precision=`/`jax.default_matmul_precision`. Watch this when comparing

   loss curves to a PyTorch fp32 run.

10. `jax.numpy` ops on Python scalars promote via weak typing rules that differ subtly
   from NumPy; pin dtypes at array creation.

Next: [Flax NNX, optax, orbax: the training stack](flax-and-optax.md) builds real models on top of this.
