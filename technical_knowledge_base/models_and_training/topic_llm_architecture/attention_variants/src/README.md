# Source of "Attention variants: MHA, MQA, GQA, MLA, sliding window, sparse attention and sinks"

Child page 2 of Topic: llm-architecture (page prefix `av`, storage key `av-tab`). Built 2026-10-19 on an Apple M1 Pro; rebuilt 2026-10-23 to the teaching contract (editing only, no new runs).

## Build
`sh build.sh` writes `../index.html` from `parts/`. It is the root's build plus one line (as on the Long context child):
the root's `src/parts/33_js_cc_1core.js` (the Config calculator core, `window.CC`) is emitted unchanged before this
page's scripts. Data parts are written by scripts, never by hand: `ladder/make_ladder.py` (configs) and
`make_page_data.py` (everything in `out/` and `inputs/code_quotes.json`).

## Tabs and parts (rebuilt 2026-10-23 to the teaching contract)
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms) to `20_read_h` (closed depth blocks), `20_read_z`; JS (2026-11-09): `21_js_rd_common.js` (skill template), `22_js_rd_0data.js` (AVR), `22_js_rd_0keys.js` (AVK), `22_js_rd_0bench.js` (AVB, from `make_stage_data.py`), `22_js_rd_1plot.js`, `22_js_rd_1say.js`, `22_js_rd_2main.js`, `25_js_rd_nsa.js`, `25_js_rd_v4.js`, `25_js_s3.js` (renderer v2), `32_js_ld_*` (per-layer decode cost, section 7), `34_js_dr_1drill.js` (design questions), `40_js_sc0kit.js` and the seven scenes `41_js_sc_hero.js` to `47_js_sc_sink.js`; `02_split.html` (split layout) | sections 1 to 7 core, section 8 closed depth |
| Which keys are read `t-keys` | `33_tab_keys_a.html`, `33_js_ky_1ui.js` (data in `22_js_rd_0keys.js`) | SmolLM2's real attention under each variant's read set (a lab: query, layer, heads, k) |
| Further reading `t-more` | `39_tab_more.html` | |

The Cache ladder and Design drill tabs were removed: the ladder became Reading section 7 (per layer, one slider), the drill a closed block in section 8. The keys tab's stacked-window animation moved to section 4 and its top-k table to a closed block in section 5.

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

