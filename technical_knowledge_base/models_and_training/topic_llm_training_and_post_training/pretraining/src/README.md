# Pretraining: HTML-only page source

Replaces all text of https://app.notion.com/p/3c65c17b0d0d814f82cffd0d5c0dd5ba (saved verbatim in `live.md`, fetched 2026-09-22 state). No child pages, databases or video on the live page.

## Build and data
- `sh build.sh` runs `recompute.py`, `mk_toy.py` and `mk_speedjs.py`, then assembles `../index.html` from `parts/` (one `<script>` per JS part, tab wiring last, hidden error box). Links are written `{{text|url}}`, `{{text|n:<notion id>}}` or `{{text|#t-<tab>}}`.
- `recompute.py` recomputes every derived number shown (T5 ranges in standard deviations, per-512 objective counters, tokens per parameter, OLMo 2 LR at the cut and anneal share, Table 11 split and GSM* standard errors, SmolLM3 maths tokens, speedrun speed-up and shares) into `data/recompute.json`.
- `mk_speedrun.py` parses the record table of `inputs/modded_nanogpt_README.md` (fetched 2026-10-03) into `data/speedrun.json`, with this page's category per record (the CAT lists in the script); `mk_speedjs.py` writes `parts/36_js_speed_data.js`.
- `toy/train.py` is the toy experiment (character-level GPT, 818,688 parameters; stage 1 of 6,000 steps at constant LR, then four 1,200-step branches: LR flat or linearly to zero, crossed with 3% or 25% maths sequences; seeds 1 to 3). Run: `cd toy && OMP_NUM_THREADS=2 uv run --with torch python train.py` (about 11 minutes per seed on two CPU threads). The corpus is six Project Gutenberg books in `toy/corpus/` (gitignored, about 4 MB; fetch with `curl -sL https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt` for ids 1342, 11, 1661, 84, 98, 2701). Outputs go to `toy/runs/` (`meta.json`, `seed<k>.json`, about 100 KB each); `mk_toy.py` packs them into `parts/31_js_toy_data.js` and writes `data/toy_summary.json`.
- `recompute.py` also computes section 3 (scaling laws): the three fits (Hoffmann unrounded and Eq. 10, Besiroglu refit), Kaplan's rule, optima at 1e21, 5.76e23 and 3.8e25, the over-training table at Chinchilla's loss, the size floor and the 6ND checks, into `data/recompute.json` under `scale`.
- `mk_coverage.py` writes `coverage.json` (every fact of `live.md`, where the HTML carries it, probe-checked against `index.html`; probes updated 2026-10-23). `ledger.json` (below) now governs.
- `check_controls.mjs` (run from the repository root) exercises every control in 390 px dark and 920 px light, fails on errors, the error box, sideways scroll or NaN/undefined/Infinity, and checks the motion rules of 2026-11-06: each Reading step animation plays by itself once in view and stays still under reduced motion; the speedrun replay never plays by itself.
- `check_stages.mjs [shots dir]` (from the repository root, about 5 minutes) checks the two 3D stages and the three 2D step animations: autoplay on view, one step-list item per step, last steps, every mode's list, stillness off screen and under reduced motion, the splits at 1400, 920 and 390 px, and that every number written as static text in the step lists (`data-ls`, `data-sc`, `data-sa` spans) equals what the scripts compute from the page's data, plus three independent recomputes; it writes mid-step screenshots.
- `check_data.py` (from `src/`, after the build) runs `parts/26_js_rd_scale0.js` in node and compares it with `recompute.py` (69 values), and checks 25 prose numbers of the hero, section 3 and the toy findings against `data/recompute.json` and `data/toy_summary.json`.

