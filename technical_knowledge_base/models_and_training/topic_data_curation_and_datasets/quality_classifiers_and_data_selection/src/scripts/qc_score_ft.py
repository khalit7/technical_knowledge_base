"""Score document sets with every cheap (CPU) classifier: the fastText models trained here, DCLM's published fastText,
the root's fastText trained on Llama 3 annotations, and the GPT-3-style logistic regression.
Sets: run0 (2,617 final docs), rw_hold (20,000 held-out RefinedWeb rows, the pool for "top 10%" thresholds),
annot (232,000 FineWeb-Edu Llama 3 annotation rows), fw50k (50,000 FineWeb CC-MAIN-2024-30 rows).
Writes $DC_SCRATCH/qc/scores/<model>__<set>.npy (float32, P(hq) in each set's row order).
usage: qc_score_ft.py [model ...]"""
import os
import sys

import numpy as np

import qc_common as C

SD = C.sdir("scores", "x")[:-1]
os.makedirs(SD, exist_ok=True)
MD = C.sdir("models", "x")[:-1]


def models():
    m = {"dclm": C.L.model_path("dclm_fasttext"), "edu_ft": C.Q.qdir("ft", "own_hq.bin")}
    for fn in sorted(os.listdir(MD)):
        if fn.endswith(".bin"):
            m[fn[:-4]] = os.path.join(MD, fn)
    if os.path.exists(os.path.join(MD, "gpt3_lr.joblib")):
        m["gpt3_lr"] = os.path.join(MD, "gpt3_lr.joblib")
    return m


_sets = {}


def annot_idx(n=232_000):
    return np.sort(np.random.default_rng(1).choice(n, 50_000, replace=False))


def texts(name):
    if name in _sets:
        return _sets[name]
    if name == "run0":
        t = [d["text"] for d in C.run0_final()]
    elif name == "rw_hold":
        t = []
        with open(C.sdir("ref", "rw.txt")) as f:
            for i, line in enumerate(f):
                if i >= 200_000:
                    t.append(line.rstrip("\n"))
    elif name == "annot":  # 50,000 of the 232,000 annotation pages (seed 1), enough for AUC and precision/recall
        a = C.L.curated("edu_annotations", columns=["text"]).text.tolist()
        t = [a[i] for i in annot_idx(len(a))]
    elif name == "fw50k":
        t = C.L.curated("fineweb_rand50k", columns=["text"]).text.tolist()
    _sets[name] = t
    return t


def score(path, ts):
    if path.endswith(".joblib"):
        import joblib
        hv, clf = joblib.load(path)
        out = []
        for s in range(0, len(ts), 5000):
            out.append(clf.predict_proba(hv.transform([C.one_line(x) for x in ts[s:s + 5000]]))[:, 1])
        return np.concatenate(out).astype(np.float32)
    if path.endswith("own_hq.bin"):  # the root's model was trained on its own normalisation
        sys.path.insert(0, os.path.join(C.ROOT_SRC, "qual"))
        import q_train_ft_norm as N
        m = C.Q.ft_model(path)
        res = []
        for x in ts:
            labs, ps = m.predict(N.norm(x), k=-1)
            res.append(dict(zip(labs, ps)).get("__label__hq", 0.0))
        return np.array(res, dtype=np.float32)
    return np.array(C.Q.ft_scores(path, ts), dtype=np.float32)


if __name__ == "__main__":
    ms = models()
    want = sys.argv[1:] or list(ms)
    for name in want:
        for st in ["run0", "rw_hold", "annot", "fw50k"]:
            p = os.path.join(SD, f"{name}__{st}.npy")
            if os.path.exists(p):
                continue
            s = score(ms[name], texts(st))
            np.save(p, s)
            print(name, st, len(s), float(np.median(s)), flush=True)
        C.Q._ft.pop(ms[name], None)  # free the model (each fastText model is about 1 GB in memory)
