Source of the interactive HTML on the Notion page "Regularisation" (child of Topic: ml-fundamentals).

Build: `sh build.sh` writes `../index.html` (parts listed explicitly; page prefix `rg`, storage key `rg-tab`). Data parts are generated: `uv run --with scikit-learn --with numpy python mk_diabetes.py` (parts/20_js_diab.js, inputs/diabetes.csv); `OMP_NUM_THREADS=2 uv run --with torch --with scikit-learn --with numpy python train_digits.py` (parts/30_js_digits.js, inputs/digits_mlp.json; a few minutes); `OMP_NUM_THREADS=2 uv run --with scikit-learn --with numpy python double_descent.py && python3 mk_parts_data.py` (parts/31_js_dd.js).

Shape before 2026-10-24 (kept for history): `.claude/skills/explainer-page/page-kinds/topic-child.md` (a child page). Reading followed the subject's logic: in one screen (technique, where it acts, knob, use in 2026), what regularisation is (penalty, constraint, prior), penalties with the geometry animation, weight decay (the regularisation side only; AdamW mechanics stay on the Optimisers sibling and the parent's thread 4), dropout (corrected retention, p conventions, train/inference animation, linear-model equivalence, production table), augmentation and mixing, early stopping, what each buys (published comparisons), big networks (memorisation, double descent, grokking), common mistakes. Tabs were: Coefficient paths, Dropout as an ensemble, Further reading. The parent's Training lab presets and When training goes wrong runs are linked by name, not rebuilt; "Debugging training" was folded into that tab, so the old cross-link points there.

Checks:
- `node check_core.mjs && uv run --with scikit-learn --with numpy --with torch python recompute.py`: the page's JS (lasso path by LARS, ridge, elastic net, gradient descent, held-out splits, PRNG, the dropout network's forward pass and thinned networks) against scikit-learn 1.9 and PyTorch, plus the published figures (Efron et al. section 1) and Srivastava et al.'s input-dropout = ridge result by Monte Carlo; 37 checks, results in `check/`.
- `node src/check_page.mjs` (from the repo root): every control and animation step in headless Chrome, light 920 px and dark 390 px; fails on script errors, NaN, undefined or Infinity, or any animation that moves before the reader acts (reduced and normal motion); element screenshots in `../.shots/`.
- `uv run --with torch --with numpy python check_wd.py` (from `src/`): the weight-decay animation (`parts/26_js_wd_sim.js`) against `torch.optim.Adam` and `AdamW` on the same seeded noise, float64; result in `check/wd.json` (max difference 2e-16).
- `coverage.json`: every fact of `live.md` and where the page carries it. `viz_ideas.md`: ranked ideas.

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
