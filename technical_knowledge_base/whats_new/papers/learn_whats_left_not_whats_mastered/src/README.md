# Learn What's Left, Not What's Mastered (SA-MRPO): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81e38b0fe72f3daf44bc, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the reference folder's shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `90_js_tabs`, `mk_paper.py`, `mk_coverage.py`, `check_page.mjs`, `build.sh`), via the DeepSeekMath page's copies.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the core sentence and hero (the paper's own Figure 1, CC BY 4.0), You need and new terms; Problem; One group (Stage 1: Figure 1 in 3D through GRPO, GDPO and SA-MRPO, with γ and Eq. 1 controls; sign-flip predict question); Method (Stage 2: the four steps on one real toy batch, special cases, the 7-of-8 predict question); What it does not promise (§4.2); Setup; Results (Table 1 differences with an eval-noise band, Table 2 against the released model, code); γ (Table 4 chart, the step-0 predict question, the γ and epoch mismatches); How much to believe; What it takes; Why it matters; Connections. |
| Train the toy | `t-run` | Live ingredient: a multi-reward RL toy trained in the browser (two settings, ten methods plus a custom γ and fixed weight), all methods over 8 seeds, the γ sweep against the fixed-weight sweep (re-runnable in the page), the share of the update the easy objective draws, the PyTorch check, what the toy can and cannot test. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 to 4 with differences from GDPO, Figure 1 recomputed six ways, 13 claims checked. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: the advantage rules run live on a toy** (training-recipe row), not a trace replay: SA-MRPO is an advantage construction, and the decisive question (does it beat simply lowering the easy objective's fixed weight?) can be answered exactly on a toy with every sample, reward and budget shared. Trained in the browser, deterministic; no weights shipped. JS advantages and gradients checked against PyTorch autograd of the paper's formulas and clipped surrogate: 8.9e-16 and 3.1e-16.
- **The toy disagrees with the paper, shown, not tuned away**: in the binary-budget setting (Tables 1 and 4) SA-MRPO changes nothing measurable (the length objective draws under 4% of the update at the start); in the graded setting (Table 2) it trades length for accuracy as claimed, but a fixed smaller weight reaches 1.3 to 2.1 more points of accuracy at the same length reward. The toy design was changed once before the sweep (logged in `inputs/toy_design_log.txt`).
- **No "Then and now" tab**: the paper is six weeks old. The concurrent methods (DVAO, GD2PO, SAW, Focal Reward) are linked, not rebuilt.
- **No code tab or code card**: the paper releases no code; the card and Further reading point to GDPO's open code instead (`mk_paper.py` handles `code: null`).
- **Figures are PNGs**: Figure 1 is recomputed from its printed rewards (exact); Figure 2's curves are not read, only its printed axis ranges are used.
- **Reading length** about 20 minutes against the old page's 10 before the 2026-10-25 light pass (see below): the page owns the evidence judgement and the toy results.

## Corrections to the old Notion summary

- The γ ablation's downstream table (Table 4) is 3B only; 7B appears only in Figure 2's training curves.
- γ = 0.5 is the ablation's best, but the main 3B two-objective result in Table 1 used γ = 0.25 (Table 4's caption); the other runs' γ is unstated, and γ was picked on the test benchmarks.
- "EXCEED essentially unchanged": small, but it rises in 10 of 15 cells and falls in 2 (3B two objectives: up on 4 of 5).
- "Comparable bug rates": SA-MRPO's bug rate is equal or higher on all four code benchmarks.
- "Wall-clock overhead essentially zero" is not measured in the paper (derived, and true).
- New findings: Figure 1's SA-MRPO row matches only γ = 1 without Eq. 1; §5.5 ("one epoch") contradicts §5.1 ("3 epochs") given Table 4's columns equal Table 1's; Table 2's runs end far below the released R1-Distill-Qwen-7B; the binary length budget (4,000) sits 96 tokens under the training cap (4,096), so that objective is satisfied from the start.

## Files

