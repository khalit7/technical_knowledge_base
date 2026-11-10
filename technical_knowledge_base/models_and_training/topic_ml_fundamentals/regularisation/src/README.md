Source of the interactive HTML on the Notion page "Regularisation" (child of Topic: ml-fundamentals).

Build: `sh build.sh` writes `../index.html` (parts listed explicitly; page prefix `rg`, storage key `rg-tab`). Data parts are generated: `uv run --with scikit-learn --with numpy python mk_diabetes.py` (parts/20_js_diab.js, inputs/diabetes.csv); `OMP_NUM_THREADS=2 uv run --with torch --with scikit-learn --with numpy python train_digits.py` (parts/30_js_digits.js, inputs/digits_mlp.json; a few minutes); `OMP_NUM_THREADS=2 uv run --with scikit-learn --with numpy python double_descent.py && python3 mk_parts_data.py` (parts/31_js_dd.js).

Shape before 2026-10-24 (kept for history): `.claude/skills/explainer-page/page-kinds/topic-child.md` (a child page). Reading followed the subject's logic: in one screen (technique, where it acts, knob, use in 2026), what regularisation is (penalty, constraint, prior), penalties with the geometry animation, weight decay (the regularisation side only; AdamW mechanics stay on the Optimisers sibling and the parent's thread 4), dropout (corrected retention, p conventions, train/inference animation, linear-model equivalence, production table), augmentation and mixing, early stopping, what each buys (published comparisons), big networks (memorisation, double descent, grokking), common mistakes. Tabs were: Coefficient paths, Dropout as an ensemble, Further reading. The parent's Training lab presets and When training goes wrong runs are linked by name, not rebuilt; "Debugging training" was folded into that tab, so the old cross-link points there.

Checks:
- `node check_core.mjs && uv run --with scikit-learn --with numpy --with torch python recompute.py`: the page's JS (lasso path by LARS, ridge, elastic net, gradient descent, held-out splits, PRNG, the dropout network's forward pass and thinned networks) against scikit-learn 1.9 and PyTorch, plus the published figures (Efron et al. section 1) and Srivastava et al.'s input-dropout = ridge result by Monte Carlo; 37 checks, results in `check/`.
- `node src/check_page.mjs` (from the repo root): every control, animation and stage step in headless Chrome, light 920 px and dark 390 px; fails on script errors, NaN, undefined or Infinity, on anything moving under reduced motion, if the step animation does not play in view or an explorer moves by itself; element screenshots in `../.shots/`.
- `node src/check_stages.mjs [shots dir]` (from the repo root, about 3 minutes): the 2026-11-06 rollout checks, see the 2026-11-10 section.
- `uv run --with torch --with numpy python check_wd.py` (from `src/`): the weight-decay animation (`parts/26_js_wd_sim.js`) against `torch.optim.Adam` and `AdamW` on the same seeded noise, float64; result in `check/wd.json` (max difference 2e-16).
- `coverage.json`: every fact of `live.md` and where the page carries it. `viz_ideas.md`: ranked ideas.

## 2026-11-10: the split layout and three 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html`, `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (storage key `rg-tab`). `27_js_wd.js` (the 2D weight-decay bars) is removed; `26_js_wd_sim.js` still drives the new Fig. 3 and is still checked by `check_wd.py`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | 2D hero (loss curves, two runs) | no (a toggle) |
| Reading | 1 Penalty, constraint, bias-variance trade | split | 2D held-out chart with slider | no (widget) |
| Reading | 1 The split, exactly | full width | formula | no |
| Reading | 2 Why L1 gives zeros | split | **3D** `stg-ge`, Fig. 2 | yes, 6 |
| Reading | 2 Explore every method | split | 2D geometry explorer (widget, opens where the lasso drops bp) | no |
| Reading | 2 Formula table, elastic net, standardise | full width | table | no |
| Reading | 3 Weight decay, two ways | split | **3D** `stg-wd`, Fig. 3 (replaces the 2D bars) | yes, 4 |
| Reading | 3 What λ multiplies, typical values | full width | none | no |
| Reading | 4 Dropout | split | **3D** `stg-dr`, Fig. 4 | yes, 5 |
| Reading | 4 Try any digit | split | 2D thinned-network explorer (widget, opens on all 30) | no |
| Reading | 4 Train against inference | split | 2D step animation `da-card` (caption carousel replaced by the list) | yes, 8 (one list, all three modes) |
| Reading | 4 Shortcut, linear = ridge, variants | full width | Monte Carlo chart closed | no |
| Reading | 5 Augmentation | split | 2D digit transforms | no |
| Reading | 6 Early stopping | full width | none (points to the explorer) | no |
| Reading | 7 What each buys | split | 2D effects chart | no |
| Reading | 8 Zhang et al. | full width | none | no |
| Reading | 8 Double descent | split | 2D random-features curves | no |
| Reading | 8 Which term makes the peak | split | 2D weak-features card | no |
| Reading | 9, 10 | full width | none | no |
| Coefficient paths | the explorer | split (notes left, chart right) | 2D | no |
| Further reading | | unchanged | | |