## Shape (rebuilt 2026-10-23 to the teaching contract)
Tabs: **Reading**, **Speedrun records** (an explorer across all 92 records, kept as a tab because it answers "across all records, which kinds of change bought the speed"), **Further reading**. The Anneal a toy tab was folded into Reading: it explained one mechanism (the anneal's two levers), so its four-cell grid and loss curves now sit in section 5 beside OLMo 2's Table 11, and its per-character heatmap sits in section 2 beside the claim it proves ("the average hides the floor"); its setup is a closed block.

Reading: core idea and hero (SmolLM3's whole run with the page's decisions numbered on it), You need, new terms; 1 objective (five-objective stepper, T5 bars); 2 loss (toy heatmap); 3 **compute and scaling laws, new** (C = 6ND with the Llama 3.1 405B check, the loss surface, an IsoFLOP slider on compute whose defaults land on Chinchilla's 70B on 1.4T within 3% and 5% independently, Kaplan against Chinchilla, flatness and Meta's own fit, an over-training slider on tokens per parameter at Chinchilla's loss with break-even and the size floor, data and repetition linked to Data mixing, muP); 4 data stages (GPT-3 / OLMo 2 / SmolLM3 stepper); 5 the anneal (Table 11 predict and bars, the toy's four cells); 6 running at scale (WSD and cooldowns, batch ramps, stability guards linked to the normalisation page, Llama 3's 466 interruptions, evaluation); 7 open recipes (table closed, corrections visible); Depth (labels, SmolLM3's implied 26% MFU, one design question).

## What changed and why
- **Grew where the subject needed it.** Scaling laws were five bullets and a link to the root's calculator; this page owns them (OWNERS.md), so section 3 now teaches the budget, the loss surface and both allocations with two one-variable sliders (`26_js_rd_scale0.js` engine, `26_js_rd_scale1.js` UI), each with a predict question. Constants are the ones the root's Scaling calculator uses, so the two pages agree.
- **Visuals inline.** Before: 1 inline (audit), 2 in tabs. After: 5 drawn inline (hero, IsoFLOP valley, over-training curve, run stepper, toy loss curves) plus the objective stepper, T5 bars, Table 11 bars, the toy cells and the heatmap as HTML figures; 1 in a tab (speedrun chart).
- **Nothing moves before the reader acts**: `21_js_rd_common.js` and `99_js_tabs.js` are the templates (storage key `pretrain-tab`); the mode toggles of the objective and run steppers no longer start playback.
- **Deleted as fat**: the four-decisions box (the hero carries it), the "what this page does not repeat" paragraph (links now sit where each topic comes up), the common-mistakes list (each one restated a section's point; the speedrun one stays on its tab).
- **Moved to closed blocks**: the open-recipes cards (as of October 2026, partly vendor-reported), the toy setup, Approach 3's two answers, the labels legend.

## Length judgement
| | Before | After |
|---|---|---|
| Reading core | 3,945 words, 17 min | 5,377 words, 23 min |
| Reading closed | 188 words, 1 min | 950 words, 4 min |
| Other tabs core | toy 1,018, speedrun 657, further reading 792: 11 min | speedrun 685, further reading 865: 7 min |
The subject's core reading (Reading plus the toy tab the old Reading sent readers to) went from about 21 to 23 minutes while adding the scaling-law section the page owns and was missing (about 1,100 words with two sliders). The length is right: the ledger is mostly core (174 core, 23 depth, 19 fat), each section is one decision of a real run with its figure, and what the page does not own (optimiser maths, parallelism, loss spikes, repetition law, corpora) is a sentence and a link.

## Ledger
`src/ledger.json`: 216 units (211 drafted from the page as built on 2026-10-19, 5 added by hand for the toy findings that were script-written): core 174, depth 23, fat 19, problems 0 (`python3 html_utils/ledger.py check`).

## Parts
- `20_read_a.html` (tab and styles) to `20_read_f.html`; JS `21_js_rd_common.js` (template), `22_js_rd_obj.js` (five objectives), `23_js_rd_t5.js` (T5 bars), `24_js_rd_run.js` (run stepper and the hero), `25_js_rd_anneal.js` (Table 11 split), `26_js_rd_scale0.js` / `26_js_rd_scale1.js` (scaling engine and sliders), `31_js_toy_data.js` (generated) and `32_js_toy.js` (toy cells, curves and heatmap, now in Reading).
- `35_tab_speed.html`, `36_js_speed_data.js` (generated), `37_js_speed.js`.
- `39_tab_more.html` Further reading; `99_js_tabs.js` tab wiring (storage key `pretrain-tab`).

2026-10-26 (final follow-up sweep): section 3 adds Sardana et al.'s finding that loss keeps falling out to 10,000 tokens per parameter (from the Chinchilla paper page); the span-corruption arithmetic links the T5 paper page's span explorer (#spx-h).

## 2026-10-26: owner of the inference-aware optimum
Khalid's decision: this page owns Sardana et al.'s inference-aware optimum; the Chinchilla paper page links here. Added what only Chinchilla carried: the Eq. 3 objective (6ND_tr + 2ND_inf at fixed loss), the paper's 13B to 7B example (1.7e22 FLOPs, 17%), that only the 150M model reached 10,000 tokens per parameter, and the section 5 caveat on fits at extreme ratios (checked against arXiv 2401.00448v2). Ledger: 3 units added. Reading 23 to 24 min core.

## 2026-10-26: the inference-aware stepper moved here from the Chinchilla paper page
Decision 4 (paper pages own only their own paper's results): the Chinchilla page's before/after animation of Sardana et al.'s optimum now sits in section 3 beside the Sardana text (`#sa-card`, `parts/26_js_rd_scale2.js`, drawn with `RD.anim`, never autoplays; a mode switch or a new quality or fit redraws the same step). The engine is `PTS.sardana` in `26_js_rd_scale0.js`; `recompute.py` holds the same solver (`scale.sardana`, three examples, Hoffmann unrounded and Besiroglu fits) and `check_data.py` compares the two; `check_controls.mjs` steps it through every quality and fit in both modes and checks it stays on step 0 on screen and after a mode switch. Fits offered: Hoffmann et al. unrounded (the constants Sardana et al. used; reproduces 13B to 7.1B, 1.6e22 FLOPs, 16%) and the Besiroglu refit; the Chinchilla page's rounded-constants option was dropped. Ledger: 4 units added (223). Reading 24 to 26 min core, plus 4 closed.

## 2026-11-10: the split layout and two 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html` (added to `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `pretrain-tab`). `build.sh` now writes its em-dash test as `ED=$(printf ...)`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea (core, you need, terms) | split | hero, 2D static (SmolLM3's whole run) | no |
| Reading | 1 The objective | split | five-objective stepper, 2D (`RD.anim`) | yes, 4 per objective (5 lists) |
| Reading | 1 How much the choice is worth | split | T5 bars, 2D | no |
| Reading | 2 Reading the loss | split | **3D** `stg-ls` (Fig. 2) | yes, 7 |
| Reading | 3 Compute and scaling laws | split | **3D** `stg-sc` (Fig. 3) | yes, 4 |
| Reading | 3 Kaplan, the flat valley | split | IsoFLOP slider, 2D | no (reader-driven) |
| Reading | 3 Beyond Chinchilla | split | inference-aware before/after, 2D (`RD.anim`) | yes, 6 per mode (2 lists) |
| Reading | 3 Over-training, priced | split | over-training slider, 2D | no (reader-driven) |
| Reading | 3 Tokens, hyperparameters | full width | none | no |
| Reading | 4 Data in stages | split | run stepper, 2D (`RD.anim`) | yes, 4 / 5 / 6 (3 lists) |
| Reading | 5 What the anneal buys | split | OLMo 2 Table 11 bars, 2D | no |
| Reading | 5 The missing cell | split | the toy's four cells and curves, 2D | no |
| Reading | 6, 7, Depth | full width | none (table closed) | no |
| Speedrun records | intro; which kinds and what graduated | split (two) | log-time chart (a widget, `auto:false`), share bars | no |
| Further reading | | unchanged | | |

**Stages and their data.** `stg-ls` (`33_js_sc_ls.js`): the toy's per-character loss (`TOY.seeds[0].heat`, seed 1, from `toy/runs` via `mk_toy.py`) on the held-out passage at steps 0, 600, 2,000 and 6,000 and after the same-mix and maths-heavy anneals (LR to zero); it draws the passage's last 41 characters as tiles with one column of loss each, the means by kind of character over the whole passage as ticks, the operand floor (log2 9 + log2 10) / 2 as a glass plane and the operands streaming into the answers. It replaces the 2D heatmap stepper and its branch buttons (steps 6 and 7 compare two branches; the four cells stay in section 5). `stg-sc` (`33_js_sc_sc.js`): `PTS` (the page's engine, which `check_data.py` compares with `recompute.py`) under the Besiroglu refit: the surface L - E over 1B to 3T parameters and 30B to 100T tokens, the IsoFLOP curtain at 5.76e23 with the optimum, Chinchilla, Gopher and Kaplan's rule, the valleys from 1e21 to 3.8e25 and the compute-optimal path, and the level plane at the optimum's loss with 100 and 1,868 tokens per parameter and the size floor. Both scenes write their numbers into the step lists from the data; the static HTML carries the defaults and `check_stages.mjs` fails if they differ. The Sardana stepper's lists follow its quality and fit selects the same way (`data-sa`).

**Tried and dropped**: a 3D version of the data stages (each run's tokens as a slab with its mix stacked inside, the learning rate as a ribbon, the last 5% magnified in front). The schedule is a curve on a token axis and the anneal a sliver of it; in depth the two slabs overlapped and the ribbon was harder to read than the flat chart, so section 4 keeps the 2D stepper, now with step lists.

**Kept 2D, and why**: the hero and the run stepper (schedules: a learning-rate curve against tokens), the T5 and OLMo 2 bars and the toy's cells and curves (values on one axis), the IsoFLOP and over-training sliders (log axes the reader drives), the Sardana before/after (an iso-loss curve on log axes plus bars), the speedrun chart (log time against date; a reader-driven explorer).

**Motion**: every 2D stepper autoplays once half in view and stops for good on a reader control (`RD.anim` template); the per-step captions (`ob-cap`, `rn-cap`, `sa-cap`, the heatmap's `ty-cap`) are gone, their text is now the static step lists; mode toggles swap the list and replay. The speedrun replay (92 records month by month) is a widget, `auto:false`.

**Removed**: the heatmap card (`ty-card`, its branch buttons, sample box and counters) and its code in `32_js_toy.js`; the step captions and sources strings in `24_js_rd_run.js` (the sources are static paragraphs under the run stepper's lists).

**Length**: Reading core 5,891 words (25.6 min) before, 7,636 (33.2 min) after; closed 998 (4.3 min) unchanged; Speedrun records 685 to 705 core, closed unchanged; Further reading unchanged. The growth is the step lists, 1,803 words, which replace step captions the scripts used to write (invisible to the audit): 920 words in the lists shown by default and 883 (3.8 min) in the lists of the other modes (four more objectives, two more recipes, the inference-aware mode), which a reader sees only on switching. Two prose passages that the lists now carry were condensed (section 4's recipe summary; one sentence of section 3 moved into Fig. 3's steps). Header: "Reading: 33 min, plus 4 in closed details."

**Ledger**: 223 units, core 180, depth 23, fat 20, problems 0. Re-keyed: 6 units whose sentences moved into Fig. 2's steps or changed wording (ids 79, 153, 154, 155, 157, 163); 15 Further-reading units whose keys contained a reading time, now keyed on their titles; 1 to fat (156, the heatmap's branch buttons).
