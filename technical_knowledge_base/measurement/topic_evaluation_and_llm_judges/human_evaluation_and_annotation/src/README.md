# Source for Human evaluation and annotation

`sh build.sh` writes `../index.html` from `parts/` and `inputs/`.

- `parts/`: `01_head.html` (shared look, copied from the Production sibling), `02_style.html` (page rules), `10_header.html` (title, reading time, tab bar, section nav), Reading `20_read_a.html` (core sentence, hero, you need, new terms, decisions in one screen, when to use people) to `20_read_h.html` (finding errors with the review-queue lab, the routine, preference data), `39_tab_more.html`; JS `21_js_common.js` (all statistics, prose numbers via `data-k`, `window.HE_CHECK`), `22_js_ag_anim.js` (agreement animation), `23_js_au_anim.js` (audit re-ranking animation), `24_js_read_small.js` (HelpSteer2 bars, budget calculator, prevalence widget, nav), `25_js_figs.js` (hero, rater pairings, ChaosNLI, prevalence curve, routine; drawn at the measured width), `31_js_agree.js` (agreement calculator), `32_js_audit.js` (review-queue lab), `99_js_tabs.js` (the skill template, key `hea-tab`).
- `shot_el.mjs`: screenshots chosen Reading elements at 390 dark and 920 light (run from the repository root).
- `fetch_data.py`: downloads raw data to a cache outside the repo (MMLU-Redux 2.0 rows for six subjects, Open LLM Leaderboard v1 per-question details for 18 models, MT-Bench human judgments, HelpSteer2 disagreements). `mk_data.py <cache>` writes the extracts in `inputs/` (`audit.json`, `agree.json`); `inputs/northcutt.json` is Northcutt et al. Tables 1 and S1, transcribed from arXiv HTML v4.
- `recompute.py` recomputes every derived number into `recompute.json`; `check_page.mjs` clicks every control at 390 px dark and 920 px light, steps both animations through every mode, and compares the page's JavaScript (`HE_CHECK`) against `recompute.json` (567 comparisons, 0 mismatches).
- `coverage.json`: every fact of the inherited gold-label text and the root mentions this page owns, with where it is carried or how it was corrected. `viz_ideas.md`: visuals built and rejected.

Shape (before the 2026-10-24 rebuild): Part B (child page) of `.claude/skills/explainer-page/page-kinds/topic-child.md`, ordered by the life of a label (decide, design, staff, measure agreement, interpret disagreement, control quality, build gold, audit gold, find errors, preference data). Departure: two labs instead of one, because agreement and auditing are separate mechanisms each with its own released data.

Reproductions: MT-Bench expert-expert agreement 63.0% (721 pairs) and 81.0% (479), turn 2 66.6% and 81.9%, equal to Zheng et al. Table 5 (independently, from released votes). Northcutt Table 1 mean 3.33% ("at least 3.3%"); Table S1 ranks recomputed from printed accuracies match 30 of 34 and 33 of 34 (the rest are ties ordered arbitrarily). Not reproduced, said on the page: HelpSteer2's quadratic weighted kappa (needs rater identities, not released); Northcutt's "ResNet-18 beats ResNet-50 at +6% noise prevalence" (needs untabulated per-model accuracies).

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`); editing only, no new runs or data.
- **Top**: the core sentence (a label is a measurement with three failure modes: noisy, biased, measuring the wrong thing), a hero (six stages of a label's life, each tagged with the failure it controls and one sourced number), "You need", new terms. The "In one screen" decision table is now a closed reference block.
- **Labs moved into Reading**, because each explains one mechanism: the Agreement lab is a closed calculator block under Agreement (with the "how each number is computed" notes); the Audit lab sits inline in Finding errors, with its question-by-question queue and per-model accuracy table in closed blocks. The page now has two tabs, Reading and Further reading.
- **New inline visuals** (audit: visuals in Reading 1 before, 7 after at 920 px, plus three HTML figures): hero, rater pairings dot plot, annotated rubric, prevalence curve (extends the slider; prediction prompt), ChaosNLI bars, gold-label record, the gold-error-aware routine flow, preference forms. Prediction prompts added before both animations and the review-queue lab.
- **No autoplay**: both animations already waited for Play; a mode switch now also pauses and returns to step 0 (checked: scrubbers stay at 0 after 4 s on screen and after a mode switch, normal and reduced motion). `99_js_tabs.js` is the skill template (key `hea-tab`, opens a tab named in the URL). The page has its own animation controllers, so `21_js_rd_common.js` was not added.
- **Depth into closed blocks**: the decision table, per-pool cost evidence (GPQA bonuses, HelpSteer2 counts, Prolific rates), Arena's anomalous-voter test, the corrections to the inherited facts, the agreement calculator, the review queue and the per-model score table.
- **Common mistakes removed**: each restated a core section (fat in the ledger, each with a `note`); the two that added something (pay for time with quality bonuses; builders know which output came from which version) moved into Quality control and Who annotates.
- **Stale link fixed**: Further reading named knowledge_and_reasoning's removed "Fix the key" tab; it now points at that page's Reading tab. Post-training data is linked for preference datasets used in training; LLM-as-judge's time updated to 25 min.
- `build.sh`: its em-dash check now builds the character from octal escapes, so the script itself holds no em-dash.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm, `html_utils/audit_pages.mjs`) | 28.0 min (6,443 words) | 27.7 min (6,371 words) |
| Reading, closed details | 0.8 min | 11.1 min |
| Agreement lab tab | 1.9 min | (moved into Reading, closed) |
| Audit lab tab | 7.5 min | (moved into Reading; queue and table closed) |
| Further reading | 2.8 min | 2.6 min |
| Visuals drawn in Reading at load | 1 | 7 |

Why about 28 minutes is right: the page owns the whole life of a human label (task design, raters and cost, four agreement statistics with ties and prevalence, disagreement, quality control, the gold slice, seven audits, three suspect-ranking methods, the routine, preference collection), and 241 of 267 non-fat units are core. The core now also carries what used to cost two tab visits (the review-queue lab, about 1 minute of captions and generated text) and eight new figures with their captions, while the decision table, per-item lists, cost evidence and corrections went into closed blocks. Total reading across tabs fell from about 40 minutes to 30 core plus 11 optional.

## Knowledge ledger
293 units: core 241, depth 26, fat 26 (each fat unit has a `note`). 283 were drafted by `ledger.py init`; 10 were added by hand for the new figures and the two script-rendered labs (`note` says so). Keys were proposed from each unit's own text and the rebuilt page, then checked by hand; script-filled numbers (`data-k`) are never keys. No unit is `owned:` elsewhere. `python3 html_utils/ledger.py check`: problems 0.