**Stages and data.** Fig. 2: bmi and bp of the diabetes data (all 442 patients, unit length), training error over the two coefficients as a bowl; the level is the explorer's step at 0.55 of the way from least squares to b = 0 (+36.1%); ridge (184, 132) and lasso (290, 0) found by bisection on λ exactly as in `40_js_geo.js`; the lasso knot (bp leaves at λ = 1.270, bmi 388). Fig. 3: `RGW.sim()`, frames every 100 steps, four stretches (0, 0 to 2,000 AdamW, 0 to 2,000 Adam with L2, 2,000 to 3,000 both). Fig. 4: the stored dropout network on test digit 242 (label 4), masks from `RG.rng(1000 + digit)` as in the explorer: weight-scaled says 4 (32%), the first three thinned networks 1, 9 and 7, the average of 30 says 4 (26%), the most common vote (1) gets 8 of 30. The step lists carry these as static spans (`data-ge`, `data-wd`, `data-dr`); `check_stages.mjs` compares them with the scenes and recomputes least squares, the ridge fit, the shared ellipse, decay alone and the votes independently.
**Colours** now agree across 2D and 3D: lasso blue, ridge orange, elastic net purple, the ellipse gold (the 2D explorer's region, path and ellipse colours changed to match).
**Fixes:** the effects chart wrote the longest bar's value over its row label in the narrower column (now inside the bar); `.co.warn` callouts inherited the counters' bold orange `.warn` text (now body text with an orange title).
**Checks:** `check_stages.mjs` (new, about 3 minutes); `check_page.mjs` (never-autoplay inverted: the step animation plays in view, the two explorers never move by themselves, nothing moves under reduced motion; the stages are stepped); `check_core.mjs`, `recompute.py` (37 checks, 0 failures; `check/recompute.json` rewritten with differences at 1e-12 from the library versions in the cache) and `check_wd.py` (rerun with torch 2.14.1+cpu, max difference 2.2e-16) pass.

### Length judgement
| | Before (2026-10-26) | After (2026-11-10) |
|---|---|---|
| Reading, core (230 words a minute) | 27.5 min (6,315 words) | 31.6 min (7,260 words) |
| Reading, closed details | 8.2 min | 8.2 min |
| Coefficient paths | 2.3 min | 2.3 min |
| Visuals counted in Reading (audit) | 10 | 12 |
The 945 new core words are the four step lists (Figs. 2 to 4 and train against inference); the inference list replaces a caption carousel drawn by script, so never counted before. Nothing was cut: each list is the explanation of a figure that had none in static text, and the three 3D figures show the page's three spatial mechanisms (a constrained optimum on a surface, two optimisers side by side, a network thinned unit by unit).

### Ledger
311 units: core 238, depth 50, fat 23, problems 0. Four units added for the figures' findings; six re-keyed where prompts were reworded (play to step or watch); unit 55 (where the weight-decay animation came from) is now fat; fourteen Further reading keys no longer carry a reading time.

## The 2026-10-24 rebuild to the teaching contract
Editing only, no new training runs (one new cheap check, `check_wd.py`).
- **Top**: the core idea in one sentence; a hero figure (`25_js_hero.js`): train against test loss of the page's own MLP on digits, no regulariser against dropout on the same seed, the gap at epoch 300 drawn and the early-stopping point marked (from the recorded curves that were on the Dropout tab); "You need"; new terms; the old "In one screen" table is a closed reference block.
- **Every core idea has its visual inline**:
  - bias-variance: the held-out error against λ chart with the training-size slider moved from the Coefficient paths tab into section 1, with a predict prompt and the answer in numbers (49% at m = 20, 14.6% at 40, 3.2% at 100, under 1% from 200);
  - L1 against L2: the geometry animation (unchanged), then the formula table;
  - weight decay: **absorbed** from the parent root's Reading thread 4 (Adam with L2 against AdamW on the same noise), because OWNERS.md gives this page "why AdamW decouples it" (`26_js_wd_sim.js`, `27_js_wd.js`; checked against torch);
  - dropout as an ensemble: the thinned-network stepper moved inline from the Dropout tab; the Monte Carlo against weight-scaling chart is a closed block, with its does-not-reproduce box visible;
  - train against inference, augmentation, what each buys, double descent: unchanged, each with a title saying what to notice.
- **Tabs**: the Dropout as an ensemble tab was removed (its three visuals explain one mechanism each, so they moved beside the claims). Coefficient paths stays as a tab: an explorer across all ten coefficients, with Efron et al.'s reproduction now in static text (the script line recomputes it).
- **New section 9, What large-model training still uses**: the dropout table (now with weight decay) as a closed reference block, and a prose summary with the numbers.
- **Closed depth**: the prior view, library λ conventions, the 2014 practical guide and BatchNorm interaction, AlexNet's augmentation details and RandAugment, the values behind the effects chart, the model-by-model table.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the RD controller moved out of `22_js_common.js` (which keeps `PF`); mode switches in the geometry, dropout-scaling and ensemble animations no longer start playback.
- **Mistakes** cut to the ones the sections do not show (merged conventions, training-split standardisation); restatements deleted as fat.
- **No real image**: a mechanism page; no physical object or licensed canonical figure teaches more than the diagrams.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 22.9 min | 24.1 min |
| Reading, closed details | 1.4 min | 7.1 min |
| Other tabs, core (excluding Further reading) | Coefficient paths 2.8 + Dropout 3.1 = 5.9 min | Coefficient paths 2.3 min |
| Core total, excluding Further reading | 28.8 min | 26.3 min |
| Visuals drawn in Reading | 4 (audit count) | 8 (audit count; 9 cards with the closed Monte Carlo chart) |

Why about 24 minutes is right: the Reading tab now carries the page's strongest visuals (the held-out chart, the thinned-network stepper, the weight-decay animation and the hero) with their captions, which were a click away before, and it teaches weight decay's decoupling, which used to sit on the parent. The core total fell by 2.5 minutes; what grew is closed depth (reference tables, conventions, the practical guide), which is optional. Every remaining core unit in the ledger is needed to understand one of the ten sections.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
251 units: core 193, depth 37, fat 21. 232 drafted from the old page by `ledger.py init` (keys proposed by the longest phrase still on the page, then reviewed); 19 added by hand for script-drawn text (hero numbers, held-out gains, the Monte Carlo result, the effects-chart values, Efron's reproduction, the double-descent peak), for the absorbed weight-decay animation and for two new sourced facts (stochastic depth's CutMix number, DropBlock's reason). Fat units carry a `note`: wind-ups, pointers to the removed Dropout tab, a restatement, and eleven citation fragments split off the sentence that carries the citation.

- 2026-10-24, topic close: Further reading times set to headers (root 23 min, plus 1; siblings, Pretraining); ledger keys 223 to 229 without the old times.

## 2026-10-26: bias-variance for model choice and double descent absorbed from Statistics
Khalid's ownership decision: this page owns bias-variance for model choice and double descent; Statistics keeps estimator bias and variance and links here. Moved from Statistics section 13, nothing dropped: the decomposition with its derivation (closed), ensembling against boosting with ESL eq. 15.1, into section 1; Belkin et al.'s quote, the weak-features regression (Belkin, Hsu and Xu Theorem 1) with its interactive card (every signal, four ridge strengths, the smallest singular value), the depth block on which descent wins and when more data hurts, and the "Checked against the papers" box, into section 8 after the random-features card. Script and data moved too: `weak_features_dd.py` (the simulation, seed 2019, rerun here and identical to the stored `inputs/weak_features_dd.json`; Theorem 1 recomputed; writes `check/weak_features_dd.json` and `parts/32_js_wf.js`), `parts/45_js_wf.js`, `inputs/belkin_hsu_xu_2020_theorem1.txt`; `check_page.mjs` drives every control and checks 15 numbers in the text. `build.sh` now converts LaTeX to MathML (html_utils/tex2mathml.mjs). Five double-descent papers joined Further reading. Ledger: 56 units added (copied from Statistics with their keys, `note` says which). Reading 24 to 27 min core, 7 to 8 closed (audit_pages.mjs, 230 words a minute): the added text is the owner's single best visual of double descent and the formula the page's bias-variance claims rest on.
