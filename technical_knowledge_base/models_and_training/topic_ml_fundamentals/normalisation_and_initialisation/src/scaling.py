"""Feature scaling on the UCI Wine data (bundled with scikit-learn): reproduces scikit-learn's
"Importance of Feature Scaling" example and writes the 2-feature data the page animates.

Run from src/: OMP_NUM_THREADS=2 uv run --with scikit-learn --with pandas python scaling.py
Writes data/wine.json and prints the reproduced numbers.
"""
import json, os
import numpy as np
import sklearn
from sklearn.datasets import load_wine
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import MinMaxScaler, StandardScaler, RobustScaler

HERE = os.path.dirname(os.path.abspath(__file__))
X, y = load_wine(return_X_y=True, as_frame=True)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.30, random_state=42)
out = {'sklearn': sklearn.__version__}

# 1. scikit-learn's example: PCA(2) then LogisticRegressionCV, unscaled against standardised.
# The example passes ONE PCA object to both pipelines, so fitting the scaled pipeline refits the PCA that the
# unscaled pipeline then uses. We run it as published (shared) and with a PCA of its own (separate).
from sklearn.linear_model import LogisticRegressionCV
Cs = np.logspace(-5, 5, 20)
res = {}
for shared in (True, False):
    pca = PCA(n_components=2)
    u = make_pipeline(pca if shared else PCA(n_components=2), LogisticRegressionCV(Cs=Cs, scoring='neg_log_loss')).fit(Xtr, ytr)
    s_ = make_pipeline(StandardScaler(), pca, LogisticRegressionCV(Cs=Cs, scoring='neg_log_loss')).fit(Xtr, ytr)
    res['shared' if shared else 'separate'] = dict(
        raw_acc=accuracy_score(yte, u.predict(Xte)), raw_ll=log_loss(yte, u.predict_proba(Xte)),
        std_acc=accuracy_score(yte, s_.predict(Xte)), std_ll=log_loss(yte, s_.predict_proba(Xte)))
for name, pre in [('minmax', MinMaxScaler()), ('robust', RobustScaler())]:
    p = make_pipeline(pre, PCA(n_components=2), LogisticRegressionCV(Cs=Cs, scoring='neg_log_loss')).fit(Xtr, ytr)
    res[name] = dict(acc=accuracy_score(yte, p.predict(Xte)), ll=log_loss(yte, p.predict_proba(Xte)))
out['pca_lr'] = res
print('PCA(2)+LRCV:', json.dumps(res))

# 2. kNN (k = 20, as in the example) on two features, proline and hue
f2 = ['proline', 'hue']
knn = {}
for name, pre in [('raw', []), ('standard', [StandardScaler()]), ('minmax', [MinMaxScaler()])]:
    p = make_pipeline(*pre, KNeighborsClassifier(n_neighbors=20)).fit(Xtr[f2], ytr)
    knn[name] = accuracy_score(yte, p.predict(Xte[f2]))
out['knn2'] = knn
print('kNN(20) on proline, hue, test accuracy:', {k: round(100 * v, 2) for k, v in knn.items()})
# and on all 13 features
knn13 = {}
for name, pre in [('raw', []), ('standard', [StandardScaler()]), ('minmax', [MinMaxScaler()])]:
    p = make_pipeline(*pre, KNeighborsClassifier(n_neighbors=20)).fit(Xtr, ytr)
    knn13[name] = accuracy_score(yte, p.predict(Xte))
out['knn13'] = knn13
print('kNN(20) on all 13 features:', {k: round(100 * v, 2) for k, v in knn13.items()})

# 3. ranges of the 13 features (why: proline is in the hundreds to thousands, hue near 1)
out['features'] = [dict(name=c, min=float(X[c].min()), max=float(X[c].max()), mean=float(X[c].mean()), std=float(X[c].std(ddof=0))) for c in X.columns]

# 4. gradient descent on least squares (predict alcohol from the other 12): condition number of X^T X / n
A = X.drop(columns=['alcohol']).values; t = X['alcohol'].values
def cond(M):
    M = np.c_[np.ones(len(M)), M]
    ev = np.linalg.eigvalsh(M.T @ M / len(M))
    return float(ev.max() / ev.min())
out['cond'] = dict(raw=cond(A), standard=cond((A - A.mean(0)) / A.std(0)), minmax=cond((A - A.min(0)) / (A.max(0) - A.min(0))))
print('condition number of the least-squares Hessian:', {k: '%.3g' % v for k, v in out['cond'].items()})

# 5. points for the page: the two features, class, train/test flag
tr_idx = set(Xtr.index)
out['pts'] = [[float(X['proline'][i]), float(X['hue'][i]), int(y[i]), 1 if i in tr_idx else 0] for i in X.index]
json.dump(out, open(os.path.join(HERE, 'data', 'wine.json'), 'w'))
