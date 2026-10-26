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

2026-10-26 (final follow-up sweep): the effective-context paragraph names Liu et al.'s lost-in-the-middle U (owned by Long-context and multimodal benchmarks, linked there); the Proactive memory agent paper page sends readers here for it. MiniMax presets for the calculator were proposed and not added.
