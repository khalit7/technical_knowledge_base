# The running example of Topic: jax-and-tpu

Every tab of the root page works on the same tiny model, the same text and the same machine, so that a jaxpr in the Transforms lab, an HLO dump in the Compiler lab, a loss curve in the Training lab, a sharded weight in the Sharding lab and a matmul on the TPU roofline are all the same object. This folder holds the definition (this file), the model written three ways, the shared helper every script imports (`common.py`), the scripts that built and checked it, their small results (`equiv.json`, `env_check_*.json`) and the manifest of every artefact with size and sha256 (`manifest.json`). Large files (the text, the token arrays, weights, the venv, the pinned source clones) stay outside the repo, in the shared setup folder named by the environment variable `JX_SCRATCH`.

Built on 2026-10-15. Machine: Apple M1 Pro (10 CPU cores, 16 GB unified memory), macOS 27.0.1, **CPU only** (`JAX_PLATFORMS=cpu`; no MPS, no jax-metal), runs at low priority (`nice -n 15`, 4 threads) on a machine shared with other long jobs. Timings are rough and labelled "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority"; everything else here (shapes, parameter counts, numerical differences, loss values with a fixed seed) is deterministic.

## The model: a tiny GPT-style character LM, written three times

| | value | why |
|---|---|---|
| kind | decoder-only transformer, pre-LayerNorm, learned positional embeddings, untied output head, no dropout | the shape of every modern LLM, small enough to train on a laptop CPU in minutes; no dropout so runs are deterministic |
| vocabulary | 65 characters (char-level) | no tokenizer to install or explain; 65 is deliberately *not* a multiple of 8 or 128, which the Sharding and TPU labs use (uneven shards, MXU padding) |
| d_model | 128 | a multiple of 128, the MXU tile width that matters on TPU (the TPU lab gives the MXU size per generation); divisible by 2, 4 and 8 for sharding |
| layers | 4 | enough for scan vs unroll and per-layer sharding to show |
| heads | 4 (head dimension 32) | tensor parallelism over 4 devices puts one head on each |
| MLP width | 512 (4 x d_model), exact erf GELU | the Megatron column/row split example |
| context | 128 characters | attention matrices are 128 x 128 |
| parameters | **826,368** | 8,320 token embedding + 16,384 positional + 4 x 198,272 per block + 256 final LayerNorm + 8,320 head |
| batch | 32 sequences x 128 = 4,096 characters per step | |

Per block: four 128 x 128 attention projections with biases (4 x 16,512), MLP 128 x 512 and 512 x 128 with biases (66,048 + 65,664), two LayerNorms (4 x 128). All weights float32.

Files:
- `model_torch.py`: PyTorch `nn.Module` (`TinyLM`), `loss_fn`, `make_optimizer` (AdamW with two parameter groups and a LambdaLR warmup), `train_step`, `state_numpy` (the state dict as numpy arrays: the interchange format).
- `model_nnx.py`: Flax NNX (`TinyLM(nnx.Module)`), `from_torch(model, sd)` copies PyTorch weights in place, `to_torch_names(model)`, `make_optimizer` (`nnx.Optimizer(model, tx, wrt=nnx.Param)`), `train_step` (`@nnx.jit`, `nnx.value_and_grad`, `optimizer.update(model, grads)`).
- `model_jax.py`: plain JAX + optax, no Flax. Parameters are a nested dict (a pytree); `apply(params, idx, cfg)` is a pure function (Python loop over layers, unrolled when traced); `stack_blocks` + `apply_scan` run the same layers with `lax.scan` (identical logits, max difference 0.0); `from_torch`, `to_torch_names`, `init_params(cfg, key)` (JAX RNG, same distributions); `make_optimizer` (optax chain) and `make_train_step(cfg, tx)` (a `jax.jit` with `donate_argnums=(0, 1)`, returning params, optimizer state, loss and gradient norm). This is the version the Transforms and Compiler labs trace and lower.
- `common.py`: `CFG` (every size and hyperparameter), `tokens()`, `batch(step)`, `encode`/`decode`, `lr_at(step)`, `decay_mask_name`.

