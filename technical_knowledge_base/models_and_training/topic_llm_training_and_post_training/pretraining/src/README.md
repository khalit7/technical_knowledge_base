# Pretraining: HTML-only page source

Replaces all text of https://app.notion.com/p/3c65c17b0d0d814f82cffd0d5c0dd5ba (saved verbatim in `live.md`, fetched 2026-09-22 state). No child pages, databases or video on the live page.

## Build and data
- `sh build.sh` runs `recompute.py`, `mk_toy.py` and `mk_speedjs.py`, then assembles `../index.html` from `parts/` (one `<script>` per JS part, tab wiring last, hidden error box). Links are written `{{text|url}}`, `{{text|n:<notion id>}}` or `{{text|#t-<tab>}}`.
- `recompute.py` recomputes every derived number shown (T5 ranges in standard deviations, per-512 objective counters, tokens per parameter, OLMo 2 LR at the cut and anneal share, Table 11 split and GSM* standard errors, SmolLM3 maths tokens, speedrun speed-up and shares) into `data/recompute.json`.
- `mk_speedrun.py` parses the record table of `inputs/modded_nanogpt_README.md` (fetched 2026-10-03) into `data/speedrun.json`, with this page's category per record (the CAT lists in the script); `mk_speedjs.py` writes `parts/36_js_speed_data.js`.
- `toy/train.py` is the toy experiment (character-level GPT, 818,688 parameters; stage 1 of 6,000 steps at constant LR, then four 1,200-step branches: LR flat or linearly to zero, crossed with 3% or 25% maths sequences; seeds 1 to 3). Run: `cd toy && OMP_NUM_THREADS=2 uv run --with torch python train.py` (about 11 minutes per seed on two CPU threads). The corpus is six Project Gutenberg books in `toy/corpus/` (gitignored, about 4 MB; fetch with `curl -sL https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt` for ids 1342, 11, 1661, 84, 98, 2701). Outputs go to `toy/runs/` (`meta.json`, `seed<k>.json`, about 100 KB each); `mk_toy.py` packs them into `parts/31_js_toy_data.js` and writes `data/toy_summary.json`.
- `recompute.py` also computes section 3 (scaling laws): the three fits (Hoffmann unrounded and Eq. 10, Besiroglu refit), Kaplan's rule, optima at 1e21, 5.76e23 and 3.8e25, the over-training table at Chinchilla's loss, the size floor and the 6ND checks, into `data/recompute.json` under `scale`.
- `mk_coverage.py` writes `coverage.json` (every fact of `live.md`, where the HTML carries it, probe-checked against `index.html`; probes updated 2026-10-23). `ledger.json` (below) now governs.
- `check_controls.mjs` (run from the repository root) exercises every control in 390 px dark and 920 px light, fails on errors, the error box, sideways scroll or NaN/undefined/Infinity, and checks that no stepper moves before the reader acts (normal and reduced motion). It replaced `check_page.mjs`.
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
