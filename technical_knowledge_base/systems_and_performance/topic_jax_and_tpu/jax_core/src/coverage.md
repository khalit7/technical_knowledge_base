# Coverage of the old page ("JAX core: the functional model", saved in live.md)

Every claim of the old page, where this page carries it or why not. Corrections are also listed on the page (Reading, "What changed from the old page").

| Old claim | Status | Where now |
|---|---|---|
| Current as of JAX 0.11.2; minimum Python 3.11 | corrected: minimum 3.12 (0.11.0 dropped 3.11) | Reading, old-page section |
| JAX = numpy + composable transformations, each traces into a jaxpr then rewrites or compiles | corrected: only jit/make_jaxpr stage a whole jaxpr; grad and vmap interpret as Python runs (grad stages the tangent program) | Reading 2 and old-page section |
| PyTorch records eagerly; JAX runs once with tracers (shape+dtype, no data); torch.compile moved toward this | refined: under grad alone tracers hold the primal | Reading 2 (chain table) |
| Purity, explicit state, no param.grad | kept, owned by root Transforms lab section 4 | linked |
| print in jit prints tracers once; jax.debug.print | owned by root (Reading 2 and Transforms lab) | linked |
| Arrays immutable, .at[].set and friends; in-place under jit | kept; root owns the API | Reading 1 (link) |
| Python side effects only at trace time | root Transforms lab section 4 | linked |
| PRNG keys, split, never reuse, nnx.Rngs | kept and extended | Reading 9; code comment "PRNGKey; an array" corrected (key() returns a typed key) |
| Bitwise reproducibility; vmap/shard_map give each element or device its own key | kept, with partitionable mechanism from source | Reading 9 |
| jit compiles per (shape, dtype, static-arg) signature | corrected: also weak type, sharding, pytree structure and aux data, function identity | Reading 8, old-page section |
| Python scalars in control flow are compile-time constants | corrected: Python scalar arguments are traced (weak type) unless static | old-page section |
| Shapes always static; no data-dependent shapes; pad and mask | kept | Reading 1 (jnp vs NumPy table), 2 |
| TracerBoolConversionError; cond (both compiled), select/where, scan, while_loop (not reverse-diff), fori_loop | kept, measured | Reading 4, Control flow tab |
| scan cuts compile time vs unrolled loop | kept, measured (0.15 s vs 41 s at 1,000 steps) | Reading 4 |
| Recompilation, jax_log_compiles, bucketing | owned by root Transforms lab section 3 | linked |
| Async dispatch, block_until_ready, first call includes compile | kept, measured | Reading 1 |
| donate_argnums | owned by root Compiler lab / XLA child | linked |
| grad is source-to-source, not tape-based | corrected: trace-based linearize + transpose; residuals act as a tape | Reading 5 |
| value_and_grad, argnums, has_aux, grad(grad), jvp/vjp | kept (has_aux and argnums in root) | Reading 5 |
| stop_gradient = detach; checkpoint = remat | kept | Reading 5 |
| vmap, in_axes, per-example grads, ensembles over stacked params | kept and extended | Reading 7 |
| Pytrees, tree.map, leaves, flatten/unflatten replace parameters() and state_dict() | kept and extended | Reading 8 |
| Footguns 1 to 7 | kept (root has most with messages) | Mistakes section, root link |
| Footgun 8: OOB indexing does not raise under jit | corrected: does not raise eagerly either | old-page section |
| Footgun 9: TPU bf16 accumulation semantics | corrected: DEFAULT computes f32 matmuls in bf16 (input rounding, passes), per lax.Precision | Reading 1 |
| Footgun 10: weak typing differs subtly from NumPy | refined: NumPy 2 adopted weak scalars; remaining differences measured | Reading 1 |
| Resources: Thinking in JAX, tutorials, jit, gotchas, Autodidax | kept, times re-estimated; tutorials now "JAX 101" | Further reading |
| Scaling book ch. 10 "how a PyTorch person should read JAX code" | corrected: chapter is "Programming TPUs in JAX", about parallelism | Further reading (related) |
| Next: training stack page | kept | Further reading |
