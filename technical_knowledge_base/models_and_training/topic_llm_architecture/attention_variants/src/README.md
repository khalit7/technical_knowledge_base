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
| Reading `t-read` | `20_read_a` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms) to `20_read_h` (closed depth blocks), `20_read_z`; JS: `21_js_rd_common.js` (the skill template, never autoplays), `22_js_rd_0data.js` (AVR), `22_js_rd_0keys.js` (AVK), `22_js_rd_1plot.js`, `22_js_rd_1say.js`, `22_js_rd_2main.js`, `23_js_rd_hero.js`, `23_js_rd_cache.js`, `24_js_rd_mlx.js`, `24_js_rd_reach.js`, `25_js_rd_nsa.js`, `25_js_rd_dsa.js`, `25_js_rd_v4.js`, `32_js_ld_*` (per-layer decode cost, section 7), `34_js_dr_1drill.js` (design questions, closed block in section 8) | sections 1 to 7 core, section 8 closed depth |
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