- `save_live.py` (Notion fetch from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1 to `inputs/paper_v1.txt` and `inputs/table_S5_T*.txt`), `mk_tables.py` (`tables.json`, every value verified in reading order against the extracted text), `recompute.py` (`inputs/recompute.json`: Figure 1, the flip threshold, Table 1 to 4 deltas and averages, eval-noise standard errors, the share-of-update estimate, steps per epoch).
- `parts/22_js_toy.js`: the toy engine (environment, the three advantage recipes, gradient, Adam, exact evaluation); runs in the browser and in node. Since 2026-11-13 `TOY.train` takes a read-only `onBatch(t, batch)` hook (no result changes: `toy_sweep.mjs` rewrote `inputs/toy.json` and `parts/_gen_toydata.js` byte for byte).
- `stage_batch.mjs` (node, under a second, run by `build.sh`): Stage 2's data (`inputs/stage.json`, `parts/_gen_stage.js`): the batch the graded SA-MRPO γ = 0.5 run (seed 1) trained on at step 80, four groups chosen by a fixed rule (the first of each kind), GDPO's advantages on the same batch.
- `parts/31_js_sc_fig1.js`, `parts/32_js_sc_batch.js`: the two 3D scenes; `parts/25_js_s3.js` and `parts/02_split.html`: the templates, unchanged.
- `check_stages.mjs` (from the repo root with node, about 3 minutes): the layout and motion rules and the step lists' numbers (below).
- `toy_sweep.mjs` (node, about 10 s): every toy number (`inputs/toy.json`, `parts/_gen_toydata.js`).
- `check_engine.mjs` then `uv run --with torch --with numpy python check_engine.py`: `model/check_engine.json` (PASS). `model/engine_case.json` (0.8 MB) is regenerated and gitignored.
- `inputs/`: paper text and tables, `gdpo_extracts.txt` (quoted GDPO passages), `other_extracts.txt` (R1 and Qwen2.5 table rows, dataset sizes, the Sober Look abstract, GDPO licence), `toy_design_log.txt`.
- `check_page.mjs` (from the repo root with node): every control in both themes and widths, a custom live run, the full frontier sweep in the browser (must match `toy_sweep.mjs`), both stages playing when scrolled into view and stepped to the end (Stage 1 in all three modes). `mk_coverage.py`: `coverage.json`.

## Checks (3 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 4 tabs, about 161 KB. `check_page.mjs`: 0 problems; the in-browser sweep matches `toy_sweep.mjs` to 5e-5 (the sweep stores 4 decimals). `check_engine.py`: PASS. `mk_coverage.py`: 44 of 44.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then the paper's own Figure 1 as the hero (`img/fig1_rollout.webp`, CC BY 4.0, credited under it and in `img/CREDITS.md`), with a caption saying what to notice (rollouts 2 and 3: GRPO ties them, GDPO ranks the zero-correctness answer higher, SA-MRPO turns it negative) and a link to the animation that rebuilds it. Then "You need" and the new terms. The "Three things to see" paragraph after the animation was cut to the two sentences the hero does not carry.
- **Owned elsewhere, a sentence kept and linked**: GRPO's group-standardised advantage (RL for LLMs, which works one group by hand) and training-seed noise (Eval statistics).
- **Closed**: the concurrent methods (Problem), the special cases, ratio form and cost (Method), the Eq. 2 argument (one sentence stays open), every reward as defined (one sentence on the two length rewards stays open), why the base scores look low, the one-epoch-or-three mismatch (one sentence stays open). Two bullets of "How much to believe" that restated the γ section now point to it.
- **Volatile**: the 2026 family of multi-reward methods moved from Why it matters into one dated closed block (checked 25 October 2026).
- **No autoplay**: `makeAnim` patched as on the WSM page (the Figure 1 animation waits on its first step until play or a step; a recipe toggle pauses); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `samrpo-tab`, plus `data-to` scrolling). `check_page.mjs` fails if the animation draws a frame before a click, and opens every closed block. The live toy already waited for its button.
- **Takeaway softened** (paper.json, so the card, and `live.md`): "beats GDPO ... with γ = 0.5 the sweet spot" became "reports higher accuracy than GDPO ... but every cell is one training run, several margins sit inside evaluation noise, γ = 0.5 was picked on the test benchmarks in a 3B-only ablation, and a smaller fixed weight on the easy objective was never compared"; "drop-in" dropped. The Notion property needs the same edit.
- The author email in `inputs/paper_v1.txt` redacted; `extract_paper.py` now redacts emails and writes em-dashes as `--`. Header: "Reading: 19 min, plus 3 in closed details." from `reading.json` (measured by `audit_pages.mjs`).

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 20.3 min (4,673 words) | 19.4 min (4,458) |
| The paper, closed | 0 | 2.7 min (623) |
| Train the toy; tables; Further reading | 5.7; 3.3; 1.9 min | unchanged (the tables tab gains one caption line) |
| Visuals in Reading (audit) | 5 | 6 (the hero added) |

