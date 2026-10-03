# Score SST-2 validation (872 sentences) with two simple classifiers trained on SST-2 train,
# and save the scores for the Threshold lab and the bootstrap.
# Run from src/:  uv run --with scikit-learn --with pandas --with pyarrow python data_sst2.py
# Input: the Hugging Face dataset stanfordnlp/sst2 (parquet, read from the local HF cache or downloaded).
import json, glob, os
import numpy as np, pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.calibration import CalibratedClassifierCV
from sklearn import metrics as M

def load(split):
    hits = glob.glob(os.path.expanduser('~/.cache/huggingface/hub/datasets--stanfordnlp--sst2/snapshots/*/data/%s-*.parquet' % split))
    if hits:
        return pd.read_parquet(hits[0])
    from huggingface_hub import hf_hub_download
    return pd.read_parquet(hf_hub_download('stanfordnlp/sst2', 'data/%s-00000-of-00001.parquet' % split, repo_type='dataset'))

tr, va = load('train'), load('validation')
print('train', len(tr), 'validation', len(va), 'val positives', int(va.label.sum()))

tf = TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True)
Xtr, Xva = tf.fit_transform(tr.sentence), tf.transform(va.sentence)
lr = LogisticRegression(C=1.0, max_iter=2000).fit(Xtr, tr.label)
p_lr = lr.predict_proba(Xva)[:, 1]

cv = CountVectorizer(ngram_range=(1, 2), min_df=2)
Ctr, Cva = cv.fit_transform(tr.sentence), cv.transform(va.sentence)
nb = MultinomialNB(alpha=1.0).fit(Ctr, tr.label)
p_nb = nb.predict_proba(Cva)[:, 1]
nbc = CalibratedClassifierCV(MultinomialNB(alpha=1.0), method='isotonic', cv=5).fit(Ctr, tr.label)
p_nbc = nbc.predict_proba(Cva)[:, 1]

y = va.label.values
def summary(p):
    yh = (p >= 0.5).astype(int)
    return dict(acc=M.accuracy_score(y, yh), prec=M.precision_score(y, yh), rec=M.recall_score(y, yh), f1=M.f1_score(y, yh),
                mcc=M.matthews_corrcoef(y, yh), brier=M.brier_score_loss(y, p), logloss=M.log_loss(y, np.clip(p, 1e-6, 1 - 1e-6)),
                auc=M.roc_auc_score(y, p), ap=M.average_precision_score(y, p))
out = dict(source='stanfordnlp/sst2 validation split (872 sentences); labels 1 = positive sentiment',
           models={'lr': 'TF-IDF (1,2)-grams, min_df 2, sublinear tf + logistic regression C=1',
                   'nb': 'counts (1,2)-grams, min_df 2 + multinomial naive Bayes alpha=1',
                   'nbc': 'the same naive Bayes, isotonic calibration (5-fold CalibratedClassifierCV on train)'},
           sklearn={k: summary(p) for k, p in [('lr', p_lr), ('nb', p_nb), ('nbc', p_nbc)]},
           y=[int(v) for v in y], p={'lr': [float(v) for v in p_lr], 'nb': [float(v) for v in p_nb], 'nbc': [float(v) for v in p_nbc]},
           text=[s.strip() for s in va.sentence])
for k, v in out['sklearn'].items(): print(k, {a: round(b, 4) for a, b in v.items()})
json.dump(out, open('inputs/sst2_scores.json', 'w'))
