# Reading tab: TODOs

Each item is a dashed box on the page (id in brackets) or a null in `../parts/22_js_rd_data.js`, to be filled from a lab's own output once it exists; `check_read.mjs` lists the boxes still on the page.

| # | Where | What is needed | From |
|---|---|---|---|
| 1 | Section 0 (`rd-todo-ex`) | The running example: model size, parameter count, data, the PyTorch/JAX equivalence result | root `src/data/README.md` (setup) |
| 2 | `RDJ.models[0].p` | Running example parameter count (memory widget preset) | setup |
| 3 | `RDJ.trace` | Primitives in the train step's jaxpr; fusions in the optimised HLO; kernels launched per eager step by the PyTorch twin (torch profiler) | Compiler lab (and Training lab for the torch count) |
| 4 | `RDJ.xla` (section 3 strip) | Train step at each stage: jaxpr primitives, StableHLO ops, optimised HLO ops and fusions, compile time cold and cached, memory with and without donation | Compiler lab |
| 5 | Section 4 `<!--CODE:step-->` | The running example's JAX train step, as run, with its output | setup's model_nnx.py / functional train_step |
| 6 | Section 5 (`rd-todo-coll`) | Collectives found in the compiled HLO per strategy, their bytes, per-device parameter bytes, loss equality | Sharding lab |
| 7 | Section 6 (`rd-todo-pallas`) | Kernels written in interpret mode and their agreement with jnp | TPU and Pallas lab |
| 8 | Section 7 (`rd-todo-mfu`) | MaxText's published MFU table, dated, with slice | pinned MaxText clone or codebases child |
| 9 | Section 8 twin row | Filled from setup's 500-step equiv.json (val 2.0692 PyTorch, 2.0691 JAX; curves within 2.9e-5; step times) via make_read_data.py | done |
| 10 | Mistakes (`rd-todo-donate`) | memory_analysis with and without donation | Compiler lab |
| 11 | Interview (`rd-todo-port`) | Defaults that differed between the twins, confirmed in pinned source | setup equivalence check, Training lab |
| 12 | Further reading (`rd-todo-free`) | Colab, Kaggle, TRC facts | TPU and Pallas lab FACTS |
| 13 | Further reading lab times (`data-rd-lab`) | Each lab tab's reading time | each tab's word count at 200 a minute |
| 14 | Section 2 and Mistakes code | Run `run_examples.py` in the shared venv, then `make_read_data.py` | shared venv (READY) |
| 15 | Section 8 "same key, same numbers on any device count" | Confirm with 8 simulated devices (jax_threefry_partitionable default) | run here |
