"""Refit RegMix's regressions on its released 1M/60M/1B runs (src/inputs/regmix_data, MIT, sail-sg/regmix @ dd9d1c3).

Reproduces Table 2 of arXiv 2407.01492 (Spearman rho of predicted vs true Pile-CC validation loss) with
(a) linear regression, (b) LightGBM with the notebook's hyperparameters, and adds
(c) the Data Mixing Laws form L = c + k*exp(sum_j t_j r_j) (Ye et al., arXiv 2403.16952, Eq. 7), fitted by least squares.
Writes ../data/regmix_fit.json. CPU only, seconds.
"""
import json, os, numpy as np, pandas as pd
from scipy.stats import spearmanr
from scipy.optimize import least_squares
H = os.path.dirname(os.path.abspath(__file__)); I = f'{H}/../inputs/regmix_data'
def load(m, l):
    X = pd.read_csv(f'{I}/{m}.csv'); Y = pd.read_csv(f'{I}/{l}.csv')
    return X.drop(columns=['index']), Y.drop(columns=['index'])
Xtr, Ytr = load('train_mixture_1m', 'train_pile_loss_1m')
tests = {'1M': load('test_mixture_1m', 'test_pile_loss_1m'), '60M': load('test_mixture_60m', 'test_pile_loss_60m'), '1B': load('test_mixture_1B', 'test_pile_loss_1B')}
cols = list(Xtr.columns)
for k, (X, Y) in tests.items(): assert list(X.columns) == cols, k
tgt = 'metric/the_pile_pile_cc_val_loss'
out = {'domains': [c.replace('train_the_pile_', '') for c in cols], 'n_train': len(Xtr), 'n_test': {k: len(v[0]) for k, v in tests.items()}}
# (a) linear
from sklearn.linear_model import LinearRegression
lin = LinearRegression().fit(Xtr.values, Ytr[tgt].values)
res = {}
for k, (X, Y) in tests.items():
    p = lin.predict(X.values); res[k] = {'rho': round(float(spearmanr(p, Y[tgt]).statistic) * 100, 2), 'mse': round(float(np.mean((p - Y[tgt].values) ** 2)), 4)}
out['linear'] = res; out['linear_coef'] = dict(zip(out['domains'], np.round(lin.coef_, 4).tolist())); out['linear_intercept'] = round(float(lin.intercept_), 4)
# (b) LightGBM as in regression_fitting/regression.ipynb cell 13
try:
    import lightgbm as lgb
    hp = {'task': 'train', 'boosting_type': 'gbdt', 'objective': 'regression', 'metric': ['l1', 'l2'], 'num_iterations': 1000, 'seed': 42, 'learning_rate': 1e-2, 'verbosity': -1}
    np.random.seed(42)
    X1, Y1 = tests['1M']
    g = lgb.LGBMRegressor(**hp).fit(Xtr.values, Ytr[tgt].values, eval_set=[(X1.values, Y1[tgt].values)], eval_metric='l2', callbacks=[lgb.early_stopping(stopping_rounds=3, verbose=False)])
    res = {}; preds = {}
    for k, (X, Y) in tests.items():
        p = g.predict(X.values); preds[k] = np.round(p, 4).tolist()
        res[k] = {'rho': round(float(spearmanr(p, Y[tgt]).statistic) * 100, 2), 'mse': round(float(np.mean((p - Y[tgt].values) ** 2)), 4)}
    out['lightgbm'] = res; out['lightgbm_pred'] = preds; out['lightgbm_version'] = lgb.__version__
except ImportError:
    out['lightgbm'] = None
# (c) Data Mixing Laws exponential form
R = Xtr.values; y = Ytr[tgt].values
def f(p, R): return p[0] + np.exp(p[1]) * np.exp(R @ p[2:])
fit = least_squares(lambda p: f(p, R) - y, x0=np.r_[y.min() - 0.5, np.log(1.0), np.zeros(R.shape[1])], method='lm', max_nfev=20000)
res = {}
for k, (X, Y) in tests.items():
    p = f(fit.x, X.values); res[k] = {'rho': round(float(spearmanr(p, Y[tgt]).statistic) * 100, 2), 'mse': round(float(np.mean((p - Y[tgt].values) ** 2)), 4)}
out['dml'] = res; out['dml_params'] = {'c': round(float(fit.x[0]), 5), 'log_k': round(float(fit.x[1]), 5), 't': dict(zip(out['domains'], np.round(fit.x[2:], 4).tolist()))}
out['paper_table2'] = {'linear': {'1M': 90.08, '60M': 89.26, '1B': 88.01}, 'lightgbm': {'1M': 98.45, '60M': 98.64, '1B': 97.12}, 'mse_1M': {'linear': 0.13, 'lightgbm': 0.04}}
json.dump(out, open(f'{H}/../data/regmix_fit.json', 'w'), indent=1)
for m in ['linear', 'lightgbm', 'dml']: print(m, out[m])
print('dml', out['dml_params'])
