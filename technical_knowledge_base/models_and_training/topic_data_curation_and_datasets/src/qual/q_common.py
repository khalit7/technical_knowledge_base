"""Shared helpers for the Quality lab (Topic: data-curation-and-datasets, tab t-qual).

Reusable by the child page "Quality classifiers and data selection": every scorer takes a list of
texts and returns a list of floats, with the exact preprocessing each published pipeline uses.

Run with the shared venv (see ../data/README.md):
  DC_SCRATCH=<dc setup folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4 nice -n 15 \
    $DC_SCRATCH/venv/bin/python -I -B src/qual/<script>.py
Large intermediate files go to $DC_SCRATCH/q/ (outside the repo); small results to src/qual/out/.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import load as L  # noqa: E402

OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)


def qdir(*p):
    d = os.path.join(L.scratch(), "q")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, *p)


def dump(name, obj, indent=None):
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, indent=indent, ensure_ascii=False, separators=None if indent else (",", ":"))


def threads():
    import torch
    n = int(os.environ.get("OMP_NUM_THREADS", "4"))
    torch.set_num_threads(min(n, 4))


# ------------------------------------------------------------- FineWeb-Edu classifier
_edu = None


def edu_model():
    global _edu
    if _edu is None:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        threads()
        p = L.model_path("fineweb_edu_classifier")
        tok = AutoTokenizer.from_pretrained(p)
        # float32 on CPU (the published scoring script used bfloat16 on GPU: run_edu_bert.py:9)
        dev = os.environ.get("Q_DEVICE", "cpu")  # the pending GPU queue sets Q_DEVICE=mps or cuda
        m = AutoModelForSequenceClassification.from_pretrained(p, dtype=torch.float32).to(dev).eval()
        _edu = (tok, m, dev)
    return _edu


def edu_scores(texts, batch=16):
    """Regression output of HuggingFaceFW/fineweb-edu-classifier, as in its run_edu_bert.py:18-24
    (truncation at 512 tokens, padding to the longest in the batch). int_score = round(clip(s, 0, 5))."""
    import torch
    tok, m, dev = edu_model()
    out = []
    # sort by length so padding is small; restore order after
    order = sorted(range(len(texts)), key=lambda i: len(texts[i]))
    res = [None] * len(texts)
    for s in range(0, len(order), batch):
        idx = order[s:s + batch]
        enc = tok([texts[i] for i in idx], return_tensors="pt", padding="longest", truncation=True, max_length=512).to(dev)
        with torch.no_grad():
            lg = m(**enc).logits.squeeze(-1).float().cpu().numpy()
        for i, v in zip(idx, lg.reshape(-1)):
            res[i] = float(v)
        if len(texts) > 5000 and (s // batch) % 50 == 0:
            print(f"  edu {s + len(idx)}/{len(texts)}", flush=True)
            if dev == "mps":
                torch.mps.empty_cache()
    return res


def int_score(s):
    return int(round(max(0.0, min(s, 5.0))))


# ------------------------------------------------------------- DCLM fastText (OH-2.5 + ELI5 vs RefinedWeb)
_ft = {}


def ft_model(path):
    if path not in _ft:
        import fasttext
        fasttext.FastText.eprint = lambda *a, **k: None
        _ft[path] = fasttext.load_model(path)
    return _ft[path]


def dclm_scores(texts, newline=" "):
    """P(__label__hq) from DCLM's classifier. DCLM and Dolma's tagger join lines with a space
    (dolma taggers/quality.py:29: " ".join(text.strip().splitlines())); datatrove's FastTextClassifierFilter
    replaces "\\n" with newline_replacement, default "" (filters/fasttext_filter.py:47,99). newline=None means
    the Dolma/DCLM form; any string means datatrove's form with that replacement."""
    m = ft_model(L.model_path("dclm_fasttext"))
    out = []
    for t in texts:
        x = " ".join(t.strip().splitlines()) if newline == " " else t.strip().replace("\n", newline)
        labs, ps = m.predict(x, k=-1)
        d = dict(zip(labs, ps))
        out.append(float(d.get("__label__hq", 0.0)))
    return out


def ft_scores(model_path, texts, label="__label__hq"):
    m = ft_model(model_path)
    out = []
    for t in texts:
        labs, ps = m.predict(" ".join(t.strip().splitlines()), k=-1)
        out.append(float(dict(zip(labs, ps)).get(label, 0.0)))
    return out


# ------------------------------------------------------------- privacy-safe document records
def safe_meta(doc):
    md = dict(doc.get("metadata", {}))
    md.pop("file_path", None)  # absolute local path: never embed
    return md
