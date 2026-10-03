<page url="https://app.notion.com/p/3c65c17b0d0d81ffb886ff30176bc6ce">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81d796ccc0a293218c57" title="Topic: ml-fundamentals"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Classical ML"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +22h 25m resources
## Best resources
- [An Introduction to Statistical Learning (ISLR/ISLP)](https://www.statlearning.com/) (\~15h): free book; the standard reference for everything below.
- [StatQuest (Josh Starmer) playlists](https://www.youtube.com/@statquest) (video, \~6h for the tree, boosting, SVM and PCA playlists): the fastest intuition refreshers for trees, boosting, SVMs, PCA.
- [XGBoost docs: introduction to boosted trees](https://xgboost.readthedocs.io/en/stable/tutorials/model.html) (\~25 min): the gradient-boosting math from the source.
- [scikit-learn user guide](https://scikit-learn.org/stable/user_guide.html) (docs, \~1h for the core pages): algorithm-by-algorithm reference with practical caveats.
## The map
<table header-row="true">
<tr>
<td>Paradigm</td>
<td>Task</td>
<td>Canonical methods</td>
</tr>
<tr>
<td>Supervised</td>
<td>Regression</td>
<td>Linear/polynomial regression, ridge/lasso, trees, gradient boosting</td>
</tr>
<tr>
<td>Supervised</td>
<td>Classification</td>
<td>Logistic regression, SVM, kNN, naive Bayes, trees/ensembles</td>
</tr>
<tr>
<td>Unsupervised</td>
<td>Clustering</td>
<td>k-means, hierarchical, DBSCAN, GMM (EM)</td>
</tr>
<tr>
<td>Unsupervised</td>
<td>Anomaly detection</td>
<td>Isolation forest, one-class SVM, density/reconstruction-based</td>
</tr>
<tr>
<td>Unsupervised</td>
<td>Dimensionality reduction</td>
<td>PCA, t-SNE, UMAP; autoencoders</td>
</tr>
</table>
## Supervised learning
- **Regression** (numeric target): linear regression fit by least squares (MSE); regularised variants are ridge (L2), lasso (L1), elastic net (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d81e988b5c3cb5e197f98"/>).
- **Classification** (categorical target): logistic regression = linear model + sigmoid + BCE; softmax regression for multiclass. Naive Bayes: Bayes rule with conditional-independence assumption; strong cheap baseline for text.
## Unsupervised learning
<table header-row="true">
<tr>
<td>Method</td>
<td>One-liner</td>
<td>Watch out</td>
</tr>
<tr>
<td>k-means</td>
<td>Alternate assign-to-nearest-centroid / recompute centroids; minimises within-cluster variance</td>
<td>Must pick k (elbow/silhouette); spherical clusters only; init-sensitive (use k-means++)</td>
</tr>
<tr>
<td>Hierarchical</td>
<td>Agglomerative merging by linkage (single/complete/average/Ward); cut the dendrogram</td>
<td>$`O(n^2)`$; linkage choice changes results</td>
</tr>
<tr>
<td>DBSCAN</td>
<td>Density-based; finds arbitrary shapes, labels outliers as noise</td>
<td>eps/min_samples tuning; struggles with varying density</td>
</tr>
<tr>
<td>GMM + EM</td>
<td>Soft clustering as a mixture of Gaussians; EM alternates responsibilities (E) and parameter updates (M)</td>
<td>Local optima; k still needed</td>
</tr>
<tr>
<td>Anomaly detection</td>
<td>Isolation forest (anomalies isolate in few random splits), one-class SVM, or density/reconstruction thresholds</td>
<td>Evaluate with PR metrics, labels are rare</td>
</tr>
<tr>
<td>PCA</td>
<td>Project onto top eigenvectors of the covariance matrix (equivalently SVD); maximal retained variance</td>
<td>Linear only; standardise features first</td>
</tr>
<tr>
<td>t-SNE / UMAP</td>
<td>Neighbour-preserving nonlinear embeddings for visualisation</td>
<td>Distances/cluster sizes in the plot are not meaningful; UMAP is faster and preserves more global structure</td>
</tr>
</table>
## Trees and ensembles
- **Decision tree**: greedy recursive splits maximising impurity reduction (Gini/entropy) or variance reduction. Interpretable; alone, high variance and easy to overfit.
- **Random forest** (bagging): many trees on bootstrap samples, each split restricted to a random feature subset; average/vote. Variance reduction through decorrelated trees; nearly tuning-free; out-of-bag error for free.
- **Gradient boosting / XGBoost**: trees built sequentially, each fitting the gradient of the loss w.r.t. current predictions (residuals for MSE). XGBoost adds second-order (Hessian) information in its split objective (hence its preference for twice-differentiable losses like log-cosh over Huber), regularisation terms, shrinkage, subsampling. XGBoost/LightGBM/CatBoost remain the strongest defaults on tabular data, still generally beating deep learning there (2026).
- Bagging cuts variance; boosting cuts bias.
## SVMs
- Maximum-margin linear classifier; hinge loss + L2 penalty. Soft margin C trades margin width against violations.
- **Kernel trick**: replace dot products with kernels (RBF, polynomial) to get nonlinear boundaries without explicit feature maps; only support vectors matter.
- Strong for small/medium high-dimensional data; scales poorly past \~10\^5 samples.
## kNN
- No training: predict from the k nearest neighbours (majority vote / mean). Distance metric and k are the hyperparameters; feature scaling is mandatory (distance-based).
- Suffers from the curse of dimensionality; inference is $`O(n)`$ per query without ANN indexes. Same machinery underlies modern vector retrieval (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b"/>).
## Hyperparameter search
<table header-row="true">
<tr>
<td>Method</td>
<td>Idea</td>
<td>When</td>
</tr>
<tr>
<td>Grid search</td>
<td>Exhaustive cartesian product of values</td>
<td>Few parameters, cheap models</td>
</tr>
<tr>
<td>Random search</td>
<td>Sample configurations at random</td>
<td>Usually beats grid at equal budget: important dimensions get many distinct values instead of few (Bergstra & Bengio 2012)</td>
</tr>
<tr>
<td>Bayesian optimisation</td>
<td>Fit a surrogate (GP or TPE) of score vs config; pick next trial by expected improvement</td>
<td>Expensive evaluations; Optuna/Hyperopt</td>
</tr>
<tr>
<td>Successive halving / Hyperband / ASHA</td>
<td>Start many configs, kill the weak early, promote survivors</td>
<td>Deep learning, where partial training is informative</td>
</tr>
</table>
## Cross-links
- Second-order optimisation (Newton, and why XGBoost wants Hessians): <mention-page url="https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09"/>
- Losses referenced here (hinge, MSE, BCE): <mention-page url="https://app.notion.com/p/3c65c17b0d0d8161a72bc8c572f37d55"/>
</content>
</page>
