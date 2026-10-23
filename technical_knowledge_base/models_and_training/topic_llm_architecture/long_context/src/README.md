# Source of "Long context: KV cache growth and compression, local and global attention, effective context"

Child page 7 of Topic: llm-architecture (prefix `lc`, storage key `lc-tab`). Built 2026-10-18 on an Apple M1 Pro; rebuilt
2026-10-23 as the pilot of the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`).

## Build
`sh build.sh` writes `../index.html` from `parts/` (the root's build; the root's `window.CC` is no longer included).
Data parts are written by scripts, never by hand: `kv_calc/make_kv_data.py` (calculator presets, published checks,
Reading-figure data), `make_page_data.py` (runs and prose facts, `facts.json`), and the run outputs below.

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles) to `20_read_z`; `22_js_rd_0facts.js` (LCF), `22_js_rd_1fill.js`, `23_js_rd_anim.js` (design stepper), `24_js_rd_vis.js` (hero, entry to scale, FLOPs share, key channels, Gemma layer strip), `32_js_ev_*` (eviction map stepper and quality chart), `33_js_ef_*` (position wall, distance slider, pass-key grid) | core idea, hero, nine sections, depth blocks |
| KV-cache calculator `t-kv` | `34_tab_kv_a.html`, `34_tab_kv_c.html` (static tables, written by the script), `19_js_kc_0data.js` (KCD), `19_js_kc_1core.js` (engine, `window.KC`), `34_js_kc_2ui.js` | 45 presets, context slider, design as the variable |
| Fit the model `t-game` | `35_tab_game_a.html`, `35_js_fg_0levels.js` (briefs, references, debriefs, quoted quality numbers `FGQ`), `35_js_fg_1game.js` (engine `window.FG`, UI) | the game below |
| Further reading `t-more` | `39_tab_more.html` | |
`30_js_lc_0core.js` holds `window.LC` (helpers and a tab-aware copy of the step controller).

## What changed on 2026-10-23, and why
- **Ownership.** This page is now the sole owner of KV-cache sizing in the knowledge base. The Memory wall tab was
  replaced by one **KV-cache calculator**: 23 presets from the root's real configs (equal to the root calc.py byte for byte
  at 4K, 32K and 128K, asserted in `make_kv_data.py`) plus 22 copied with sources from the DeepSeek, Qwen, Mistral, GLM,
  vision-language, gallery and Memory technology pages; one context slider (1K to 1M); the attention design as the variable
  (as released, MHA, GQA-8, MQA, MLA 512 + 64, window 4,096, 5:1 at 1,024, 3 linear : 1 attention); dtype, state dtype,
  eviction share and hardware in a closed row; outputs per token, per sequence, read per decoded token, the context where
  cache equals weights, sequences that fit and the batch-1 decode ceiling; every preset at the same context below; twelve
  published figures recomputed in a static table (independently, by construction, or "does not reproduce" with the reason).
  `kv_calc/check_kv.mjs` checks the page's engine against `kv_calc/out/recompute.json` (225 values, 0 differences).
- **Visuals inline.** The Reading tab had 1 inline visual for 4,631 words; it now has 10: a hero (one Llama 3.1 8B request's
  memory against context, to scale, with the MHA counterfactual), one token's entry per design to scale, attention's share
  of FLOPs, key/value outlier channels (all 90 SmolLM2 caches), the eviction kept-map stepper and the quality-against-memory
  chart (moved from the Eviction lab), a Gemma 3 27B layer strip with a context slider, the position-wall chart, the distance
  slider and the pass-key grid (moved from the Effective context lab), and the design stepper. The two lab tabs were folded
  into Reading: their visuals now sit beside the claims they prove; protocols, per-head tables and code went into closed blocks.
- **Never autoplay.** `21_js_rd_common.js` is the template's; `30_js_lc_0core.js` lost its play-on-first-view. Checked under
  normal and reduced motion: both steppers stay on step 0.
- **Accounting conventions made explicit** (closed block in section 1): windows credited or not, DSA indexer keys counted or
  not, DeepSeek-V4's FP8/FP4 layout against bf16, state in FP32 or 16-bit, 1M as 1,048,576 or 1,000,000. These are why the
  pages disagreed (V3.2 68.6 against 83.9 KiB; V4-Pro 4,939.5 bytes against 9.7 KiB).
- **New reconciliations** (derived, formulas on the page): DeepSeek-V2's "93.3%" reproduces only with its 6-bit cache (82.2%
  in bf16); V4's "10%" and "7%" of V3.2 are consistent with V3.2's FP8 cache of 48,068 bytes (10.3% and 7.3%); Gemma 3's
  "60%" to "less than 15%" does not reproduce at 27B in bf16 (31% and 5.8%, the same fivefold cut).
- **Deleted as fat**: wind-ups, section headings, "The problem." lead-ins, the four-walls box (the sections carry it), the
  common-mistakes list (each mistake now sits in the section that shows it) and seven interview answers that restated the core.
  Three design questions stayed, closed.

## Fit the model (added 2026-10-23)
A game whose rules are the page's mechanism: each level is a client brief (model, users, context, GPUs, quality limit);
the board draws each GPU's memory to scale with the weights and one brick per user's cache; cards are the levers. Memory
comes from the calculator's engine (`KC.seq`, `KC.redesign`, params x bytes, 92% usable, even split over GPUs), so every
number equals the t-kv tab. Score = quality points given up + GPUs used. No avatar, no art, nothing moves before a click.

| Level | Brief | Lesson | Reference (score) |
|---|---|---|---|
| 1 Free bits | Llama 3.1 8B, 24 users at 32K, 1 H100, released weights | an 8-bit cache halves every user for free | FP8 (1) |
| 2 One user weighs a model | same, 8 users at 128K, question with the document | eviction works when the question is known | FP8 + SnapKV 50% (1) |
| 3 The question comes later | same, 12 users at 128K, multi-turn | eviction without the question fails; adding a GPU is the honest answer (no win on 1 GPU) | FP8 + 2 GPUs (2) |
| 4 Redesign an MHA model | Llama 2 7B shape, 16 users at 32K, retraining, MMLU limit 5 | MQA fits but its published cost breaks the limit; GQA-8 (Llama 3) or MLA (DeepSeek) | MLA (1) |
| 5 Already MLA | DeepSeek-V3, fp8 weights, 72 users at 128K, 8 H200 | an efficient design leaves only bits and hardware | FP8 (8) |
| 6 Design for 32 users at 128K | Llama 3.1 8B shape, retraining, MMLU limit 2, every token reachable | section 9's answer: 5 local : 1 global + FP8 (Gemma 3) | 5:1 + FP8 (1, one unpriced move) |

Quality numbers and their sources (no others are used; a move without one shows "no published number" in amber and is
counted as an unpriced risk beside the score):
- Attention design, MMLU: DeepSeek-V2 Table 8 (7B dense, 1.33T tokens) MHA 45.2, GQA-8 41.2, MQA 37.9; Table 9 (MoE) MLA
  50.0 against MHA 48.7; both as quoted on Attention variants. GQA-8 or MQA against MLA, and any window layout: no
  published number (Gemma 3's "minimal impact on perplexity" and MixAttention's "at least one standard attention KV cache"
  are shown as quotes, the latter as the rule that rules out an all-windowed model in level 6).
- Cache precision and eviction, pass-key points: this page's SmolLM2-135M runs (`window.EVD`, 30 prompts at 4,096 tokens,
  full cache 29/30): int8 29/30 (priced as FP8, labelled), int4 per token 26/30 (the calculator's 4.5-bit INT4; KIVI's 28/30
  shown, not priced), SnapKV with the question 29/29/26 of 30 at 50/25/12.5%, before the question 9/0/0. Batching page's
  Qwen3-1.7B q8_0 and q4_0 perplexities shown beside them.
- Speed notes: Attention variants' measured decode times per design; section 9's prefill share; the calculator's decode ceiling.
Costs of two moves are added (never measured together); MMLU and pass-key limits are checked separately.

`game/check_game.mjs` (run from the repo root): no animation before interaction (normal and reduced motion); every
reference wins and has the lowest score of all winning card combinations (brute force); per-user cache equals the
calculator tab driven to the same settings and the calculator fits at least the brief's users; level 3 has no win with
the brief's GPU and users; every quoted number is still on its credited page; every card button at 390 dark and 920 light.

## Length judgement
| | Before (2026-10-18) | After |
|---|---|---|
| Reading core | 4,631 words, 20 min | 4,954 words, 22 min |
| Reading in closed blocks | 721 words, 3 min | 3,030 words, 13 min |
| Other tabs (core) | Memory wall 821, Eviction lab 1,507, Effective context lab 1,169, Further reading 665: 18 min | Calculator 714 (3 min), Further reading 753 (3 min) |
| Visuals inline in Reading | 1 | 10 |
(audit_pages.mjs, 230 words per minute; script-written captions and predict answers count.)

The core reading of the whole subject fell from about 38 minutes (Reading plus the three lab tabs, which the old Reading
kept sending the reader to) to 22, with every lab visual now inline. Reading itself grew by 2 minutes because it absorbed
the labs' explanations; it also absorbed KV-cache sizing from eight pages (55 units). The length is right because the ledger
is almost all core (234 core against 64 depth units), the subject has four distinct walls (memory, compute, position, use)
that each need their mechanism and their evidence, and each section is now a claim, its figure and its numbers. What could
still go: the levers table at the top (it is the one-screen map, kept) and the predict answers (they count although hidden).

## Ledger
`src/ledger.json`: 383 units (328 from the page as built on 2026-10-18, 55 absorbed): core 234, depth 64, fat 85, problems 0
(`python3 html_utils/ledger.py check`). Absorbed units carry `tab` = `absorbed:<source page> <source tab>`.

## Runs (scripts here, outputs in `*/out/`, everything the page needs is in the repo)
| Script | Runs on | Output |
|---|---|---|
| `kv_calc/make_kv_data.py` | Python, the root's `src/calc/calc.py` and `src/data/configs` (read-only), a second | `parts/19_js_kc_0data.js`, `parts/34_tab_kv_c.html`, `kv_calc/out/recompute.json` |
| `kv_calc/check_kv.mjs` | node | JS engine equals the Python recompute |
| `kv/smol.py` | library: SmolLM2-135M attention by hand | |
| `kv/run_kv.py check / evict / map` | CPU, 4 threads | `kv/out/check.json`, `evict.json` (about 10 min), `map.json` (about 40 min) |
| `kv/key_channels.py` | CPU | `kv/out/key_channels.json` |
| `past/past_len.py`, `past/finetune_long.py` | CPU; MPS | `past/out/` |
| `wall/check_wall.mjs` | historical: wrote `wall/out/examples.json` from the old Memory wall (the design stepper's numbers) | |
| `check_controls.mjs`, `check_data.py`, `shot_el.mjs`, `reading_time.py` | checks | |

## For the Positional Encodings child
`past/out/past.json` and `kv/out/map.json` are reusable as is.