Conventions that differ between the frameworks, all set explicitly so the twins agree (each is a "port from PyTorch" pitfall the Training lab can show):
- Linear weight layout: PyTorch `[out, in]`, Flax `kernel` and the plain-JAX `w` are `[in, out]`; transfer transposes.
- LayerNorm epsilon: PyTorch default 1e-5, `nnx.LayerNorm` default 1e-6; both set to 1e-5.
- GELU: `torch.nn.functional.gelu` defaults to exact erf, `jax.nn.gelu` defaults to the tanh approximation (`approximate=True`); both exact here.
- Initialisers: PyTorch `nn.Linear` uses kaiming_uniform(a=sqrt(5)), Flax `nnx.Linear` lecun_normal; both twins use GPT-2-style N(0, 0.02) weights, zero biases, LayerNorm scale 1 and bias 0, and the equivalence runs copy the exact PyTorch tensors into JAX.
- Weight decay: `torch.optim.AdamW` decays every parameter it is given; `optax.adamw` decays every leaf unless given `mask`. Both decay the 25 two-dimensional Linear weights only (24 in the blocks plus the head), not biases, LayerNorms or embeddings.
- Gradient clipping: `torch.nn.utils.clip_grad_norm_` scales by `max_norm / (norm + 1e-6)` when that is below 1; `optax.clip_by_global_norm` scales by `max_norm / norm` when `norm > max_norm`. The 1e-6 differs. In this run clipping is active in 221 of the 500 steps (gradient norm 4.6 at step 0; between 0.90 and 1.44 over the last 50 steps), and the extra 1e-6 changes the scale by about one part in a million, the size of float32 rounding.
- Learning rate schedule: the same function in both (`lr_at`): linear warmup over 50 steps to 1e-3, then constant. PyTorch `LambdaLR` evaluates it at step 0 for the first update, optax passes the update count starting at 0: the same values.

## The data: TinyShakespeare, character level

- Source: `input.txt` of karpathy/char-rnn at commit 6f9487a6fe5b420b7ca9afb0d7c078e37c1d1b4e: https://raw.githubusercontent.com/karpathy/char-rnn/6f9487a6fe5b420b7ca9afb0d7c078e37c1d1b4e/data/tinyshakespeare/input.txt . 1,115,394 bytes (printable ASCII plus newlines), sha256 `86c4e6aa9db7c042ec79f339dcb96d42b0075e16b8fc2e86bf0ca57e2dc565ed`, downloaded 2026-10-15. Shakespeare's plays (public domain); the char-rnn repository is MIT-licensed.
- Vocabulary: the 65 distinct characters, sorted (`vocab.json`, in the repo).
- Split: first 1,003,855 characters train, last 111,539 (10%) validation, as uint8 arrays `$JX_SCRATCH/data/train.bin` and `val.bin` (`prepare_data.py`).
- Batch order: `common.offsets()` draws every sequence start from numpy's `default_rng(0)` (validation: seed 1) once, as an array `[steps, 32]`; `common.batch(step)` slices 129 characters per row and returns int32 inputs and next-character targets. Framework-free, so PyTorch and JAX see bit-identical batches. Validation loss is the mean over 8 fixed validation batches (`batch(i, "val", n_steps=8)`).

## How to load

```sh
export JX_SCRATCH=<the shared jax-and-tpu setup folder>   # holds venv/, data/, src/, SETUP.md, FACTS.md
cd <root>/src/data
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B your_script.py
# 8 simulated devices for sharding:
XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B your_script.py
```