Why about 19 minutes is right: the page owns one short paper's whole argument (two failure modes, the four-step method, its limits, three result tables, the γ ablation) and an evidence judgement that is most of its value (single runs, γ chosen on test, the missing fixed-weight baseline, the toy's matched-trade-off result). The hero and terms added about 1.2 minutes; closing definitions, derivations and side findings paid for that and more. Shorter would mean closing the evidence section or the predict reveals that carry the toy's finding.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
243 units: core 219, depth 20, owned 2, volatile 1, fat 1. 237 drafted by `ledger.py init` from the page before the pass; 6 added (core sentence, hero, new terms, two owner links, the claim-list caption). The one fat unit is the wind-up "Three things to see." `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, 166 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 199 actions, 0 problems (no frame before a click; the in-browser sweep matches `toy_sweep.mjs` to 5e-5). `mk_coverage.py`: 44 of 44. The toy engine is unchanged, so `check_engine.py` was not rerun.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper tab: the top (core sentence, You need, New terms) beside the paper's Figure 1; One group beside Stage 1; Method beside Stage 2; Results (math) beside the Table 1 chart; Adaptive reasoning (new section id `s-res2`) beside the Table 2 chart; the γ section beside the Table 4 chart. Full width (no visual): Problem, What it does not promise, Setup, Code (`s-res3`), How much to believe, What it takes, Why it matters, Connections. Train the toy: the intro and the toy's definition beside the live trainer; All methods (its script-written reading of the chart moved out of the card into the left column, with a one-line lead-in) beside its chart; the frontier paragraph beside the frontier chart; the share table, the PyTorch check and the limits stay full width (a table, a check box and a list). Tables and Further reading: full width (tables and lists).
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_fig1.js`, Stage 1 (replaces the 2D `makeAnim` animation of Figure 1; its caption carousel became three step lists, `sx-grpo`, `sx-gdpo`, `sx-sa`, swapped by the recipe toggle): the four answers' rewards as bars on the floor (format orange, correctness teal), the per-objective advantages side by side on a white plinth, two glass gauges filled to s = 0.98 and 0.02 whose weights flow back into the rows, the final advantage in blue at the back, flows wherever a number is carried forward (dot count by size). Driven by Figure 1's printed rewards (`F1` in `13_js_read.js`), the γ slider and the Eq. 1 box; the counters (weights, final advantages against the printed ones, ranking) stay under the list. The camera starts close on the rewards.
  - `32_js_sc_batch.js`, Stage 2 (new; the Method section had no visual): one real training batch of the toy (graded setting, SA-MRPO γ = 0.5, seed 1, step 80, read through the engine's new `onBatch` hook by `stage_batch.mjs`), four of its 32 groups chosen by a rule fixed before looking at advantages (the first group of each kind: correctness only, both, length only, neither). Rewards on white plinths give way to the per-objective advantages (silent rows, the one loud long answer), all 256 answers flow into two glass gauges (s = 0.40 and 0.95), the weights (0.77 and 0.22) flow back and shrink the bars, then the final advantages after Eq. 1 with GDPO's on the same batch as outlines: the correct answer that ran long goes from GDPO's −1.49 to +0.27; length's share of the update falls from 40.0% to 5.2%. The four method steps (with their equations) are the step list's items 2 to 5; the batch numbers in the list are checked against `TOYSTAGE` and against the engine rerun in the page.
- **Kept 2D**: the hero (the paper's own figure, a real image), the sign-flip, 7-of-8 and step-0 predict charts (one-variable widgets inside reveals), Table 1 (differences with a noise band), Table 2 (paired bars against a reference line), Table 4 (two curves), the toy tab (curves, a scatter frontier, tables; the live trainer is a widget the reader drives, so no autoplay and no step list), the tables tab.
- **Motion**: both stages play once half in view and stop for good on a reader control (template); Stage 1 replays when the recipe toggle switches its list. `makeAnim` (never autoplay) was removed from `11_js_ui.js` with the 2D animation. `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `samrpo-tab`). `check_page.mjs` no longer asserts that nothing moves before a click: it now asserts that each stage plays when scrolled into view and steps both stages to the end (Stage 1 in all three modes).
- `check_stages.mjs` (after GRAFT's): both stages at 1400 light, 920 light and 390 dark, autoplay, one list item per step in each of Stage 1's modes, replay on a mode switch, flows stopping off screen, splits two columns at 1400, reduced motion, the live trainer not running by itself, and 40 numbers of the step lists against Figure 1 recomputed, `TOYSTAGE` and the live engine.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 19.4 min (4,458 words) | 22.3 min (5,119) |
| The paper, closed | 2.7 min (623) | unchanged |
| Train the toy; tables; Further reading | 5.7; 3.4; 1.9 min | unchanged |
| Visuals in Reading (audit) | 6 | 7 (Stage 2 added; Stage 1 replaces the 2D animation) |

The growth is the step lists: Stage 1's three lists carry the old animation's captions, which were drawn by script and invisible to the audit (about 250 words that were already read), and Stage 2's list adds the toy batch's numbers to the four method steps (about 400 words: the silent and loud rows, the two saturations and weights, the sign reversal and the share of the update), the concrete instance the contract asks for before the formula. Nothing was cut. Header: "Reading: 22 min, plus 3 in closed details."

Ledger: 249 units (core 225, depth 20, owned 2, volatile 1, fat 1); 6 added for the two stages' lists; keys re-pointed on units 28 (the animation's intro, now Stage 1's), 29 (the animation's controls and the scale note), 44 (the "Four steps" sentence, now introducing Stage 2) and 190 (the All methods heading, now in a split with a new lead-in), also recorded in `label_ledger.py`. `ledger.py check`: problems 0.
