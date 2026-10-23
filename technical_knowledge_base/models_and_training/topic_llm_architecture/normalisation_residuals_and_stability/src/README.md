# Source of "Normalisation, residuals and stability: pre-norm, RMSNorm, QK-norm, initialisation, loss spikes"

Child page 6 of Topic: llm-architecture (page prefix `ns`, storage key `ns-tab`). Built 2026-10-19 on an Apple M1 Pro; rebuilt 2026-10-23 to the teaching contract (editing only, no new runs).

## Build
`sh build.sh` writes `../index.html` from `parts/` (the root's build, with the Reading parts globbed in byte order),
then runs `fill.py`, which replaces every `{%key%}` placeholder with the value in `out/page_numbers.json`, expands the
link macros that arrive inside those values, and fills the reading time from `out/reading_time.json`, which
`reading_time.mjs` measures on the rendered page (230 words a minute, closed details apart, as `html_utils/audit_pages.mjs`
counts). After a text change: `sh build.sh`, `node src/reading_time.mjs` (from the repo root), `sh build.sh`. `make_page_data.py` (which execs
`page_text.py`) writes `parts/22_js_ns_0data.js` (`window.NSD`) and `out/page_numbers.json` from `out/` and the root's
Block lab runs; run it before `build.sh`. Every number in the prose therefore comes from a recorded file.

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles), `20_read_b` (nav; the idea in one sentence, hero, you need, new terms, running example), `20_read_c` to `20_read_k` (sections 1 to 9), `20_read_l` (mistakes and interview rehearsal, closed), `20_read_z`; JS: `21_js_rd_common.js` (the skill template, never autoplays), `22_js_ns_0data.js`, `22_js_ns_1core.js` (NSC chart helpers), `23_js_ns_spike.js` (the before/after animation), `23_js_ns_code.js` (code quotes with checked line numbers), `23_js_ns_drill.js`, `24_js_ns_resid.js` (the four-placement stepper and the largest-entries table), `25_js_ns_figs.js` (hero, learning-rate chart, gradient by block, mean over RMS, log Z, spike flags) | sections 1 to 9 core with depth in closed blocks |
| Stability explorer `t-stab` | `31_tab_stab.html`, `31_js_st_ui.js` | learning rate x placement x QK-norm grid of recorded runs, up to three overlaid: held-out loss, largest attention logit, gradient norm, log Z (kept as a tab: a tool used by sections 2, 4, 5, 6 and 8) |
| Further reading `t-more` | `39_tab_more.html` | |

The Residual stream tab was removed on 2026-10-23: its stepper explains one mechanism (what placement does to the stream's size) and now sits in Reading section 2, its largest-entries table in section 7.

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
| `check_data.py`, `check_controls.mjs`, `reading_time.mjs` | checks | data equals a regeneration and the logs; typed numbers (including the units absorbed from the Block lab) equal their sources; the spike chart's flags equal the spike-score table; Notion ids exist; every control at 390 px dark and 920 px light, nothing autoplays; reading time |

Reused, not rerun: the Block lab's eight pre/post runs (`../../src/block/out/runs`, `gradnorm.json`), the transformer
from zero child's ablations (`../../the_transformer_from_zero/src/train/out/runs`), the Attention variants child's
gate and MHA runs (`../../attention_variants/src/out/runs_eval.json`), the Inside lab's facts (`../../src/inside/out/facts.json`), the Block lab's traces and per-block gradients (`../../src/block/out/trace_*.json`, `gradnorm.json`),
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
- **The Block lab's pre/post animation is not rebuilt.** The four-placement stepper in section 2 draws the same trace and adds the two
  placements in use since 2024 (sandwich and output norm), the init switch and the largest single entry; the Block lab's matched-pair
  numbers sit beside it.
- **The before/after animation is a training run**, not a forward pass: the same batches with and without one fix,
  replayed from the every-10-steps probe.
- **mHC is published only plus a random-matrix calculation**: a hyper-connection model on MPS would not show the
  instability, which in the paper appears at 27B after 12k steps.

## The 2026-10-23 rebuild: what changed and why
- **Top**: the idea in one sentence, a static hero (one block with the five places a fix acts, each tagged with its section), "You need", new terms, a short running example (provenance in a closed block). The old "In one screen" table was cut: the hero and each section's measured result carry it.
- **Visuals inline beside their claims** (2 drawn in Reading before, 9 after): the residual stepper moved in from its tab; five new charts (final loss against learning rate, gradient by block, mean over RMS, log Z, every-step gradient norm with spike flags); the before/after logit animation stays.
- **Absorbed from the root's Block lab** (section 2): the pre/post residual trace numbers, the learning-rate sweep (2.138 with a 500-step warmup, 40.8 gradient spike, 6.04 by step 30), the gradient by block (5.1e-7 at block 1, 0.27 to 0.92 for runs that trained) and its "does not reproduce" box for Xiong et al. Figure 3. `check_data.py` checks every absorbed number against the root's `src/block/out`. The root can now drop its pre/post-norm section and link here.
- **Moved to closed blocks**: code quotes, the Peri-LN table, DeepNorm, mHC detail and its calculation, the norm speed benchmark, the citations for entropy collapse, other init schemes, what removes massive activations, the 17-model production table (its pattern stays in core), mistakes, interview rehearsal.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `ns-tab`; a URL hash opens a tab); `check_controls.mjs` reports nothing playing under reduced motion.
- **Deleted as fat**: headings and signposts, the stale reading-time phrasing, restating interview questions (seven of ten; the three design questions stay), two mistakes that restated sections 4 and 8, the Stability explorer's empty "What the grid says" heading, the retired tab's instructions.
- **Made precise while rebuilding**: "the largest entry lives on token 0 in the middle blocks" now says it is the largest entry after each sub-layer from block 2's attention to block 5's FFN (the overall maximum, 35.8, is on token 132 after block 6, as the table shows).

## Length judgement
| | Before (2026-10-19) | After (2026-10-23) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 36.5 min (8,387 words) | 27.3 min (6,288 words) |
| Reading, closed details | 5.7 min | 13.8 min |
| Other tabs, core | Stability explorer 1.8 + Residual stream 2.4 + Further reading 2.4 | Stability explorer 1.8 + Further reading 2.4 |
| Visuals drawn in Reading | 2 | 9 |

Why about 27 minutes is right: the page teaches nine mechanisms (the residual path, four placements and mHC, LayerNorm against RMSNorm, attention-logit growth with three fixes, z-loss, residual init, massive activations, spike diagnosis, the production pattern), each with a measured result on the same model, and it now also carries the Block lab's placement evidence. About a fifth of the core words are captions of the nine visuals and the diagnostic table of section 8. What made it long (code, published tables, per-model rows, mistakes, interview answers, provenance) is closed and optional, which is why the closed time grew. Shorter would mean dropping a measured result that is the evidence for a fix.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
353 units: core 260, depth 68, fat 25, owned 0, volatile 0. 338 were drafted from the old page by `ledger.py init`; 15 record what was absorbed from the root's Block lab (section "absorbed ...", `where` empty: they live here). Keys were found by script (the longest number in the unit that is on the page, else a phrase of four to seven words) and the residue, plus every key that was only a year or a common number, set by hand; core or depth follows whether the key is outside or inside a closed block. Fat units carry a `note`.
