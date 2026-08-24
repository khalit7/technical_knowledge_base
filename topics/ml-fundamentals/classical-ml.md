# Classical ML

## Best resources

- [An Introduction to Statistical Learning (ISLR/ISLP)](https://www.statlearning.com/): free book; the standard reference for everything below.
- [StatQuest (Josh Starmer) playlists](https://www.youtube.com/@statquest): the fastest intuition refreshers for trees, boosting, SVMs, PCA.
- [XGBoost docs: introduction to boosted trees](https://xgboost.readthedocs.io/en/stable/tutorials/model.html): the gradient-boosting math from the source.
- [scikit-learn user guide](https://scikit-learn.org/stable/user_guide.html): algorithm-by-algorithm reference with practical caveats.

## The map

| Paradigm | Task | Canonical methods |
|---|---|---|
| Supervised | Regression | Linear/polynomial regression, ridge/lasso, trees, gradient boosting |
| Supervised | Classification | Logistic regression, SVM, kNN, naive Bayes, trees/ensembles |
| Unsupervised | Clustering | k-means, hierarchical, DBSCAN, GMM (EM) |
| Unsupervised | Anomaly detection | Isolation forest, one-class SVM, density/reconstruction-based |
| Unsupervised | Dimensionality reduction | PCA, t-SNE, UMAP; autoencoders |

## Supervised learning

- **Regression** (numeric target): linear regression fit by least squares (MSE); regularised variants are ridge (L2), lasso (L1), elastic net (see [regularisation.md](regularisation.md)).
- **Classification** (categorical target): logistic regression = linear model + sigmoid + BCE; softmax regression for multiclass. Naive Bayes: Bayes rule with conditional-independence assumption; strong cheap baseline for text.

## Unsupervised learning

| Method | One-liner | Watch out |
|---|---|---|
| k-means | Alternate assign-to-nearest-centroid / recompute centroids; minimises within-cluster variance | Must pick k (elbow/silhouette); spherical clusters only; init-sensitive (use k-means++) |
| Hierarchical | Agglomerative merging by linkage (single/complete/average/Ward); cut the dendrogram | $O(n^2)$; linkage choice changes results |
| DBSCAN | Density-based; finds arbitrary shapes, labels outliers as noise | eps/min_samples tuning; struggles with varying density |
| GMM + EM | Soft clustering as a mixture of Gaussians; EM alternates responsibilities (E) and parameter updates (M) | Local optima; k still needed |
| Anomaly detection | Isolation forest (anomalies isolate in few random splits), one-class SVM, or density/reconstruction thresholds | Evaluate with PR metrics, labels are rare |
| PCA | Project onto top eigenvectors of the covariance matrix (equivalently SVD); maximal retained variance | Linear only; standardise features first |
| t-SNE / UMAP | Neighbour-preserving nonlinear embeddings for visualisation | Distances/cluster sizes in the plot are not meaningful; UMAP is faster and preserves more global structure |

## Trees and ensembles

- **Decision tree**: greedy recursive splits maximising impurity reduction (Gini/entropy) or variance reduction. Interpretable; alone, high variance and easy to overfit.
- **Random forest** (bagging): many trees on bootstrap samples, each split restricted to a random feature subset; average/vote. Variance reduction through decorrelated trees; nearly tuning-free; out-of-bag error for free.
- **Gradient boosting / XGBoost**: trees built sequentially, each fitting the gradient of the loss w.r.t. current predictions (residuals for MSE). XGBoost adds second-order (Hessian) information in its split objective (hence its preference for twice-differentiable losses like log-cosh over Huber), regularisation terms, shrinkage, subsampling. XGBoost/LightGBM/CatBoost remain the strongest defaults on tabular data, still generally beating deep learning there (2026).
- Bagging cuts variance; boosting cuts bias.

## SVMs

- Maximum-margin linear classifier; hinge loss + L2 penalty. Soft margin C trades margin width against violations.
- **Kernel trick**: replace dot products with kernels (RBF, polynomial) to get nonlinear boundaries without explicit feature maps; only support vectors matter.
- Strong for small/medium high-dimensional data; scales poorly past ~10^5 samples.

## kNN

- No training: predict from the k nearest neighbours (majority vote / mean). Distance metric and k are the hyperparameters; feature scaling is mandatory (distance-based).
- Suffers from the curse of dimensionality; inference is $O(n)$ per query without ANN indexes. Same machinery underlies modern vector retrieval (see topics/rag-and-retrieval).

## Hyperparameter search

| Method | Idea | When |
|---|---|---|
| Grid search | Exhaustive cartesian product of values | Few parameters, cheap models |
| Random search | Sample configurations at random | Usually beats grid at equal budget: important dimensions get many distinct values instead of few (Bergstra & Bengio 2012) |
| Bayesian optimisation | Fit a surrogate (GP or TPE) of score vs config; pick next trial by expected improvement | Expensive evaluations; Optuna/Hyperopt |
| Successive halving / Hyperband / ASHA | Start many configs, kill the weak early, promote survivors | Deep learning, where partial training is informative |

## Cross-links

- Second-order optimisation (Newton, and why XGBoost wants Hessians): [optimisers-and-schedulers.md](optimisers-and-schedulers.md)
- Losses referenced here (hinge, MSE, BCE): [losses.md](losses.md)
