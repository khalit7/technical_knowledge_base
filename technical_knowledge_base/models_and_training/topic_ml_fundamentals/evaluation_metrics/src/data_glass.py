# A real imbalanced multi-class confusion matrix for the averaging section:
# the UCI Glass Identification data (214 samples, 6 classes) from OpenML (data id 41, "glass"),
# 5-fold cross-validated predictions of a standardised logistic regression.
# Run from src/:  uv run --with scikit-learn --with pandas python data_glass.py
import json
import numpy as np
from sklearn.datasets import fetch_openml
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_predict, StratifiedKFold
from sklearn import metrics as M

d = fetch_openml(data_id=41, as_frame=True)
X, y = d.data.values.astype(float), d.target.astype(str).values
classes = sorted(set(y), key=lambda c: -list(y).count(c))
model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000))
yh = cross_val_predict(model, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=0))
cm = M.confusion_matrix(y, yh, labels=classes)
out = dict(source='OpenML data id 41 (UCI Glass Identification, German 1987), 214 samples; 5-fold stratified CV (seed 0), StandardScaler + LogisticRegression',
           classes=classes, cm=cm.tolist(),
           sklearn={a: {'precision': M.precision_score(y, yh, labels=classes, average=a, zero_division=0),
                        'recall': M.recall_score(y, yh, labels=classes, average=a, zero_division=0),
                        'f1': M.f1_score(y, yh, labels=classes, average=a, zero_division=0)} for a in ['macro', 'micro', 'weighted']},
           accuracy=M.accuracy_score(y, yh))
print(json.dumps(out, indent=1))
json.dump(out, open('inputs/glass_cm.json', 'w'), indent=1)
