# How this page is built

`sh build.sh` runs `make_page_data.py` (recorded outputs to `parts/22_js_tz_0data.js` and `page_text.json`),
concatenates `parts/`, expands `{{text|link}}` macros, then `fill.py` resolves the `[[...]]` placeholders (facts, code
snippets with their real line numbers, step outputs, file:line references), and prints the Reading time.
Prefix `tz` (Reading `tz-`, Build it up `tzb-`, Ablation explorer `tza-`, Shape drill `tzd-`); storage key `tz-tab`.

## The code that produced every number
- `zero/gpt_zero.py`: the model, written in nine marked steps. With default switches it is the root's tiny GPT
  baseline exactly (same modules in the same order: seed 0 gives identical initial weights; the root's trained
  checkpoint gives identical logits). Switches `pos`, `resid`, `norm`, `attn`, `ffn`, `n_head`, `swiglu` are the ablations.
- `zero/steps.py` (CPU): each step's test on the running sequence -> `zero/out/steps.json` (shapes, printed output, code).
- `zero/mistakes.py` (CPU): real error messages, silent bugs on the trained model, the unshifted-target run -> `out/mistakes.json`.
- `zero/accounting.py` (CPU): parameters by hand vs the code for every variant; FLOPs by hand vs FlopCounterMode;
  the formula on 9 real configs vs Hub safetensors counts and local safetensors headers -> `out/accounting.json`.
- `zero/code_refs.py <nanoGPT> <transformers>`: file:line of each quoted pattern (nanoGPT 3adf61e, transformers v5.20.1).
- `train/train_zero.py` (MPS): the root's `src/data/train.py` loop (imports its batches and held-out windows) with this
  file's model. `train/eval_zero.py`: the root's eval.py for this model (`--tiny` loads tiny_gpt checkpoints; it
  reproduces eval.py's numbers and samples exactly on ref_baseline_s1500).
- `train/curve.py` (CPU): unigram and bigram cross-entropy floors from counts, snapshots of the Inside lab's baseline
  retrain (`$LA_SCRATCH/runs/in_snap`), sampling logits and samples -> `train/out/{curve,sampling}.json`.
- `train/collect_runs.py`: trimmed logs and evaluations of `tz_*` runs and four reference runs -> `train/out/runs/`.
- Checks: `check_data.py` (page data equals the recorded files, prose numbers, drill JS equals accounting.py),
  `check_controls.mjs` (every control at 390 px dark and 920 px light, reduced motion).

## Runs (Apple M1 Pro, MPS, under the bench lock, one per hold; about 5 min each)
```
export LA_SCRATCH=<scratch>/la PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4
python train/train_zero.py --name tz_base
python train/train_zero.py --name tz_noresid --set resid=False      # also --lr 1e-3 as tz_noresid_lr1e-3
python train/train_zero.py --name tz_nonorm --set norm=False        # also --lr 1e-3 as tz_nonorm_lr1e-3
python train/train_zero.py --name tz_nopos --set pos=False
python train/train_zero.py --name tz_1head --set n_head=1           # and --seed 1 as tz_1head_s1
python train/train_zero.py --name tz_noffn --set ffn=False
python train/train_zero.py --name tz_noattn --set attn=False
python train/eval_zero.py <name> --device mps; python train/collect_runs.py
```
Then on CPU: `zero/steps.py`, `zero/mistakes.py`, `zero/accounting.py`, `train/curve.py`; `sh build.sh`; `python3 check_data.py`.

## Departures from the page-kind shape
- No Python/JS live model: the stepper shows the real file and its real outputs instead (the AIAYN paper page
  already runs a toy transformer in the browser).
- The root Block lab's walkthrough, FLOPs calculator and pre/post-norm runs are linked, not rebuilt; this page's
  baseline numbers are reproduced against them (2.2757 here, 2.2776 and 2.2811 there).