## The 2026-10-23 rebuild: what changed and why
The pilot of the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`). This page became the **sole owner of the attention-variant mechanisms** (MHA, MQA, GQA, MLA with decoupled RoPE and absorption, windows and local : global layers, NSA, DSA with its indexer and two training stages, DeepSeek-V4's CSA and HCA, sinks and gates); whole-model KV sizing at a context length is owned by the Long context sibling and is linked, not rebuilt.
- **Top**: the core idea in one sentence, a static hero (each variant's cache entry per token per layer to scale beside which past tokens the next token reads), "You need", new terms. The old "In one screen" table is a closed reference block.
- **Every core mechanism has its visual inline**, chosen by the kind of concept:
  - MQA and GQA: the root Attention lab's "four caches, one sequence" before/after (moved here, `23_js_rd_cache.js`), plus the measured key/value spectrum.
  - MLA: the DeepSeek page's MLA explainer (moved here as `24_js_rd_mlx.js`, now paused until the reader presses play), with the formula in the same names.
  - Windows: the stacked-window reach stepper (moved from the keys tab).
  - NSA: a new static annotated diagram of the three branches and gates (`25_js_rd_nsa.js`).
  - DSA: a new stepper on real data (`25_js_rd_dsa.js`): SmolLM2's attention from the last token, layer 18, stands in for the indexer (an oracle), top 16 of 226; steps for the cache, scoring, top-k, attention reads, reads at V3.2's scale and the two training stages.
  - V4: a new CSA/HCA stepper (`25_js_rd_v4.js`): blocks merged into entries, the raw window, select or read all, the numbers at 1M tokens.
  - Sinks: the existing before/after on the trained av_sink model.
  - Synthesis: section 7, per-layer bytes read and FLOPs per byte for 16 real layer types with one context slider (the old ladder, per layer instead of per sequence).
- **Concrete, then picture, then formula** in each section; measured and published results that are not needed on first read (conversions, the absorbed-form check, decode cost tables, the MLA investigation, the window sweep, the sink ablation, NSA's results, V4's remaining layer details, the 2% reproduction) are in closed blocks.
- **Absorbed** from the root (Reading section 4 and the Attention lab), the DeepSeek page (MLA, DSA, V4), the LLM Architecture Gallery and the Kimi page: every mechanism unit, with its number and source, is now here (ledger units labelled "absorbed").
- **No autoplay**: `21_js_rd_common.js` is the skill template; the MLA animation's own controller starts paused and no longer starts on a mode switch. `check_controls.mjs` and a normal-motion check both report nothing playing.
- **Deleted as fat**: wind-ups, restated headings, the interview block (each answer restated a section; the two design questions were merged into the design-question reveals), pointers to removed tabs.

## Length judgement
| | Before (2026-10-19) | After (2026-10-23) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 34.1 min | 28.1 min |
| Reading, closed details | 4.6 min | 27.9 min |
| Other tabs, core | ladder 4.3 + keys 5.6 + drill 1.3 = 11.2 min | keys 2.2 min |
| Core total, excluding Further reading | 45.3 min | 30.3 min |
| Visuals drawn in Reading | 6 | 12 |

Why 28 minutes is right: the page now teaches seven mechanisms (sharing, latent, windows, NSA, DSA, V4 compression, sinks and gates) that four pages used to split, each with its numbers, picture and formula; every core unit in the ledger is needed to understand one of them, and about a fifth of the core words are captions and counters of the visuals. What made the old page long (measured investigations, per-model tables, code, mistakes, interview answers) is now closed and optional; the closed time grew because absorbed depth (V4's layer details and 2% reproduction, NSA's results, StreamingLLM and gated-attention details, the moved design questions) now lives here instead of on three other pages.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
319 units: core 184, depth 88, fat 46, volatile 1 (V3.2-Exp's API price cut, which stays on the DeepSeek page). 247 were drafted from the old page by `ledger.py init`; 21 were added by hand for script-rendered visuals and tables; 51 record what was absorbed from the root, DeepSeek, gallery and Kimi pages (section "absorbed", `where` empty: they live here). Fat units carry a `note` saying why.

## Departures from the page-kind shape, and why
- **Section 7 is per layer, about reads and FLOPs per byte, not bytes held per sequence.** Whole-model sizing at a
  context length is the Long context sibling's; this page shows what one decoded token reads in one layer of each
  design and whether that is memory- or compute-bound, which is what separates MLA, DSA and V4.
- **The MLA step animation was moved here** on 2026-10-23 (this page now owns MLA); it was first built for the DeepSeek page.
- **Two Reading visuals run on real data rather than toys**: the DSA stepper (SmolLM2's attention as an oracle indexer) and the keys explorer.
- **Sparse attention and differential attention are published only**: NSA and DSA need CUDA kernels and long
  contexts; DIFF's gains need scale. The premise of sparse attention (concentration) is measured on SmolLM2.
- **The gate is added by patching** (`runs/av_model.py`) because `src/data` is read-only for children.

2026-10-26 (final follow-up sweep): section 5 adds QSA and MSA rows to the stored/read table and one paragraph on the same idea at other labs (QSA, MSA, NaiveAI's DSA layout), each linking the lab page that owns it. MoBA (Kimi) is still not covered.

## 2026-10-26 additions
MoBA (Moonshot AI, arXiv 2502.13189) added to section 5: a row in the sparse comparison table and a paragraph, checked against the paper (block scoring by mean-pooled keys, current block always selected, no added parameters, Llama-8B-1M-MoBA with blocks of 4,096 and top 12, 95.31% sparse, 6.5x prefill at 1M, deployed for Kimi). Reading 28 (measured 29 before) to 30 min.

## 2026-11-09: split layout, seven 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `av-tab`). `build.sh` is now the template's (C-locale part order, `02_split.html` after `01_head.html`, the em-dash test written as bytes) plus one line: the root's `33_js_cc_1core.js` before this page's scripts, as before. `01_head.html` is kept (it already carries the 2026-10-29 look).
- **New data part**: `make_stage_data.py` writes `parts/22_js_rd_0bench.js` (`window.AVB`) from two of the root's recordings, read only: `src/attn/out/decode_bench.json` (the decode timings section 1 quotes) and `src/inside/out/smol.json` (SmolLM2's weight on token 0 by layer and the sliding-cache losses section 6 quotes). `check_data.py` now checks AVB against both.
- **Seven stages**, one scene file each on `40_js_sc0kit.js` (smooth per-step values, labels that hand over at mid-transition, gridded slabs), each with an `ol.sx` step list and no per-step caption:
  - Fig. 1 `stg-hero` (7 steps, `41_js_sc_hero.js`): 24 past tokens as columns whose height is one layer's entry, one scale throughout (Llama 2 7B MHA, Llama 3.1 8B GQA-8, DeepSeek-V3 MLA, Mistral window, V3.2 DSA with its indexer key, V4-Pro CSA, a sink), lit = read, flows into the new query. From AVL. Replaces the static SVG hero.
  - Fig. 2 `stg-cache` (5, `42_js_sc_cache.js`): Llama 3.1 8B's cache as bricks of 32 layers by 8 KV heads (keys and values) per token, growing, streamed from HBM into the die; 4 FLOPs per byte against the H100's 295; the measured times next to bytes per token (AVB). New (section 1 had only the photo).
  - Fig. 3 `stg-gqa` (5, `43_js_sc_gqa.js`): the tiny GPT's 8 query heads as glass plates sharing 8, 4, 2, 1 KV heads, flows to the head each reads, the entry to scale and each run's loss (AVR.runs). Replaces the four-caches 2D animation (its MLA and window modes are Figs. 4 and 5).
  - Fig. 4 `stg-mla` (7 + 6, `44_js_sc_mla.js`): the MLA explainer's before/after rebuilt in 3D at DeepSeek-V3's dimensions (AVR.mla), one cell = 64 numbers, with an MLA / standard MHA switch that swaps the step list (`sx-mla`, `sx-mha`; the old captions, word for word apart from colour names). Replaces `24_js_rd_mlx.js`.
  - Fig. 5 `stg-win` (5, `45_js_sc_win.js`): six layers as a staircase over the 226-token running sequence, reach per layer for W 16 to 128 (chips), all-local then 2 local : 1 global, the relay path against one hop. Replaces the reach strip.
  - Fig. 6 `stg-dsa` (6, `46_js_sc_dsa.js`): the DSA stepper on the same real data (SmolLM2 layer 18, oracle indexer) as a bar field, top 16 read with flows weighted by attention, reads at V3.2's scale and the two training stages to scale. Replaces `25_js_rd_dsa.js`.
  - Fig. 7 `stg-sink` (6, `47_js_sc_sink.js`): weight on token 0 in each of SmolLM2's 30 layers, the last token's attention in six layers (AVK), the eviction losses, the av_sink head with and without its sink (AVR.sinks), the gated-attention paper's 46.7% to 4.8%. Replaces the sink before/after bar row.
- **2D kept, now in splits**: the NSA static diagram (structure, `.s3side`), the V4 CSA/HCA stepper (`RD.anim` with lists `sx-v4c` / `sx-v4h`, autoplays, captions moved into the lists), the key/value spectrum chart, the per-layer decode-cost card of section 7 (a slider over log-scale bytes: a number on an axis), the P100 photo (section 1, second split). Full width: You need, terms, the reference table, conversion and investigation blocks, the sparse comparison table, section 8 and the Which keys are read tab (a reader-driven tool).
- **Prose that a step list now carries was shortened** (section 1's concrete paragraph, the reach paragraph, the sink measurements, DSA's training paragraph); every ledger key survives.
- `check_stages.mjs` (new, adapted from Vision encoders'): each stage plays when scrolled into view, steps to its last step with one list item per step (both MLA modes, both V4 modes), stops off screen, never moves under reduced motion; numbers in the lists and prose against AVL, AVB, AVR and AVK. `check_controls.mjs` keeps its reduced-motion assertion (none plays), which is still right.
- **Length**: Reading core 6,996 to 8,845 words (30 to 38 min); closed details unchanged (6,484 words, 28 min); keys tab 2.2 min. The 1,850 added words are the 43 step-list items that explain the seven stages and the V4 stepper; about 900 of them were script captions before (MLA, DSA, V4: shown one at a time and not counted), the rest explain the new figures. Visuals inline 13 to 16 as the audit counts them.
- **Ledger**: 323 units (core 187, depth 89, fat 46, volatile 1), problems 0; nine keys moved with their text (89, 132, 143, 219, 249, 258, 263, 265, 267).
