# The running example: a tiny GPT

One model, defined once, used by every tab and child page of Topic: pytorch-ecosystem. Read only for everyone except the Inside one step tab, which owns it. Do not copy it into another folder: import it.

| File | What it is |
|---|---|
| `model.py` | `GPTConfig`, `GPT`, `make_model(cfg, device)`, `get_batch(cfg, step, device)`, `make_optimizer(model)`, `train_step(model, opt, x, y)`, `encode`/`decode`, `n_params` |
| `data.txt` | The fixed text: the first three paragraphs of *Alice's Adventures in Wonderland* (Lewis Carroll, 1865, public domain), 1,329 bytes, ASCII, transcribed (punctuation may differ slightly from a given edition) |
| `train.py` | A few-step training run that prints loss, step time and a greedy sample |

## The model

GPT-2 shape in plain PyTorch, nothing imported beyond `torch`:

- Character-level: vocabulary = the 43 distinct characters of `data.txt`.
- `tok` (43 x 256) and `pos` (64 x 256) embeddings, added.
- 4 blocks, each pre-LayerNorm: `x + attn(ln1(x))`, then `x + mlp(ln2(x))`.
  - attention: one `qkv` Linear (256 to 768), split into q, k, v views, 4 heads of 64, `F.scaled_dot_product_attention(is_causal=True)` (or written out with `attn="manual"`), `proj` Linear (256 to 256).
  - MLP: `fc` Linear (256 to 1024), GELU, `proj` Linear (1024 to 256).
- final `ln_f`, `head` Linear (256 to 43) **tied** to `tok.weight` (one Parameter, two uses).
- 3,186,944 parameters (tied weight counted once). GPT-2 init (normal 0.02, residual projections 0.02 / sqrt(2 x 4)).
- Batch: `B = 8` windows of `T = 64` characters, `get_batch(cfg, step)` seeded by the step number, so batch k is the same on every run.
- Optimizer: AdamW, lr 6e-4, betas (0.9, 0.95), weight decay 0.1 on matrices only. At torch 2.14.1 PyTorch picks the single-tensor for-loop implementation for CPU and MPS parameters (`_default_to_fused_or_foreach` returns `(False, False)`; foreach is the default only on CUDA-like devices).
- Switches in `GPTConfig`: `attn="sdpa"|"manual"`, `checkpoint=True` (activation checkpointing per block, `use_reentrant=False`), and any size field (`n_layer`, `d_model`, `block_size`, `batch_size`, ...).

## Use it

```python
import sys; sys.path.insert(0, "<root>/src/model")
import torch
from model import GPTConfig, make_model, get_batch, make_optimizer, train_step
cfg = GPTConfig()                      # or GPTConfig(n_layer=8, d_model=512) for a bigger variant
model = make_model(cfg, "cpu")         # seeded with cfg.seed (0)
opt = make_optimizer(model)
x, y = get_batch(cfg, step=0)          # (8, 64) int64 each
loss = train_step(model, opt, x, y)    # forward, backward, opt.step(), zero_grad(set_to_none=True)
```

`python train.py --steps 300 --threads 4` (the shared venv's python; add `--device mps`, `--checkpoint`, `--attn manual`).

## Reference numbers (measured on Apple M1 Pro, torch 2.14.1, 2026-10-12)

- Step 0 loss 3.8014 on CPU (ln 43 = 3.761 is the uniform-guess loss). Identical with `--checkpoint`.
- 300 steps at lr 6e-4: loss 0.546; greedy continuation of "Alice " = "Alice wether se the peank, and bured it witherat is, nad no pictur". (At lr 3e-3 the run stalls near 2.30.)
- Step time after warm-up, 4 CPU threads: about 22 to 25 ms; MPS about 18 ms (single quick runs while the machine had load average about 10; the tabs report proper timed runs under the bench lock).

The Inside one step tab records one full step of this model op by op (`src/step/`).
