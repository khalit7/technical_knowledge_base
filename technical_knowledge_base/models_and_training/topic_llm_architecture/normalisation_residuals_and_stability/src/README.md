# Source of "Normalisation, residuals and stability: pre-norm, RMSNorm, QK-norm, initialisation, loss spikes"

Child page 6 of Topic: llm-architecture (page prefix `ns`, storage key `ns-tab`). Built 2026-10-19 on an Apple M1 Pro.

## Build
`sh build.sh` writes `../index.html` from `parts/` (the root's build, with the Reading parts globbed in byte order),
then runs `fill.py`, which replaces every `{%key%}` placeholder with the value in `out/page_numbers.json`, expands the
link macros that arrive inside those values, and fills the reading time. `make_page_data.py` (which execs
`page_text.py`) writes `parts/22_js_ns_0data.js` (`window.NSD`) and `out/page_numbers.json` from `out/` and the root's
Block lab runs; run it before `build.sh`. Every number in the prose therefore comes from a recorded file.

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles) to `20_read_n`, `20_read_z`; `22_js_ns_0data.js`, `22_js_ns_1core.js` (NSC chart helpers), `23_js_ns_spike.js` (the before/after animation), `23_js_ns_code.js` (code quotes with checked line numbers), `23_js_ns_drill.js` | sections 0 to 9, mistakes, interview |
| Stability explorer `t-stab` | `31_tab_stab.html`, `31_js_st_ui.js` | learning rate x placement x QK-norm grid of recorded runs, up to three overlaid: held-out loss, largest attention logit, gradient norm, log Z |
| Residual stream `t-resid` | `32_tab_resid.html`, `32_js_rs_ui.js` | the running sequence through four placements, at init and trained, stepped sub-layer by sub-layer; largest entries |
| Further reading `t-more` | `39_tab_more.html` | |

## Runs and scripts (outputs in `out/`; everything the page needs is in the repo)
| Script | Runs on | Output |
|---|---|---|
| `runs/ns_model.py` | library | patches the shared tiny GPT at import (src/data is read-only): output-norm placement (OLMo 2), attention soft-cap, a probe that records per-layer largest attention logit, entropy, mean q and k norms, and a flat-init switch |
| `runs/ns_train.py` | MPS, about 5.5 min per run | the root's `train.py` loop plus every-step loss and gradient norm, the probe every 10 steps on 8 fixed held-out windows, z-loss and final soft-cap options; reproduces the Block lab (pre-norm lr 3e-3: 2.2788 here, 2.2811 in the Block lab, 2.278 for the root's reference) |
| `runs/queue1.sh`, `runs/queue2.sh` | MPS, detached, one run per bench-lock hold | checkpoints and logs in scratch `runs/ns_*` |
| `runs/collect_runs.py` | CPU | copies every `ns_*` log into `out/runs/` |
| `runs/ns_normbench.py` | MPS and CPU, seconds | `out/normbench_{mps,cpu}.json`: LayerNorm against RMSNorm, forward plus backward |
| `analysis/inspect_runs.py` | CPU, seconds | `out/inspect/*.json`: the stream after every sub-layer (stepped by hand per placement, checked against the model's logits), largest entries, attention logits and entropy, at init and trained |
| `analysis/mistakes.py` | CPU, seconds | `out/mistakes.json`: final norm dropped, gain off by one, LayerNorm read as RMSNorm, eps 1.0, QK-norm dropped; nn.RMSNorm default eps |
| `analysis/hc_toy.py` | CPU, under a second | `out/hc_toy.json`: products of unconstrained against doubly stochastic stream-mixing matrices (illustrative) |
| `code/code_refs.py <transformers checkout>` | CPU | `out/code_refs.json`: every quoted line located by pattern (transformers v5.20.1, commit 0ea877911a; the root's tiny_gpt.py) |
| `check_data.py`, `check_controls.mjs` | checks | data equals a regeneration and the logs; typed numbers equal their sources; Notion ids exist; every control at 390 px dark and 920 px light |

Reused, not rerun: the Block lab's eight pre/post runs (`../../src/block/out/runs`, `gradnorm.json`), the transformer
from zero child's ablations (`../../the_transformer_from_zero/src/train/out/runs`), the Attention variants child's
gate and MHA runs (`../../attention_variants/src/out/runs_eval.json`), the Inside lab's facts (`../../src/inside/out/facts.json`),
and the root's reference checkpoint `ref_baseline_s1500` (scratch).

Rerun order: `queue1.sh`, `queue2.sh` (or each `ns_train.py` line by hand under the bench lock), `collect_runs.py`,
`analysis/inspect_runs.py --init {pre,post,sandwich,output}` and `--init pre --flat`, `analysis/inspect_runs.py
ref_baseline_s1500 at_mha ns_post_lr1e-3 ns_sand_lr3e-3 ns_out_lr3e-3 ns_flat_lr3e-3`, `analysis/mistakes.py`,
`analysis/hc_toy.py`, `runs/ns_normbench.py --device cpu`, `code/code_refs.py`, `make_page_data.py`, `build.sh`,
`check_data.py`, `node check_controls.mjs` (from the repo root).

## Departures from the page-kind shape, and why
- **The basics are not repeated.** The ML-fundamentals Normalisation page derives every norm, Xiong et al.'s theorem,
  init schemes and muP, and measures six released models; its parent's "When training goes wrong" tab sweeps a
  character-level transformer with and without QK-norm and z-loss. This page links them and adds what they cannot:
  controlled runs of every placement and fix on one transformer at an equal budget, production choices read from
  code, and hyper-connections.
- **The Block lab's pre/post animation is not rebuilt.** The Residual stream tab adds the two placements in use since
  2024 (sandwich and output norm), the init switch and the largest single entry.
- **The before/after animation is a training run**, not a forward pass: the same batches with and without one fix,
  replayed from the every-10-steps probe.
- **mHC is published only plus a random-matrix calculation**: a hyper-connection model on MPS would not show the
  instability, which in the paper appears at 27B after 12k steps.
