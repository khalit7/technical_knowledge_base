Source of the interactive HTML on the Notion page "Classical ML" (https://app.notion.com/p/3c65c17b0d0d81ffb886ff30176bc6ce), a child of Topic: ml-fundamentals.

Build: `sh build.sh` writes `../index.html` from `parts/` (parts listed explicitly in `build.sh`).

## Shape

`.claude/skills/explainer-page/page-kinds/topic-child.md` (a child page). Reading follows the subject's own logic: in one screen (the map and a "how it decides / assumes / strong / weak" table), then 1 linear models and naive Bayes, 2 trees, 3 ensembles (bagging, boosting, XGBoost / LightGBM / CatBoost), 4 the dated benchmark evidence, 5 SVMs, 6 kNN, 7 clustering, 8 anomaly detection, 9 dimensionality reduction, 10 hyperparameter search, common mistakes. Tabs: Reading, Boundary lab, Further reading. One departure: the benchmark section (4) is a dated leaderboard view inside Reading rather than a data tab, because it answers one question of this page and the parent root already links the evidence at comparison level.

Not rebuilt, linked instead: the parent's comparison-level summary (Reading, "Beyond one network"), its "When training goes wrong" tab (where the deleted Debugging training page went); the margin view of hinge against logistic and exponential losses (Loss functions); ridge and lasso geometry (Regularisation); calibration of a real naive Bayes model and rare-positive precision-recall (Evaluation metrics); Newton steps and XGBoost's worked leaf example (Calculus and optimisation for ML); ANN indexes (Embeddings and vector search).

## Engine and checks

`parts/30_js_ml.js` (`window.ML`) implements CART trees (sklearn's float32 inputs, midpoint thresholds and its own feature-drawing generator, so ties break identically), bagging and random forests, gradient boosting (log-loss with the Newton leaf update, and squared error), L2 logistic regression (Newton), kNN, a C-SVC by SMO with libsvm's second-order working-set selection, Lloyd's k-means, k-means++, full-covariance Gaussian mixtures by EM, DBSCAN (sklearn's stack order), PCA by Jacobi, and a Gaussian process with expected improvement. `SK_SEEDS` holds the first 300 draws of `np.random.RandomState(0).randint(0, 2**31 - 1)`, the per-tree seeds scikit-learn uses.

| Check | Result |
|---|---|
| `check/ref_sklearn.py` then `node check/check_ml.mjs` (writes `check/summary.json`; `check/ref.json` is 3.4 MB and gitignored, regenerate it) | trees identical at every depth on all five datasets; kNN identical; logistic regression within 1e-7; gradient boosting identical with depth 1, within 0.035 log-odds with depth 3 (floating near-ties); bagging identical except one tree at one grid point on two datasets; SVM decision values within 0.013 of libsvm, identical support-vector sets in 24 of 30 settings (the rest differ by one or two borderline points); mcycle tree, bagging and boosting identical (1e-13); k-means 1e-15; GMM 1e-15 after 1, 5, 30 iterations; DBSCAN labels identical; PCA ratios 1e-15 |
| `node check/check_search.mjs` | Bayesian-optimisation paths equal to the NumPy port for 3 seeds, 40 of 40 steps each |
| `recompute.py` (`inputs/recompute.json`) | every number quoted in prose, from scikit-learn: tree depth accuracies, mcycle errors (tree, boosting, sklearn forests over 5 seeds), SVM C sweep, PCA, surface statistics, grid values, BO distributions |
| `sh html_utils/checkpage.sh <page folder>` | fail=0, emdash 0, errbox 1 |
| `node <page>/src/check/check_controls.mjs <page>/index.html` (from the repo root): every control in 390 px dark and 920 px light, every animation stepped to its end, every lab model and slider extreme, then reduced motion | clean: no errors, no NaN / undefined / Infinity, no sideways scroll, nothing moves before the reader acts |
| `node check/hero_numbers.mjs` | the hero caption's numbers (`check/hero_numbers.json`) |
| `python3 html_utils/ledger.py check <page>` | problems 0 |

## Data (all small, in `inputs/`)

| File | What |
|---|---|
| `datasets.json` (`data/prep.py`) | five 2-D classification sets (four synthetic, labelled; Wisconsin breast cancer, two features, real), mcycle, Old Faithful, UCI Wine, three clustering sets |
| `svm_digits_surface.json` (`data/svm_surface.py`, about 22 min on 2 cores) | 5-fold CV accuracy of an RBF SVC on sklearn digits over 41 x 37 (C, gamma) |
| `tabarena/*.csv` | TabArena v0.1.9.4 leaderboards (models, imputation off) and BeyondArena by size, downloaded 3 October 2026 from huggingface.co/spaces/TabArena/leaderboard |
| `mcycle.csv`, `faithful.csv` | Rdatasets mirrors |
| `recompute.json` | outputs of `recompute.py` |

`data/mk_data.py` packs them into `parts/31_js_data.js` (`window.CD`). Python: `uv run --with scikit-learn`.

## Parts

`01_head.html` (CSS shared with the siblings plus this page's), `10_header.html`, `20_read_a.html` (the idea in one screen and sections 1 to 4), `20_read_b.html` (5 to 10, mistakes), `50_tab_lab.html`, `59_tab_more.html`; JS: `21_js_rd_common.js` (the explainer-page skill template: RD helpers and the step controller, never autoplays), `22_js_rd_fmt.js` (this page's number formats), `30_js_ml.js`, `31_js_data.js` (generated), `32_js_plot.js` (canvas helpers), `33_js_models.js` (fit and draw one of seven classifiers), `34_js_rd_hero.js` (the hero: three model shapes on the same points), `40` tree depth animation, `41` one tree / forest / boosting animation, `42` leaderboard bars, `43` SVM C sweep animation, `44` distance concentration, `45` clustering animation, `46` PCA raw against standardised, `47` search animation, `48_js_rd_iso.js` (isolation forest stepper on Old Faithful), `51_js_lab.js` (ids `lb-`), `99_js_tabs.js` last.

Size: about 270 KB, of which 117 KB is data.

## The 2026-10-24 rebuild to the teaching contract
What changed and why (`.claude/skills/explainer-page/teaching/teaching-contract.md`):
- **Top**: the core idea in one sentence, a new hero (logistic regression, a depth-3 tree and boosting with 100 depth-2 trees fitted to the same points, live, data selectable; on circles 50.0%, 88.3%, 98.3% held out; on the real tumours the line already wins, 90.6% against 90.1%), "You need" and new terms. The paradigm map moved to a closed block.
- **New visuals inline where a mechanism had none**: naive Bayes double counting (static bars, derived 75%, 90%, 96.4%); level-wise against leaf-wise tree growth (static SVG, XGBoost depthwise and max_depth 6 against LightGBM num_leaves 31); an isolation-forest stepper on the real Old Faithful eruptions (one random tree isolating the most and least anomalous eruption, then the score over 100 trees on samples of 256). CM10 in `viz_ideas.md`, rejected before, is now built: the contract asks for a visual for every mechanism.
- **No autoplay**: the template controller replaces the old one (which played on first view); mode switches in the ensemble, SVM, clustering and search animations now reset to step 0 instead of playing. `check/check_controls.mjs` confirms it.
- **Moved to closed blocks** (depth, not fat): every "checked against scikit-learn" provenance line under a card, the leaderboard reading notes, the four studies' quotes (the three Grinsztajn reasons stay in the core prose), XGBoost's objective, leaf weight and gain with the Huber correction, the SVM cost, Platt and solver details, the clustering comparison table, the other anomaly detectors, the search-surface analysis.
- **Ownership**: ridge, lasso and elastic net are reduced to one clause and a link to Regularisation (ledger unit owned there); calibration and rare-positive evaluation stay linked to Evaluation metrics; SVD and projections to Linear algebra for ML (now in "You need" and section 9).
- **Mistakes**: four of seven were restatements of what the core now shows (tree depth, early stopping, k-means restarts, t-SNE reading); three remain, and the n_init advice was merged into the third.
- The Boundary lab stays a tab: it is a tool used across the page (linked from the hero and sections 1, 2 and 6), not one mechanism.
- No photos: nothing on the page is a physical object; the diagrams carry the mechanisms.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 27.7 min (6,365 words) | 24.6 min (5,654) |
| Reading, closed details | 0.9 min | 7.8 min |
| Boundary lab | 1.7 min | 1.7 min |
| Further reading | 2.3 min | 2.3 min |
| Visuals in Reading | 9 | 15 (one hero of three panels, three new) |

Why about 25 minutes is right: the page owns ten method families plus the tabular-benchmark question, each now with a picture beside its claim; about a fifth of the core words are captions written by the animations. What was cut from the core is provenance and secondary detail (now closed, nothing lost) and four restated mistakes. Going shorter would mean dropping a family the brief says this page owns.

## Knowledge ledger (`ledger.json`)
209 units: core 147, depth 45, fat 16, owned 1 (ridge and lasso, at Regularisation). 197 were drafted by `ledger.py init` from the old page; 12 were added for the new visuals and for script-hidden or merged material. Fat units carry a `note` (navigation, tab names, fragments, restatements, the old reading-time line). `python3 html_utils/ledger.py check`: problems 0.
