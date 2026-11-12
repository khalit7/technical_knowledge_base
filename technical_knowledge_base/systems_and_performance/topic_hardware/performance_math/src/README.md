# src: Performance math

Build: `sh build.sh` writes `../index.html` from `parts/`. Everything (recompute, data, build, checks): `sh run_all.sh` (python3 and node with html_utils' node_modules); `TRACE=1` re-traces the meta-device steps, `M1=1` re-measures on the M1 Pro GPU (both need `uv`).

- `parts/`: 01_head (look copied from the sibling pages), 02_split (the split layout, a skill template), 10_header (tabs), 20_read_a..g (Reading: a = styles, nav, core idea and Fig. 1, you need, new terms; b = s1 FLOPs with Fig. 2 and the ledger chart; c = s2 roofline and s3 memory with Fig. 3; d = s4 MFU, HFU and recompute, s5 measuring on the M1; e = s6 serving; f = s7 costing with the cost estimate, s8 communication; g = rehearsal, closed), 20_read_z closes it; 21_js_rd_common (the skill template); 22_js_calcd and 23_js_calcx (the parent's Performance calculator data and model, copied unchanged); 24_js_pmd (generated data); 25_js_rd_mem (the ledger and activation formulas and the memory engine, window.PMA); 25_js_s3 (the 3D renderer, a skill template); 26_js_rd_misc (Reading charts, tables, drills); 27_js_rd_figs (roofline slider, MFU bars, run-cost estimate; `window.PMF` for the checks); 31 FLOP and memory ledger; 32 Run and serving planner; 39 Further reading; 40_js_sc_hero, 41_js_sc_flops, 42_js_sc_mem (the three scenes); 99 tabs.
- `code/trace_llama.py`, `code/run_traces.sh`: one training step of Llama 3.1 8B (2K to 128K tokens, plain attention, FlashAttention, full recompute) and 70B on the meta device: FLOPs and bytes per operator, every saved tensor; writes `out/trace_*.json`.
- `code/m1_step.py`, `code/run_m1.sh`: two 8B-shaped layers timed on the M1 Pro GPU (MPS) and every operator recorded for the roofline prediction; writes `out/m1_run_*.json`.
- `recompute.py`: every derived number, importing the parent's `src/calc/model.py` so the two pages cannot disagree; writes `out/recompute.json`. `code/gen_data.py` writes `parts/24_js_pmd.js`.
- `check/check_embed.py` (prose numbers), `check/check_page.mjs` (JavaScript against Python, copied parent files unchanged), `check/check_ui.mjs` (every control at 390 px dark and 920 px light), `check/check_stages.mjs` (the three 3D stages: autoplay, steps, reduced motion, labels, step-list numbers; from the repo root, a few minutes).
- `inputs/`: configs (from the parent), extracts of PaLM, Korthikanti et al., Llama 3 and DeepSeek-V3, and PyTorch's checkpoint docs, with URLs and dates.
- `live.md`: the old page (copy of the parent's `src/read/old/04_performance_math.md`); `coverage.json` maps its 32 claims.
- `viz_ideas.md`: visuals built and rejected, with scores.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (child page). Departure: the parent already has the calculator this page's subject would naturally be, so the tabs extend it (a ledger of exact counts, a planner for deadlines and serving cost) and the Reading tab derives and checks rather than computes. No NVIDIA GPU: FLOPs and saved bytes are counted by PyTorch on the meta device (exact, no hardware), utilisation is measured on the M1 Pro GPU, and NVIDIA figures are vendor specs or papers.

## The 2026-10-23 rebuild to the teaching contract
Editing and new visuals only; no new runs. `.claude/skills/explainer-page/teaching/teaching-contract.md` governs; this page owns performance arithmetic (OWNERS.md): FLOPs, memory traffic, arithmetic intensity and the roofline, MFU and HFU, prefill and decode bounds, costing.
- **Top**: the core idea in one sentence (three counts over three chip numbers), a static hero drawing the running example as four divisions (training step, memory held, decoded token, whole run), "You need", new terms. The old "In one screen" table was fat (each row restated a section's headline number) and is gone.
- **New section 2, the roofline**, which the page owned but did not teach: one 4,096 x 4,096 BF16 matmul at 1 and 8,192 tokens per weight read (concrete), a log-log roofline with one movable point (tokens per weight read, the only control) and a prediction prompt, then the formula. The H100 ridge (295 FLOPs per byte) is reached at about 345 tokens; the M1 roof is the parent's Roofline lab's measured ceilings. Derived from vendor specs: there is no published figure for it to land on, and the caption says derived.
- **Sections merged**: model state and activations are one memory section around the animation; recompute and HFU sit inside the MFU section. The four run cards became an MFU bar chart (PaLM's HFU hatched, the best H100 GEMM dashed, the M1 measurement and the card-implied 13.9% beside the big runs); each bar's arithmetic is in a closed block.
- **New run-cost estimate** in section 7: presets Llama 3 405B (defaults reproduce the paper's 3.8e25 FLOPs independently; 26.4M GPU-hours against the card's 30.84M, residual 1.17 shown and explained), Llama 3.1 8B (40% MFU illustrative; card 2.9x), DeepSeek-V3 (by construction from 180K H800 hours per trillion tokens); one MFU slider.
- **Closed blocks** (depth): the convention box, bytes per parameter for every recipe, the GPT-3 34sbh table and the saved-tensor table with the three reasons for 49, PaLM's HFU rebuild, selective recompute's ratio, Llama 3's step time, the M1 run table, long prompts, the communication table, mistakes, drills (with the one interview question that adds a design angle).
- **Fat deleted**: wind-ups ("The problem."), the one-screen table, four interview answers and four mistakes that restated sections, the old subtitle and section nav.
- **No autoplay** (superseded on 2026-11-12 by the autoplay rule, see the last section): `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `pm-tab`); the memory animation's mode switch no longer starts it. `check_ui.mjs` checks the step stays 0 for 3 s on screen and after a mode switch.
- **Owners**: checkpointing mechanics and per-split communication bytes are Distributed Training's (OWNERS.md), so section 8 keeps two sentences and closes the table; KV-cache sizing links Long context. Distributed Training does not yet carry this page's Llama 3.1 8B byte counts (28.1 GB, 42.2 GB, 0.47 GB per layer, 67 MB, 229 KB), so they stay here as depth.
- **Further reading**: the CUDA root's time corrected (44 to 25 min); section numbers updated.
- **Images**: none. This page is arithmetic, not a physical object; the sibling hardware pages carry the photos, and no openly licensed canonical roofline figure was needed when the page draws its own.

### Length judgement
| | Before | After |
|---|---|---|
| Reading, core (230 words a minute) | 27.7 min | 21.3 min |
| Reading, closed details | 1.8 min | 10.7 min |
| FLOP and memory ledger / Run and serving planner | 2.0 / 2.7 min | 2.0 / 2.7 min (unchanged tools used across the page) |
| Visuals drawn in Reading | 3 | 7 (hero, ledger chart, roofline, memory animation, MFU bars, M1 chart, cost estimate) |

Why 21 minutes is right: the core now carries eight mechanisms (FLOP counting and its four corrections, the roofline, the memory budget, utilisation with recompute, measurement and operator-level prediction, the two serving phases, costing, communication placement), each with its numbers and a picture, and it gained a section (the roofline) that the page owned without teaching. Everything that is provenance, per-recipe tables, rebuilds of published figures or rehearsal is closed and optional (10.7 min).

### Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
316 units: core 192, depth 87, fat 37. 299 were drafted by `ledger.py init`; 17 were added by hand for script-rendered tables and the new visuals. Fat units carry a `note` saying why.

## Topic close (2026-10-24)
The parent calculator now uses this page's activation count (49h per layer for the 8B plus FP32 logits) instead of 34sbh; `recompute.py` imports `act_bytes_gpt3` for the 34sbh comparison (36.5 GB), the copies `22_js_calcd.js` and `23_js_calcx.js` were recopied, and the two correction boxes say so. Further reading times set to each header.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (after the data and engine parts, before the scenes), `21_js_rd_common.js`, `99_js_tabs.js` (key `pm-tab`). `build.sh` writes the em-dash detector's character as bytes. No new runs: every scene draws from `window.PMD` (`out/recompute.json`, unchanged) and `window.PMA` (the memory engine, unchanged and still checked by `check/check_page.mjs`).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` (Fig. 1): three counts over one H100 | yes, 4 |
| Reading | You need, new terms, provenance | full width | none | no |
| Reading | 1 FLOPs (one matmul, 6ND, the rule, part-by-part table closed) | split | **3D** `stg-flops` (Fig. 2): a step's FLOPs as a volume | yes, 5 |
| Reading | 1 What moves the count away from 6N, MoE, prediction | split | 2D ledger bars across lengths | no |
| Reading | 2 Roofline | split | 2D log-log roofline with one slider (widget) | no |
| Reading | 3 Memory (model state, recipes closed, activations) | split | **3D** `stg-mem` (Fig. 3): what one step holds, by kind | yes, 6 |
| Reading | 3 Activation formula, correction, selective recompute, 49h closed | full width | table (closed) | no |
| Reading | 4 MFU | split | 2D MFU bars | no |
| Reading | 4 Recomputation and HFU, arithmetic closed | full width | none | no |
| Reading | 5 Measuring MFU | split | 2D M1 chart | no |
| Reading | 6 Serving | full width | table; links Memory technology's 3D decode stage | no |
| Reading | 7 Costing | split | 2D run-cost estimate (widget: presets and one MFU slider) | no |
| Reading | 8 Communication, Rehearsal | full width | tables, drills (closed) | no |
| FLOP and memory ledger, Run and serving planner | | full width (tools used across the page; their notes are a line or two above many controls and charts) | 2D | no |
| Further reading | | unchanged | | |

**Stages and their data.** Fig. 1: `step_tf_8k`, `anim_time_s.flash` (492 TFLOP, 1.24 s at 40% MFU), `states_fsdp8_GB`, `act_layers_flash_GB`, `act_post_GB`, `anim_peaks_GB.flash` (16.1 + 57.1, about 73 GB against 80 GB; tray heights to scale), `l8_P`, `kv_seq_4k_GB`, `tpot_b1_ms`, `tps_b1` (16.6 GB read, 4.95 ms, 202 tokens/s), `c8_15t`, `gpuh_h100`, `usd_h100`, `gpus_30d_h100` (783 tiles, one per H100); the work block's size and positions are illustrative. Fig. 2: the floor is the numbers each token multiplies against, one square unit per billion (`ledger_l8` proj, mlp and head over 6, `l8_emb` lying flat because it is a lookup, and for attention 2 x L x T x h keys and values: 2.15B at 8,192 tokens, 34.4B at 131,072), the height is FLOPs per number (2 forward, 4 more backward, 5 backward for FlashAttention's core), so the volume is FLOPs per token and lands on the counted 60.06 and 285.5 GFLOP per token; step 1 draws one 4,096 x 4,096 weight larger than the model's scale (said in the step). Fig. 3: `PMA.memAnim` for the three modes (per-layer bytes 1.65 GB, 14.6 GB and 67 MB, logits 4.47 GB, peaks 73.2, 489 and 22.7 GB, times at 40% MFU), model state by kind (2 + 2 + 4 + 4 + 4 bytes of `l8_P`), sharded over 8; 1 unit = 20 GB, the H100's 80 GB is the glass lid. Each scene exports its numbers (`PM_HERO`, `PM_FLOPS`, `PM_MEM`) and `check/check_stages.mjs` checks every number in the step lists against the page's data.

**Removed or moved**: the 2D hero of four division rows (its numbers are now Fig. 1's step list); the 2D memory-over-time animation with its mode switch and per-step caption (68 frames, over the long-replay limit: its forward and backward became Fig. 3's steps 3 and 4, its modes steps 5 and 6, its caption the step list; the four counters' numbers are in the steps); the part-by-part FLOP table moved into a closed block in section 1 (Fig. 2's step list now carries its numbers). Kept 2D, and why: the roofline (log-log axes and one slider; a surface would hide the two roofs' crossing), the ledger bars across lengths (a comparison on one axis), MFU bars (one number per run), the M1 chart (measured against predicted times), the run-cost estimate (a widget whose outcome is the point), and both tool tabs (calculators). `viz_ideas.md` lists the 3D candidates rejected.

**Images**: none added. The page is arithmetic; the physical H100, HBM stacks and racks are photographed on the sibling hardware pages, and the stages draw the running example.

**Length judgement.** Reading core 21.3 min before (4,905 words), 23.8 min after (5,478 words, `audit_pages.mjs`); closed details 10.7 min before, 11.4 after (the part-by-part table moved into a closed block); the tool tabs unchanged (2.0 and 2.7 min); Further reading 2.5 min. Visuals in Reading 7 before, 8 after by the audit's count (three 3D stages; the 2D hero and memory animation retired). The 2.5 minutes are the three step lists that now explain the stages on the left, as the rollout requires, including new derived results (attention as 2.15B, then 34.4B, numbers per token; the step's high-water mark in each mode). The sentence the stage now carries was cut from section 1's opening paragraph; nothing the ledger holds was cut.

**Ledger** (`ledger.json`): 322 units, core 198, depth 87, fat 37. Unit 301 re-keyed ("Notice which chip number each step divides by", the new Fig. 1 note); six units added for the new step-list results. `python3 html_utils/ledger.py check` problems 0 here and on the root.

**Checks** (2026-11-12): `check/check_stages.mjs` (new: autoplay on view, stepping to the last step with one list item per step, no redraw off screen, nothing moves under reduced motion, label overlap at 1400 px, splits two columns at 1400 px and one below 1100 px, every step-list number against the data, all tabs for NaN, undefined and sideways scroll), `check/check_ui.mjs` (every control at 390 px dark and 920 px light; the memory animation's steps and its never-autoplay assertion removed, since Fig. 3 replaced it and check_stages covers autoplay), `check/check_page.mjs` (65 of 65), `check/check_embed.py` (111 of 111 prose numbers), `html_utils/checkpage.sh` (fail=0, emdash 0, errbox 1, clipped 0). `run_all.sh` reruns `recompute.py`, which rewrites `out/recompute.json` and `parts/24_js_pmd.js` with last-digit float differences on this machine's Python; those two files were left as committed.
