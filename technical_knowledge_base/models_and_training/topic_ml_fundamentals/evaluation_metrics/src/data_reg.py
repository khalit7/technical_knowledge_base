# Real regression predictions for the regression-metrics section: scikit-learn's bundled diabetes data
# (442 patients, 10 baseline variables, target a measure of disease progression one year later; Efron et al. 2004),
# 5-fold cross-validated predictions of ordinary least squares, plus the metrics from scikit-learn.
# Run from src/:  uv run --with scikit-learn python data_reg.py   (seconds, CPU; no download: the data ships with scikit-learn)
import json
import numpy as np
import sklearn
from sklearn.datasets import load_diabetes
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_predict
from sklearn import metrics as M

X, y = load_diabetes(return_X_y=True)
yh = cross_val_predict(LinearRegression(), X, y, cv=KFold(5, shuffle=True, random_state=0))
mean_pred = np.full_like(y, y.mean())
def ms(t, p):
    return {'mae': M.mean_absolute_error(t, p), 'rmse': float(np.sqrt(M.mean_squared_error(t, p))), 'mse': M.mean_squared_error(t, p),
            'r2': M.r2_score(t, p), 'mape': M.mean_absolute_percentage_error(t, p), 'medae': M.median_absolute_error(t, p)}
out = {'source': 'sklearn.datasets.load_diabetes (442 patients; Efron, Hastie, Johnstone and Tibshirani 2004); 5-fold CV (KFold, shuffle, seed 0) of LinearRegression; scikit-learn ' + sklearn.__version__,
       'y': [round(float(v), 1) for v in y], 'yhat': [round(float(v), 2) for v in yh],
       'sklearn': ms(y, yh), 'sklearn_rounded': ms(np.round(y, 1), np.round(yh, 2)), 'mean_baseline': ms(y, mean_pred)}
print(json.dumps({k: v for k, v in out.items() if k not in ('y', 'yhat')}, indent=1))
json.dump(out, open('inputs/reg_diabetes.json', 'w'))
