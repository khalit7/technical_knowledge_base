# Source of "Tensors, the dispatcher and autograd"

Child 1 of Topic: pytorch-ecosystem. Goes deeper than the root's Reading sections 1 to 4 and its Inside one step tab (which records one whole training step; this page does not rebuild it, it links it). Imports the root's running example (`../../src/model/`), never copies it.

## Rebuild

With the shared venv's python (torch 2.14.1) as `PY`, from `src/exp/`, and `SRC` a directory holding the v2.14.1 files listed in `quotes.py` and `dispatch.py` (fetched from `https://raw.githubusercontent.com/pytorch/pytorch/v2.14.1/<path>`):

```sh
PY tensors.py > ../inputs/tensors.json
PY dispatch.py $SRC > ../inputs/dispatch.json      # also reads native_functions.yaml / derivatives.yaml from $SRC
PY autograd_graph.py > ../inputs/engine.json
PY autograd_lab.py > ../inputs/autograd.json
PY module_loop.py > ../inputs/module.json
PY dataloader.py > ../inputs/dataloader.json
PY howto.py   (inputs/howto.json holds this script and its output; see the comment at its end)
python3 quotes.py $SRC > ../inputs/sources.json
PY timing.py > ../inputs/timing.json               # the only timed script: hold the bench lock
python3 sanitize.py ../inputs/*.json               # strips build-machine and local paths from error texts
cd .. && python3 build_data.py && sh build.sh && python3 check_data.py
```

Everything except `timing.json` is deterministic, except where the page says otherwise (MPS runs are not bit-repeatable: measured and reported).

## Files

- `exp/tensors.py`: 36 tensors on three arange bases plus the running example's q, k, v; errors; channels_last; promotion grid and cases; finfo; version counters; metadata; pinned memory.
- `exp/dispatch.py`: key priorities, TLS sets per context, key sets of 12 tensor kinds, dispatch tables, slot statistics over all 3,113 aten ops, the instrumented custom-op walk in 8 situations, aten calls seen at the top and at the Python key in 4 contexts, the autograd fallback, schemas and YAML entries, autocast on the running example (CPU bf16, MPS bf16 and fp16), functionalization graphs, meta and fake tensors.
- `exp/autograd_graph.py`: one block's graph, saved tensors, recorded backward order, aten calls per node; plain, offload hooks and checkpointed on CPU and MPS; the engine's scheduling rule re-run (matches the record in all variants).
- `exp/autograd_lab.py`: the 14 version-counter cases, hooks order, retain/create graph, a custom Function with gradcheck, anomaly mode, grad modes, checkpoint variants on the whole model, reentrant gotchas, engine threads.
- `exp/module_loop.py`, `exp/dataloader.py`: registration, saving and loading with tied weights, strict loading, forward hooks, zero_grad, accumulation, clipping, AMP and fp16 underflow counts, GradScaler, determinism, worker seeding, pin_memory.
- `build_data.py` writes `parts/22_tda_data.js`; `check_data.py` checks the embedding equals the inputs and every prose number is in the data (or a listed constant).
- `viz_ideas.md`, `coverage.md`.

## Shape

Follows the child-page method (Part B): Reading by the subject's own order (tensor, dispatcher, autograd, module and loop), then labs. Departures: no "in production" section (the subject is the runtime itself); four lab tabs instead of one or two, because the brief asked for a stride explorer, a dispatcher walker, an engine stepper and a version-counter lab, and each needs room.
