Source of the interactive HTML on the Notion page "Classical ML" (https://app.notion.com/p/3c65c17b0d0d81ffb886ff30176bc6ce), a child of Topic: ml-fundamentals.

Build: `sh build.sh` writes `../index.html` from `parts/` (parts listed explicitly in `build.sh`).

## Shape

Part B of `html_utils/methods/topic_pages.md` (a child page). Reading follows the subject's own logic: in one screen (the map and a "how it decides / assumes / strong / weak" table), then 1 linear models and naive Bayes, 2 trees, 3 ensembles (bagging, boosting, XGBoost / LightGBM / CatBoost), 4 the dated benchmark evidence, 5 SVMs, 6 kNN, 7 clustering, 8 anomaly detection, 9 dimensionality reduction, 10 hyperparameter search, common mistakes. Tabs: Reading, Boundary lab, Further reading. One departure: the benchmark section (4) is a dated leaderboard view inside Reading rather than a data tab, because it answers one question of this page and the parent root already links the evidence at comparison level.

Not rebuilt, linked instead: the parent's comparison-level summary (Reading, "Beyond one network"), its "When training goes wrong" tab (where the deleted Debugging training page went); the margin view of hinge against logistic and exponential losses (Loss functions); ridge and lasso geometry (Regularisation); calibration of a real naive Bayes model and rare-positive precision-recall (Evaluation metrics); Newton steps and XGBoost's worked leaf example (Calculus and optimisation for ML); ANN indexes (Embeddings and vector search).

## Engine and checks

`parts/30_js_ml.js` (`window.ML`) implements CART trees (sklearn's float32 inputs, midpoint thresholds and its own feature-drawing generator, so ties break identically), bagging and random forests, gradient boosting (log-loss with the Newton leaf update, and squared error), L2 logistic regression (Newton), kNN, a C-SVC by SMO with libsvm's second-order working-set selection, Lloyd's k-means, k-means++, full-covariance Gaussian mixtures by EM, DBSCAN (sklearn's stack order), PCA by Jacobi, and a Gaussian process with expected improvement. `SK_SEEDS` holds the first 300 draws of `np.random.RandomState(0).randint(0, 2**31 - 1)`, the per-tree seeds scikit-learn uses.

| Check | Result |
|---|---|
| `check/ref_sklearn.py` then `node check/check_ml.mjs` (writes `check/summary.json`; `check/ref.json` is 3.4 MB and gitignored, regenerate it) | trees identical at every depth on all five datasets; kNN identical; logistic regression within 1e-7; gradient boosting identical with depth 1, within 0.035 log-odds with depth 3 (floating near-ties); bagging identical except one tree at one grid point on two datasets; SVM decision values within 0.013 of libsvm, identical support-vector sets in 24 of 30 settings (the rest differ by one or two borderline points); mcycle tree, bagging and boosting identical (1e-13); k-means 1e-15; GMM 1e-15 after 1, 5, 30 iterations; DBSCAN labels identical; PCA ratios 1e-15 |
| `node check/check_search.mjs` | Bayesian-optimisation paths equal to the NumPy port for 3 seeds, 40 of 40 steps each |
| `recompute.py` (`inputs/recompute.json`) | every number quoted in prose, from scikit-learn: tree depth accuracies, mcycle errors (tree, boosting, sklearn forests over 5 seeds), SVM C sweep, PCA, surface statistics, grid values, BO distributions |
| `sh html_utils/checkpage.sh <page folder>` | fail=0, emdash 0, errbox 1 |
| every control exercised in headless Chrome (all animation steps of all modes, all datasets and models in the lab at slider extremes, presets) | no errors, no NaN / undefined / Infinity |

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

`01_head.html` (CSS shared with the siblings plus this page's), `10_header.html`, `20_read_a.html` (sections 0 to 4), `20_read_b.html` (5 to 10, mistakes), `50_tab_lab.html`, `59_tab_more.html`; JS: `21_js_common.js` (RD helpers and step-animation controller, from the siblings), `30_js_ml.js`, `31_js_data.js` (generated), `32_js_plot.js` (canvas helpers), `33_js_models.js` (fit and draw one of seven classifiers), `40` tree depth animation, `41` one tree / forest / boosting animation, `42` leaderboard bars, `43` SVM C sweep animation, `44` distance concentration, `45` clustering animation, `46` PCA raw against standardised, `47` search animation, `51_js_lab.js` (ids `lb-`), `99_js_tabs.js` last.

Size: about 270 KB, of which 117 KB is data.