```python
import os, sys; sys.path.insert(0, "<root>/src/data")   # -I drops the script folder from sys.path
import numpy as np, jax, common as C, model_jax as MJ, model_nnx as MN, model_torch as MT
sd = dict(np.load(C.path("data", "init_torch.npz")))     # the shared initial weights, PyTorch names and layout
params = MJ.from_torch(sd, C.CFG)                        # plain-JAX pytree
model = MN.from_torch(MN.make_model(C.CFG), sd)          # Flax NNX module
x, y = C.batch(0)                                        # int32 [32, 128] each
logits = MJ.apply(params, x, C.CFG)                      # [32, 128, 65]
```

Artefacts in `$JX_SCRATCH/data/`: `tinyshakespeare.txt`, `train.bin`, `val.bin`, `init_torch.npz` (initial weights, seed 0), `final_torch_500.npz` and `final_jax_500.npz` (weights after the 500-step runs, PyTorch names and layout). Sizes and sha256 in `manifest.json`.

## Equivalence check (`check_equiv.py`, `check_final.py`; results in `equiv.json`)

All three implementations start from the same PyTorch-initialised weights (seed 0), float32, CPU.

**Same input, same outputs** (training batch 0):

| comparison | max absolute difference |
|---|---|
| logits PyTorch vs plain JAX | 8.3e-7 (largest logit 1.11) |
| logits PyTorch vs Flax NNX | 8.3e-7 |
| logits plain JAX vs NNX | 7.2e-7 |
| logits plain JAX: Python loop vs `lax.scan` | 0.0 |
| loss PyTorch vs JAX | 0.0 (both 4.211680; a uniform guess is ln 65 = 4.1744) |
| gradients PyTorch vs JAX, all parameters | 2.5e-7 absolute; worst relative 2.8e-6 (`blocks.2.attn.wo.weight`, relative to that parameter's largest gradient) |

The key biases (`attn.wk.bias`) are left out of the relative figure: their true gradient is exactly zero. Adding the same vector b to every key adds the same number q.b to every score in a row, and softmax ignores a constant added to a whole row. Both frameworks compute about 2e-11 (float noise; the largest gradient anywhere is 0.53).

**Same training, same curves:** 500 steps of AdamW on identical batches.

| | step 0 | step 100 | 200 | 300 | 400 | 500 |
|---|---|---|---|---|---|---|
| validation loss, PyTorch | 4.2183 | 2.4806 | 2.3605 | 2.2635 | 2.1616 | 2.0692 |
| validation loss, plain JAX | 4.2183 | 2.4806 | 2.3605 | 2.2635 | 2.1616 | 2.0691 |
| validation loss, NNX | 4.2183 | 2.4806 | 2.3605 | 2.2635 | 2.1616 | 2.0692 |

(Training loss at step 499: PyTorch 2.017382, JAX 2.017369. Full per-step loss and gradient-norm curves for all three are in `equiv.json` under `train`.)

- Training loss, maximum absolute difference over the 500 steps: PyTorch vs JAX 2.9e-5, PyTorch vs NNX 2.8e-5, JAX vs NNX 9.5e-7. Up to step 311 the PyTorch and JAX curves agree to within 8e-6 at every step (losses are stored rounded to 6 decimals; float32 spacing near a loss of 2 is about 2.4e-7); the first step where they differ by more than 1e-5 is step 312.
- Why the drift: the two frameworks add up the same numbers in different orders (different matmul kernels, fusions and reductions), so each step differs in the last bits; training is a chaotic iteration, and those differences compound slowly. JAX and NNX lower to nearly the same XLA program, so they stay closest.
- Final weights: the largest difference is in the key biases (1.5e-3 in block 0), because Adam divides each update by the running root-mean-square of the gradient: a gradient of pure float noise is normalised into steps as large as the learning rate, in a random direction that differs between frameworks. They cannot affect the output: putting JAX's key biases into the PyTorch model, or zeroing them, changes the logits by at most 1.4e-5 and 1.3e-5 (float noise; largest logit 12.46). Every other weight differs by at most 2.9e-5 (`blocks.3.attn.wq.weight`), after weights moved up to 0.32 from their initial values. The final logits of the PyTorch and JAX models differ by up to 5.3e-3.

**Step time** (measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority, 1-minute load average 13.0 to 8.7 during the run; median of steps 10 to 499): PyTorch 0.073 s, plain JAX 0.102 s, NNX 0.115 s. The first JAX and NNX steps took 1.11 s and 1.08 s, almost all of it tracing and compilation (PyTorch's first step 0.073 s: eager mode has nothing to compile). Do not read these as a framework comparison: the model is tiny, the machine was loaded, and on CPU each framework calls a different matmul library.

## Environment check (`env_check.py`; results in `env_check_1dev.json`, `env_check_8dev.json`)

- Versions (Python 3.12.11): jax 0.11.2, jaxlib 0.11.2, flax 0.12.10, optax 0.2.8, orbax-checkpoint 0.12.7, grain 0.2.18, equinox 0.13.8, chex 0.1.92, numpy 2.5.4, torch 2.14.1, xprof 2.23.2.
- Devices: `[CpuDevice(id=0)]` by default; with `XLA_FLAGS=--xla_force_host_platform_device_count=8`, 8 CPU devices (`cpu:0` to `cpu:7`). A jitted matmul with x sharded `P("data", None)` and W sharded `P(None, "model")` on a `(2, 4)` mesh ran correctly (per-device shards x [16, 128], W [128, 128]); its compiled HLO holds 2 all-reduce ops (for the final sum). The compiled HLO, collectives and per-device shapes are real; the speeds of collectives between simulated devices on one CPU are not those of ICI or NVLink.
- `jax.shard_map` (top level) with `psum` ran correctly on 1 and 8 devices. In jax 0.11.2 an input that is not already sharded as `in_specs` says is **refused** (`ValueError: in_specs passed to shard_map: P('i',) does not match the specs of the input: P(None,)`; the message suggests `jax.reshard`); put it on the mesh first with `jax.device_put(x, NamedSharding(mesh, P("i")))`. `jax.experimental.shard_map` still imports with a DeprecationWarning ("deprecated in v0.8.0").
- Pallas: `jax.experimental.pallas` imports; `pallas_call(..., interpret=True)` runs on CPU: an elementwise add (exact) and a 256 x 128 by 128 x 256 matmul tiled with a (2, 2) grid of 128 x 128 `BlockSpec`s (max error 0.0 against `a @ b`). Without `interpret=True` it fails on CPU: `ValueError: Only interpret mode is supported on CPU backend.` `jax.experimental.pallas.tpu` imports.
- Profiler: `jax.profiler.trace(dir)` writes `plugins/profile/<timestamp>/<host>.xplane.pb` and `<host>.trace.json.gz` on CPU. With xprof 2.23.2 installed, `xprof.convert.raw_to_tool_data.xspace_to_tool_data` turns the CPU trace into trace_viewer, hlo_stats, framework_op_stats, op_profile, overview_page and memory_profile JSON; graph_viewer fails ("Can not load hlo proto from options."). Profiles contain the host name: never embed them unscrubbed.
- `compile().cost_analysis()` and `memory_analysis()` work on CPU (fields include argument, output, temp, alias, generated code and peak memory sizes).
- XLA CPU thread flags: `--xla_cpu_multi_thread_eigen=false intra_op_parallelism_threads=4` are accepted without error but made no measurable difference to a 2048 x 2048 matmul (user/real CPU time about 3.1 to 3.2 with and without); `nice -n 15` is what keeps runs polite.

## Regenerating

```sh
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B prepare_data.py   # vocab.json, train.bin, val.bin
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B env_check.py      # and again with the 8-device XLA_FLAGS
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B check_equiv.py    # about 4 minutes; JX_STEPS=20 for a quick run
nice -n 15 $JX_SCRATCH/venv/bin/python -I -B check_final.py
$JX_SCRATCH/venv/bin/python -I -B make_manifest.py
```
