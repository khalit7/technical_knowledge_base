# Block lab (`t-block`, prefix `bl`)

One token of the running sequence ("o" at position 157, in "Why are you sad, Ro|xy") through one decoder block of
the trained tiny GPT, with the shape, parameters and FLOPs of every step; where the FLOPs go against context; and
pre-norm against post-norm trained with the same seed and budget. Parts: `parts/31_tab_block_{a,b,c,d}.html`,
`parts/31_js_bl_{0data,1core,2walk,3flops,4norm,5drill}.js`.

## Files
- `trace.py <run> [--init]` (CPU): re-runs every block step by step and records each intermediate for the traced token,
  plus residual-stream norms after the embedding and every sub-layer for all 256 tokens; asserts its logits equal the
  model's forward (max abs error 1.5e-5 for the reference run). `--init` keeps only norms (a fresh model, seed 0).
- `flops.py` (CPU): `FlopCounterMode` on one forward (record=True, the explicit attention path the counter sees) and
  one forward plus backward, for the baseline, swiglu and gqa2 presets; checks the hand formula (exact match).
- `gradnorm.py <runs...>` (CPU): gradient norm per block on 8 fixed held-out windows, initial and trained weights.
- `mistakes.py` (CPU): four silent one-line attention bugs on the trained model (loss and greedy continuation), four
  real error messages, and a masked against unmasked training probe (not shown on the page: see viz_ideas.md).
- `code_refs.py <transformers checkout>`: finds each step in `modeling_llama.py` at v5.20.1 by pattern.
- `collect_runs.py`: copies trimmed training logs of `bl_*` runs from the scratch run folder to `out/runs/`, and the
  unigram cross-entropy of the held-out split (`out/unigram.json`).
- `make_page_data.py`: writes `parts/31_js_bl_0data.js` (`window.BLD`; vectors int8 with one scale each, attention rows
  uint8). `BL_PRE` / `BL_POST` name the pre-norm and post-norm runs compared in the norm animation.
- `check_page_data.py`: page data equals the regenerated part; prose numbers equal the recorded and calculated values.
- `check_controls.mjs`: puppeteer, every control at 390 px dark and 920 px light, reduced motion.
- `queue.sh` lives in scratch (GPU runs, one per bench-lock acquisition); the runs are listed in the tab's section 8.

## Rebuild
```sh
export LA_SCRATCH=<scratch>/la; PY=$LA_SCRATCH/venv/bin/python
# GPU (under the bench lock, both MPS watermark variables): from src/data/
#   train.py --preset {baseline|postnorm} --name bl_{pre|post}_lr<lr> --lr <lr> [--warmup N] --eval_every 100
cd src/block
$PY collect_runs.py
$PY trace.py ref_baseline_s1500; $PY trace.py ref_baseline_s1500 --init
$PY trace.py bl_pre_lr1e-3 --norms; $PY trace.py bl_post_lr1e-3 --norms; $PY trace.py bl_post_lr1e-3 --init; $PY trace.py bl_post_lr3e-3 --norms
$PY gradnorm.py ref_baseline_s1500 bl_post_lr3e-3 bl_pre_lr1e-3 bl_post_lr1e-3
$PY flops.py; $PY mistakes.py; python3 code_refs.py <transformers checkout at v5.20.1>
python3 make_page_data.py && sh ../build.sh && python3 check_page_data.py
```

## Departures from the brief
- Values in the walkthrough are always the tiny GPT's; the model selector switches shapes and counts to a real
  config (through window.CC) rather than tracing a real model (the Inside tab owns real-model internals).
- The FLOP split uses the Config calculator's weight and attention totals and only divides them by operation, so
  the two tabs cannot disagree; the measured anchor is PyTorch's counter on the tiny GPT.
