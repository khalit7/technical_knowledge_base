# Training lab (tab `t-train`, prefix `tr`)

The training stack and the PyTorch-to-JAX port, run on the root's running example (`../data/README.md`). Page parts: `../parts/33_tab_train_{a..g}.html` and `../parts/33_js_tr_*.js`. All runs: Apple M1 Pro, CPU only, shared venv (`$JX_SCRATCH/venv`: jax 0.11.2, flax 0.12.10, optax 0.2.8, orbax-checkpoint 0.12.7, grain 0.2.18, equinox 0.13.8, torch 2.14.1, plus dm-haiku 0.0.17 and jmp 0.0.4 added by this lab), `nice -n 15`, 4 threads. Large artefacts (final weights, checkpoints) stay in `$JX_SCRATCH/train/`.

| script | what it measures | output |
|---|---|---|
| `run_twin_long.py` | PyTorch, plain JAX and NNX trained 4,000 steps side by side (setup's 500 extended); losses, validation every 250 steps, weight/logit drift every 500, step times | `out/twin_long.json` (also answers the Reading tab's longer-twin TODO) |
| `frameworks.py` | the transformer block in PyTorch, NNX, Linen, Equinox, Haiku, same weights and input; source of each via `inspect` | `out/frameworks.json` |
| `optax_check.py` | `optax.adamw` vs `torch.optim.AdamW` on the same 50 real gradients (matched, defaults, weight decay only); reference outputs for the chain builder (132 combinations) | `out/optax_check.json`, `out/chain_ref.json` |
| `check_chain.mjs` | the page's JavaScript optax (`33_js_tr_0opt.js`) against `chain_ref.json` | `out/chain_check.json` |
| `pitfalls.py` | 300 steps with one porting mistake at a time (epsilon, GELU, missing transpose, Flax init, decay mask, optax wd default, b2 default) | `out/pitfalls.json` |
| `ckpt_resume.py` | orbax + grain: stop at step 100, resume in a new process, compare with an uninterrupted run (three processes) | `out/ckpt_resume.json` |
| `ckpt_sharded.py` | 8 simulated devices: save sharded on a 2x4 mesh, restore 8-way on the other axis and on one device | `out/ckpt_sharded.json` |
| `mixed.py` | f32 vs bf16 compute with f32 master (jmp policy) vs bf16 everywhere, 300 steps | `out/mixed.json` |
| `nnx_tour.py` | every short snippet shown on the tab, with its printed output | `out/snippets.json` |
| `torch_ops.py` | ATen operator calls in one eager PyTorch training step (for the Reading tab's eager vs compiled comparison; not shown on this tab) | `out/torch_ops.json` |
| `make_train_data.py` | builds `../parts/33_js_tr_0data.js` (window.TRD) from `out/` and the model files | |
| `check_train.mjs` | puppeteer: every control at 390 px dark and 920 px light, errors, NaN/undefined, sideways scroll; embedded data equals `out/`; prose numbers equal data | screenshots in `$JX_SCRATCH/train/shots` |

Regenerate (each from this folder, `JX_SCRATCH` set):
```sh
P="JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B"
env $P run_twin_long.py      # 25 to 90 minutes depending on load
env $P frameworks.py; env $P optax_check.py; env $P pitfalls.py; env $P ckpt_resume.py; env $P mixed.py; env $P nnx_tour.py
XLA_FLAGS=--xla_force_host_platform_device_count=8 env $P ckpt_sharded.py
node check_chain.mjs && python3 make_train_data.py && sh ../build.sh && node check_train.mjs
```

Departures from the topic-page method: this is a lab tab of a root page, so it carries measurement depth the Reading tab links to; the child pages (training_stack, pytorch_to_jax) will own the long-form explanations.
