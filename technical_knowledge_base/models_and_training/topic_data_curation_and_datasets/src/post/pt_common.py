"""Shared helpers for the root's Post-training data lab (prefix pt). Reusable by the post_training_data child page.

Every post-training sample of the running example as one record shape, a Qwen3 token counter, text normalisation
and near-duplicate detection. Decontamination numbers are NOT recomputed here: they are read from the
Decontamination, PII and governance child's outputs (its scripts/dg_contam.py and dg_label.py), so both pages agree.

Run with the shared venv:  $DC_SCRATCH/venv/bin/python -I -B <script>.py
Large outputs: $DC_SCRATCH/post/ (outside the repo). Small JSON the page embeds: ./out/ (committed).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
import load as L  # noqa: E402

DG_SCRIPTS = os.path.normpath(os.path.join(ROOT_SRC, "..", "decontamination_pii_and_governance", "src", "scripts"))
OUT = os.path.join(HERE, "out")

DATASETS = {  # key: (loader name, label, source, revision)
    "sft": ("tulu3_sft_5k", "Tulu 3 SFT mixture", "allenai/tulu-3-sft-mixture", "b14afda6"),
    "pref": ("ultrafeedback_binarized_prefs_5k", "UltraFeedback binarized", "HuggingFaceH4/ultrafeedback_binarized",
             "3949bf5f"),
    "rlvr": ("rlvr_gsm_math_if_all", "Tulu 3 RLVR (GSM8K, MATH, IF)", "allenai/RLVR-GSM-MATH-IF-Mixed-Constraints",
             "7dbd180f"),
    "cosmo": ("cosmopedia_web_samples_v2_2k", "Cosmopedia web_samples_v2", "HuggingFaceTB/cosmopedia", "0ae6ec63"),
}


def scratch(*parts):
    d = os.path.join(L.scratch(), "post", *parts)
    os.makedirs(d, exist_ok=True)
    return d


def save_out(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def load_out(name):
    return json.load(open(os.path.join(OUT, name)))


# ------------------------------------------------------------------ tokens
_TOK = {}


def tokenizer():
    """Qwen3 tokenizer (tokenizer.json of Qwen/Qwen3-0.6B, the same file as Qwen3-1.7B; see the inference model store)."""
    if "t" not in _TOK:
        from tokenizers import Tokenizer
        p = os.path.join(L.scratch(), "..", "inf", "models", "hf", "Qwen3-0.6B", "tokenizer.json")
        _TOK["t"] = Tokenizer.from_file(os.path.normpath(p))
    return _TOK["t"]


def ntok(texts):
    """Qwen3 token counts for a list of strings (no special tokens, no chat template)."""
    enc = tokenizer().encode_batch([t or "" for t in texts], add_special_tokens=False)
    return [len(e.ids) for e in enc]


# ------------------------------------------------------------------ records
def msgs(x):
    return [{"role": str(m.get("role")), "content": str(m.get("content") or "")} for m in list(x)]


def records(key):
    """List of dicts, one per row, in file order. Common fields: i (row number), prompt (first user turn),
    response (last assistant turn, or the document for Cosmopedia), turns (user turns). Plus dataset fields."""
    name = DATASETS[key][0]
    d = L.post(name)
    out = []
    for i, r in enumerate(d.itertuples(index=False)):
        if key == "sft":
            m = msgs(r.messages)
            users = [x for x in m if x["role"] == "user"]
            asst = [x for x in m if x["role"] == "assistant"]
            out.append(dict(i=i, id=r.id, source=r.source.split("/")[-1], messages=m,
                            system=any(x["role"] == "system" for x in m),
                            prompt=users[0]["content"] if users else "", response=asst[-1]["content"] if asst else "",
                            turns=len(users), asst_all="\n".join(x["content"] for x in asst)))
        elif key == "pref":
            c, j = msgs(r.chosen), msgs(r.rejected)
            out.append(dict(i=i, id=r.prompt_id, prompt=r.prompt, chosen=c[-1]["content"] if c else "",
                            rejected=j[-1]["content"] if j else "", turns=sum(x["role"] == "user" for x in c),
                            score_chosen=float(r.score_chosen), score_rejected=float(r.score_rejected)))
        elif key == "rlvr":
            m = msgs(r.messages)
            p = m[0]["content"] if m else ""
            out.append(dict(i=i, prompt=p, question=rlvr_question(p, r.dataset), ground_truth=str(r.ground_truth),
                            dataset=str(r.dataset), constraint_type=None if r.constraint_type != r.constraint_type
                            else str(r.constraint_type), constraint=None if r.constraint != r.constraint
                            else str(r.constraint), turns=sum(x["role"] == "user" for x in m)))
        elif key == "cosmo":
            out.append(dict(i=i, prompt=r.prompt, response=r.text, text_token_length=int(r.text_token_length),
                            format=r.format, audience=r.audience, seed=cosmo_seed(r.prompt)))
    return out


def rlvr_question(prompt, dataset):
    """The question a RLVR row asks, without the worked few-shot examples in front of it.
    GSM8K and MATH rows are 'Question: ...\\nAnswer: ...' exemplars followed by the real question as the last
    'Question:' block; IF rows are a plain instruction."""
    if dataset in ("gsm8k", "MATH"):
        k = prompt.rfind("Question:")
        q = prompt[k + len("Question:"):] if k >= 0 else prompt
        q = re.sub(r"\s*Answer:\s*$", "", q.strip())
        return q.strip()
    return prompt.strip()


SEED = re.compile(r'^Here is an extract from a webpage: "(.*?)"\.?\s*\n', re.S)


def cosmo_seed(prompt):
    m = SEED.match(prompt)
    return m.group(1) if m else ""


# ------------------------------------------------------------------ normalisation and near duplicates
def norm(t):
    """Light normalisation for exact-duplicate checks: lower-case, collapse whitespace."""
    return re.sub(r"\s+", " ", (t or "").lower()).strip()


WORD = re.compile(r"\w+", re.U)


def shingles(t, n=5):
    w = WORD.findall((t or "").lower())
    if len(w) < n:
        return {" ".join(w)} if w else set()
    return {" ".join(w[k:k + n]) for k in range(len(w) - n + 1)}


def near_dup_clusters(texts, threshold=0.8, num_perm=128, n=5, seed=1):
    """MinHash LSH (datasketch 2.0.0) over word n-gram shingles, candidates verified by true Jaccard >= threshold,
    clusters by union-find. Returns (cluster id per text or -1, list of verified pairs (a, b, jaccard))."""
    from datasketch import MinHash, MinHashLSH
    sh = [shingles(t, n) for t in texts]
    lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
    mh = []
    for k, s in enumerate(sh):
        m = MinHash(num_perm=num_perm, seed=seed)
        for x in s:
            m.update(x.encode("utf-8"))
        mh.append(m)
        if s:
            lsh.insert(str(k), m)
    par = list(range(len(texts)))

    def f(a):
        while par[a] != a:
            par[a] = par[par[a]]
            a = par[a]
        return a
    pairs = []
    for k, s in enumerate(sh):
        if not s:
            continue
        for c in lsh.query(mh[k]):
            j = int(c)
            if j <= k:
                continue
            jac = len(s & sh[j]) / len(s | sh[j])
            if jac >= threshold:
                pairs.append((k, j, round(jac, 4)))
                par[f(j)] = f(k)
    roots = [f(k) for k in range(len(texts))]
    from collections import Counter
    size = Counter(roots)
    cid = [r if size[r] > 1 else -1 for r in roots]
    return cid, pairs


def quantiles(xs, qs=(0.1, 0.25, 0.5, 0.75, 0.9, 0.99)):
    import numpy as np
    if not len(xs):
        return {}
    a = np.asarray(xs, dtype=float)
    return {str(q): float(np.quantile(a, q)) for q in qs} | {"mean": float(a.mean()), "max": float(a.max()),
                                                             "min": float(a.min()), "n": int(len(a))}


def log_hist(xs, edges):
    """Counts in [edges[k], edges[k+1]) with the last bin open."""
    import bisect
    c = [0] * len(edges)
    for x in xs:
        k = bisect.bisect_right(edges, x) - 1
        c[max(0, min(k, len(edges) - 1))] += 1
    return c
