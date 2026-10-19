# Source of "Attention variants: MHA, MQA, GQA, MLA, sliding window, sparse attention and sinks"

Child page 2 of Topic: llm-architecture (page prefix `av`, storage key `av-tab`). Built 2026-10-19 on an Apple M1 Pro.

## Build
`sh build.sh` writes `../index.html` from `parts/`. It is the root's build plus one line (as on the Long context child):
the root's `src/parts/33_js_cc_1core.js` (the Config calculator core, `window.CC`) is emitted unchanged before this
page's scripts. Data parts are written by scripts, never by hand: `ladder/make_ladder.py` (configs) and
`make_page_data.py` (everything in `out/` and `inputs/code_quotes.json`).

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, sections 0 and 1) to `20_read_h`, `20_read_z`; `22_js_rd_0data.js` (AVR), `22_js_rd_1plot.js` (AVP chart helpers), `22_js_rd_1say.js` (findings text from data), `22_js_rd_2main.js` | derivations, checks, measured runs, published results, mistakes, interview |
| Cache ladder `t-ladder` | `32_tab_ladder_a.html`, `32_js_ld_0data.js` (AVL), `32_js_ld_1core.js` (AVLC arithmetic), `32_js_ld_2ui.js` | eleven designs from real configs: held, read, FLOPs per byte; a two-rung decode race at H100 speeds |
| Which keys are read `t-keys` | `33_tab_keys_a.html`, `33_js_ky_0data.js` (AVK), `33_js_ky_1ui.js` | SmolLM2's real attention under each variant's read set; stacked-window reach animation; top-k mass table |
| Design drill `t-drill` | `34_tab_drill_a.html`, `34_js_dr_1drill.js` | seven design questions, reveals computed with AVLC or read from the runs |
| Further reading `t-more` | `39_tab_more.html` | |

## Runs and scripts (outputs in `out/`; everything the page needs is in the repo)
| Script | Runs on | Output |
|---|---|---|
| `runs/av_model.py`, `runs/av_train.py` | library: adds the Qwen3-Next style output gate to the shared tiny GPT by patching at import (the shared `src/data` is not edited), and wraps `train.py` / `eval.py` | |
| `runs/queue1.sh`, `queue2.sh`, `queue3.sh` | MPS, under the bench lock, one run per hold (about 7 min each) | checkpoints in scratch `runs/av_*` |
| `runs/runs_eval.py` | CPU, about 5 min | `out/runs_eval.json`: run summaries, window sweep, sinks and gates, serving with windows |
| `mla/kv_rank.py` | CPU, under a minute | `out/kv_rank.json`: spectrum of at_mha's keys and values; head averaging and projection without training |
| `mla/uptrain.py` | CPU, a few minutes | `out/uptrain.json`: GQA paper recipe (average, uptrain 15 / 75 / 150 steps) |
| `mla/mla_absorb.py` | CPU, seconds | `out/mla_absorb.json`: absorbed vs naive MLA on at_mla, the RoPE trap, decode costs |
| `probe/topk_mass.py` | CPU, about 15 s | `out/topk_mass.json`: SmolLM2-135M and tiny GPT top-k attention mass; explorer rows |
| `ladder/make_ladder.py`, `ladder/check_ladder.mjs` | CPU | `out/ladder.json`, `out/ladder_check.json` (equals CC.cache on every handled rung, V4-Pro equals the gallery) |
| `code/extract_code.py` | CPU | `inputs/code_quotes.json` (transformers v5.20.1 and tiny_gpt.py quotes located by pattern) |
| `check_controls.mjs`, `check_data.py`, `shot_el.mjs` | checks | |

Inputs: the root's `src/data` (tiny GPT, configs, running sequence), the map's `src/map/inputs/configs` (GLM-5,
DeepSeek-V4-Pro, Gemma 4, Qwen3.5), the Attention lab's checkpoints `at_*` (scratch), SmolLM2-135M revision 93efa2f0
(Hugging Face cache), transformers v5.20.1 clone (scratch). Rerun order: queues, then `runs_eval.py`, `uptrain.py`,
`kv_rank.py`, `mla_absorb.py`, `topk_mass.py`, `extract_code.py`, `make_ladder.py`, `make_page_data.py`, `build.sh`.

## Departures from the page-kind shape, and why
- **The cache-per-token ladder is about reads and FLOPs per byte, not only bytes held.** The root's Attention lab has
  a KV sizing calculator and every model's cache; the gallery child has the per-layer ladder. This tab adds what a
  decoded token reads and whether that is memory- or compute-bound, which is what separates MLA, DSA and V4.
- **The MLA step animation is not rebuilt** (the DeepSeek page owns it); MLA is derived and checked numerically.
- **The Reading animation is the sink before/after** on a trained model; the keys tab animates stacked windows; the
  ladder animates a decode step on two rungs.
- **Sparse attention and differential attention are published only**: NSA and DSA need CUDA kernels and long
  contexts; DIFF's gains need scale. The premise of sparse attention (concentration) is measured on SmolLM2.
- **The gate is added by patching** (`runs/av_model.py`) because `src/data` is read-only for children.
