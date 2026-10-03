# Visualisation ideas: Classical ML

Question the page keeps returning to: how does each classical method decide, what does it assume, and when does it still win?

Scored with the Methodology (interactive-html-ideas.md section 2): Param, Repro x2, Computable x2, Beyond a sentence, Misconception, Central, Absent elsewhere, Anim; cost subtracted.

| # | Idea | Param | Repro x2 | Computable x2 | Beyond | Misconception | Central | Absent | Anim | Cost | Score | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CM1 | **One tree, bagging and boosting on the same real curve, animated** (mcycle, every 4th reading held out): one tree by depth, a forest tree by tree (individual trees faint, average bold), boosting stage by stage (residual bars from the previous fit, the new tree in a strip); counters for training and held-out MSE, best held-out | 1 | 2 (x2) (sklearn GradientBoostingRegressor and DecisionTreeRegressor identical, 1e-13) | 2 (x2) | 2 | 2 (more trees never hurt a forest; boosting needs early stopping) | 2 | 2 | 1 | -1 | 17 | built, Reading 3 |
| CM2 | **Boundary lab**: 7 classifiers, 5 datasets (one real), two panes side by side, train/test accuracy, OOB, SVs, leaves | 2 | 2 (x2) (checked against sklearn on 41 x 41 grids) | 2 (x2) | 2 | 1 | 2 | 1 (TensorFlow Playground and sklearn's classifier comparison exist, but not exact, checked and side by side) | 0 | -2 | 14 | built, own tab |
| CM3 | **Tree grown depth by depth on real tumours**, train/test accuracy against depth | 1 | 2 (x2) (identical to DecisionTreeClassifier) | 2 (x2) | 2 | 1 (memorisation) | 2 | 1 | 1 | -1 | 14 | built, Reading 2 |
| CM4 | **Leaderboard by table size**: TabArena and BeyondArena (2 Oct 2026, v0.1.9.4) Elo with intervals, families coloured, default-only toggle, train time, hardware, licence | 1 | 1 (x2) (transcribed CSVs, no recompute) | 2 (x2) | 2 | 2 (corrects "boosted trees win on tables") | 2 | 2 | 0 | -1 | 15 | built, Reading 4 |
| CM5 | **SVM margin as C grows, linear against RBF kernel** (before/after on the same points), SVs ringed, margin width | 1 | 2 (x2) (SVC C sweep in recompute.py; decision values within 0.013) | 2 (x2) | 2 | 1 (the kernel, not C, fixes a wrong boundary shape) | 2 | 1 | 1 | -1 | 15 | built, Reading 5 |
| CM6 | **Four clusterers step by step** (k-means random start, k-means++, GMM by EM with ellipses, DBSCAN core then growth), four datasets incl. Old Faithful, 100 live restarts per start rule | 2 | 2 (x2) (KMeans, GaussianMixture, DBSCAN identical) | 2 (x2) | 2 | 1 (init sensitivity; one eps for all densities) | 2 | 1 | 1 | -2 | 15 | built, Reading 7 |
| CM7 | **PCA raw against standardised on UCI Wine**, tweened projection and scree | 1 | 2 (x2) (99.8% proline; 36.2% / 19.2%) | 2 (x2) | 2 | 2 (standardise first) | 1 | 1 | 1 | 0 | 15 | built, Reading 9 |
| CM8 | **Grid, random and Bayesian search on a real response surface** (SVC on digits, 1,517 CV cells), budgets with idle hyperparameters, live random distribution, BO distribution from recompute | 1 | 1 (x2) (Bergstra's 1 - 0.95^n by construction; BO paths equal to NumPy) | 2 (x2) | 2 | 2 (grid is not reliably worse in 2-D with both parameters important; it collapses with idle ones; all end within CV noise) | 2 | 2 | 1 | -2 | 15 | built, Reading 10 |
| CM9 | **Distance concentration** (nearest / farthest against dimension, seeded simulation) | 1 | 0 | 2 (x2) | 1 | 1 | 1 | 0 | 0 | 0 | 8 | built small, Reading 6 (illustrative) |
| CM10 | Isolation forest path-length toy | 1 | 1 | 2 | 1 | 0 | 0 | 1 | 1 | -1 | 7 | rejected: anomaly detection is one paragraph here; the PR-metric point is owned by Evaluation metrics |
| CM11 | Live t-SNE / UMAP | 1 | 0 | 1 | 1 | 2 | 0 | 0 (Distill's misread-tsne is the canonical live version) | 1 | -3 | n/a | rejected: linked to Distill; Kobak and Linderman correction in text |
| CM12 | Hinge / logistic / exponential loss shapes | | | | | | | 0 | | | n/a | rejected: on Loss functions (margin section), linked |
| CM13 | Ridge / lasso geometry | | | | | | | 0 | | | n/a | rejected: owned by Regularisation |
| CM14 | Hierarchical clustering dendrogram | 1 | 1 | 2 | 1 | 0 | 0 | 0 | 1 | -2 | 4 | rejected: common elsewhere, the comparison of linkages is a table row |
| CM15 | XGBoost leaf weight / gain worked example | 0 | 1 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | n/a | rejected: worked by hand on Calculus and optimisation for ML; formulas shown and linked |
| CM16 | Shipping sklearn's own random forest RNG | | | | | | | | | | | rejected: would need MT19937 in JS; the forest is checked tree by tree on the same bootstrap samples and in distribution instead |

Inspiration: scikit-learn's "classifier comparison" and "cluster comparison" galleries (made exact and interactive here), TensorFlow Playground, the DeepSeek MLA explainer's step controller (reused via RD.anim), Bergstra and Bengio's Figure 1.

What the methodology lacked for this page: a rule for live leaderboards that change weekly (here: read the CSVs on a date, store them, show version and date beside every number, and flag licence and conflict-of-interest metadata), and a rule for when exactness against a reference library is worth reproducing its random number generator (done for trees, where tie-breaking changes the picture; not for the forest, checked in distribution).
