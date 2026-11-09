# Build notes: LLM-as-judge

Page prefix `lj`, storage key `lj-tab`. Rebuilt 2026-10-24 to the teaching contract (editing only, no new runs).

## Build and checks
- `sh src/build.sh` writes `../index.html` from `parts/` (the explainer-page template build plus one line that embeds `inputs/mtbench_votes.json` as `window.MTB`).
- `mk_data.py RAW` builds `inputs/mtbench_votes.json` (about 100 KB) from the released MT-Bench files (URLs in its docstring; raw files about 70 MB, kept outside the repo).
- `extract_calm.py` extracts CALM Table 4 from the arXiv HTML into `inputs/calm_table4.tsv`; `22_js_calm.js` was generated from that file.
- `recompute.py` recomputes, independently of the page, every derived number (Table 5 reproduction, protocol readings, win rates and Spearman, every calibration slice and the 200-draw coverage with the same mulberry32 draw) into `recompute.json`.
- `check_stages.mjs` (run from the repo root; 2026-11-09): the four 3D stages play once scrolled into view, stop redrawing off screen, never move under reduced motion, reach their last step with one step-list item per step in every mode, and every number in the step lists equals what the scenes compute (`window.LJS`); the Judge bias lab's one-pair animation plays in view, has one list item per step and stops for good on a list click; splits are two columns at 1400 px only.
- `check_page.mjs` (run from the repo root) clicks every control at 390 dark and 920 light (reduced motion), checks for errors, NaN, undefined, sideways scroll and SVG text under 11 px, checks every Reading figure is drawn, and compares the page's numbers (stepper, hero, kappa figure, order figure, list figure, protocol lab, Table 5, 200 draws) with `recompute.json`: `problems 0`.
- `inputs/source_excerpts.md`: verbatim excerpts of the 2026 papers the page leans on (Lee et al., RoPoLL, Norman et al.) and others.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check`: problems 0).

## Parts
| Tab | Parts |
|---|---|
| Reading `t-read` | `02_split.html` (skill template, the split layout), `20_read_a` (styles, nav, core sentence, hero, you need, new terms, in one screen, modes, prompt), `20_read_b` (biases, CALM grid, exploits), `20_read_c` (calibration: gold slice, kappa, the gold-slice stage's controls and step lists, formula, slice-size lab, reliability against validity), `20_read_d` (juries, judge models, meta-evaluations, list vs item), `20_read_e` (checklist, depth); JS `21_js_rd_common.js` (skill template), `21_js_rd_lj.js` (`RD.onTab`, `RD.onResizeTab`, `window.LJ` computations), `22_js_calm.js`, `23_js_rd_cal.js` (slice-size lab), `24_js_rd_figs.js` (seven static figures), `25_js_s3.js` (skill template, renderer v2), scenes `26_js_sc_modes.js`, `27_js_sc_order.js`, `28_js_sc_gold.js`, `29_js_sc_jury.js` |
| Protocol lab `t-proto` | `31_tab_proto.html`, `31_js_proto.js` |
| Judge bias lab `t-bias` | `32_tab_bias.html`, `32_js_bias_a.js`, `32_js_bias_b.js`, `32_js_bias_data.js` (written by `bias/mk_data.py`; `bias/recompute.py` and `bias/check.mjs` check it). Moved here from the topic root on 2026-10-24 at the topic close, intact except that it no longer starts playing on scroll |
| Further reading `t-more` | `39_tab_more.html` |

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence, a hero figure (the judge as an instrument: biases leak in, a gold slice corrects what comes out, on GPT-3.5-turbo's real numbers), "You need", new terms; the old lead paragraph and reading-time note were fat.
- **Every core idea has its visual inline** (audit: visuals inline 0 before, 11 after): four-mode diagram, prompt anatomy, one order against both (kappa and tie rate, the price of the position fix), CALM grid (kept), null model against the best real model, kappa worked on the real 3x3 matrix, the gold-slice stepper (kept), reliability against validity, jury mean against median (illustrative, labelled), JudgeBench by judge family, win-rate dumbbell for list against instance level.
- **Calibration lab tab moved into Reading** beside the stepper it extends (it explains one mechanism); the Protocol lab stays a tab because the modes, biases, kappa and list sections all use it.
- **Depth into closed blocks**: corrections to the old page, Critique Shadowing step by step (human_evaluation_and_annotation links here for it and does not carry it), the six CALM-measured bias rows, null-model table and the Cohere claim, RoPoLL's experiments, the fine-tuned-judge and meta-evaluation tables, GenRM and agent-as-judge evidence, the answer to the slice-size prediction.
- **Common mistakes** removed: each restated a core section (fat in the ledger); the one that taught something new (non-tie agreement across protocols, 89.2% against 86.9%) moved into Modes.
- **Correction**: the one-order kappas are 0.284 and 0.256 (exact: 0.28445, 0.25650); the old page's 0.285 and 0.257 were rounded twice. Said on the page.
- **No autoplay**: `21_js_rd_common.js` is the skill template; the stepper no longer starts on a mode switch (checked: slider stays at step 0 after 3.5 s on screen and after a mode switch).
- `build.sh` replaced by the template (the old one held a literal em-dash in its check line).

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm, `audit_pages.mjs`) | 29.3 min (6,742 words) | 24.5 min (5,641 words) |
| Reading, closed details | 1.2 min | 7.0 min |
| Protocol lab | 3.4 min | 3.4 min |
| Calibration lab | 1.8 min | (moved into Reading) |
| Further reading | 3.4 min | 3.4 min |
| Visuals drawn in Reading | 0 | 11 |

Why about 25 minutes is right: the page owns the whole judge lifecycle (design, prompt, eleven biases with measured sizes, exploits, kappa, the pass-rate correction and when it saves labels, reliability against validity, juries, four judge families, meta-evaluations, list against instance level); 261 of 311 non-fat units are core, and about a fifth of the core words are figure captions and the moved slice-size lab's controls. Per-item tables, the CALM row detail, provenance and corrections are closed (7 minutes).

## Knowledge ledger
345 units: core 261, depth 50, fat 34 (each fat unit carries a `note`). 335 were drafted from the old page by `ledger.py init` (344 sentences, 9 sentence fragments merged into their units); 10 were added by hand for the new figures and the Table 5 reproduction box (`note` says so). No unit is `owned:` elsewhere: kappa for judges, Critique Shadowing and the correction live here.

## Topic close (2026-10-24)
- Received the root's Judge bias lab as tab `t-bias` (with `src/bias/`); links that pointed at the root's lab now point at this tab.
- Added a closed block under "The bias catalogue": Zheng et al. Table 2 per judge (GPT-4 65.0%, GPT-3.5 46.2%, Claude-v1 23.8% consistent) and the pointwise 60% against pairwise 66% from Table 5, carried from the root's retired grading-mode animation. Closed details stay at 7 minutes (1,723 words).
- Further reading: root card (15 min, Judge atlas only), sibling times, Guardrails moved to related pages.

## 2026-11-09: split layout and four 3D stages (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (added to `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (key `lj-tab`). `build.sh` already wrote the em-dash check from octal escapes.
- **Splits** (text left, visual right, sticky): the idea with the hero; judge design (Fig. 1); prompt anatomy; the bias catalogue's position bias (Fig. 2); exploits with the null-model chart; kappa; correcting the pass rate (Fig. 3); the slice-size lab beside Lee et al.'s three results; reliability against validity; juries (Fig. 4); judge models with JudgeBench; list against instance level. Full width: in one screen, the modes table, the bias table and CALM grid, the Critique Shadowing block, meta-evaluations, checklist, depth. Protocol lab tab: notes left, controls and charts right. Judge bias lab: the one-pair animation is a split with an 8-item step list (written from its old captions, which are gone from under the card); padding, measured rates and mitigations stay full width (widgets without prose).
- **Fig. 1 `stg-modes`** (5 steps) replaces the 2D four-mode diagram: one released comparison (question 81, turn 1, GPT-3.5-turbo against Alpaca-13B) through four lanes, inputs flowing through a glass judge plate into each mode's verdict (GPT-4's real score 7 of 10 and pairwise verdict); step 3 draws both modes' agreement with the 2,249 votes on the 10 pairs without Vicuna (`LJ.agree`) against the 68.7% human-human level; the reference lane draws Zheng et al. Table 4 (14, 6, 3 of 20); the checklist answers are labelled illustrative. The five mode paragraphs became the step list.
- **Fig. 2 `stg-order`** (4 steps) replaces the 2D one-order-against-both chart: question 97, turn 1 judged with GPT-4 in slot A, then swapped (the verdict follows slot A both times, fields 8 and 9 of the leaderboard run), then all 532 comparisons with both orders as tiles, the 73 that changed raised and coloured (14 first-shown, 24 second-shown, 35 a tie in one order; newly computed, said on the page), then kappa and tie bars (`LJ.agree` F, B, FB).
- **Fig. 3 `stg-gold`** (8 steps corrected, 4 naive; model and slice selectors kept) replaces the 2D dot stepper `23_js_anim.js` (removed): one tile per human non-tie vote, the judge's sweep, the raw rate bar, the seeded slice rising out of the field, its TP/FN/FP/TN colours, the four counts as a bar field on a glass plate, the corrected estimate with its interval, the truth. The step lists are written by the scene for the chosen model and slice; the static HTML holds the default (GPT-3.5-turbo, 100) and a mismatch is a console error.
- **Fig. 4 `stg-jury`** (4 steps) replaces the 2D jury dots: PoLL's published kappas, then the illustrative five-juror pooling (mean against median as one and two jurors collapse), flows from each juror to both pillars.
- **Kept 2D:** the hero (a map of the whole page; depth separates nothing), prompt anatomy (a document), null-model bars, the kappa matrix with its arithmetic (a 3 by 3 table with sums; Human evaluation owns the agreement-against-chance stage), reliability against validity (a schematic target), JudgeBench bars, the win-rate dumbbell, the CALM heatmap, the slice-size lab and the Protocol lab (reader-driven widgets), the bias-lab panels.
- **Checks:** `check_page.mjs` now drives Fig. 3 through `stg-gold`'s controls and reads Fig. 2's numbers from its step list.
- **Ledger:** 354 units: core 270, depth 50, fat 34 (three added by hand for the stages); keys re-pointed for the reworded pointwise and pairwise sentences, and three Further reading keys that held minutes now key on the entry's description. Problems 0.
- **Length** (`audit_pages.mjs`, 230 wpm): Reading core 26.1 to 29.2 min (6,001 to 6,723 words), closed 7.5 unchanged; Judge bias lab core 7.4 to 9.2 min (its captions, script text before, are now a counted step list). The Reading growth is the step lists: the gold-slice captions that were script text, counted for both modes although a reader sees one (about 0.7 min is the hidden naive list), plus short introductions to each figure.
