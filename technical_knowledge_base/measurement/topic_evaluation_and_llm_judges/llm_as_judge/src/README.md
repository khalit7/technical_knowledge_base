# Build notes: LLM-as-judge

Page prefix `lj`, storage key `lj-tab`. Rebuilt 2026-10-24 to the teaching contract (editing only, no new runs).

## Build and checks
- `sh src/build.sh` writes `../index.html` from `parts/` (the explainer-page template build plus one line that embeds `inputs/mtbench_votes.json` as `window.MTB`).
- `mk_data.py RAW` builds `inputs/mtbench_votes.json` (about 100 KB) from the released MT-Bench files (URLs in its docstring; raw files about 70 MB, kept outside the repo).
- `extract_calm.py` extracts CALM Table 4 from the arXiv HTML into `inputs/calm_table4.tsv`; `22_js_calm.js` was generated from that file.
- `recompute.py` recomputes, independently of the page, every derived number (Table 5 reproduction, protocol readings, win rates and Spearman, every calibration slice and the 200-draw coverage with the same mulberry32 draw) into `recompute.json`.
- `check_page.mjs` (run from the repo root) clicks every control at 390 dark and 920 light (reduced motion), checks for errors, NaN, undefined, sideways scroll and SVG text under 11 px, checks every Reading figure is drawn, and compares the page's numbers (stepper, hero, kappa figure, order figure, list figure, protocol lab, Table 5, 200 draws) with `recompute.json`: `problems 0`.
- `inputs/source_excerpts.md`: verbatim excerpts of the 2026 papers the page leans on (Lee et al., RoPoLL, Norman et al.) and others.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check`: problems 0).

## Parts
| Tab | Parts |
|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, core sentence, hero, you need, new terms, in one screen, modes, prompt), `20_read_b` (biases, CALM grid, exploits), `20_read_c` (calibration: gold slice, kappa, stepper, formula, slice-size lab, reliability against validity), `20_read_d` (juries, judge models, meta-evaluations, list vs item), `20_read_e` (checklist, depth); JS `21_js_rd_common.js` (skill template, never autoplays), `21_js_rd_lj.js` (`RD.onTab`, `RD.onResizeTab`, `window.LJ` computations), `22_js_calm.js`, `23_js_anim.js` (gold-slice stepper), `23_js_rd_cal.js` (slice-size lab), `24_js_rd_figs.js` (ten static figures) |
| Protocol lab `t-proto` | `31_tab_proto.html`, `31_js_proto.js` |
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
