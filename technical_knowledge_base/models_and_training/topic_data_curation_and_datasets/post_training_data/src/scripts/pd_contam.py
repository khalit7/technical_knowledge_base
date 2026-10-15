"""Benchmark contamination of the extra post-training sets, with the Decontamination child's scanner unchanged.

Imports decontamination_pii_and_governance/src/scripts/dg_contam.py (same normalisation, same 29,615 benchmark
items, same per-pair cov8 / m13 rules) and only registers this page's corpora and writes to $DC_SCRATCH/pd/contam/
(never to that page's folders). IFEval (not in the shared benchmark list) is checked separately here against the
instruction-following sets with the same normalisation and 8-gram coverage (Tulu 3's rule: > 50% of an item's tokens
in 8-grams shared with one training row).
usage: DC_SCRATCH=... python -I -B pd_contam.py [corpus ...] | ifeval
Output: $DC_SCRATCH/pd/contam/*.summary.json, *.pairs.jsonl.gz, *.items.npz ; ifeval.json
"""
import gzip
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pd_common as C  # noqa: E402

DG = os.path.normpath(os.path.join(HERE, "..", "..", "..", "decontamination_pii_and_governance", "src", "scripts"))
sys.path.insert(0, DG)
import dg_common as G  # noqa: E402
import dg_contam as K  # noqa: E402


def _rows(name, fn):
    def it():
        d = C.frame(name)
        for i, r in enumerate(d.itertuples(index=False)):
            yield f"{name}#{i}", fn(r)
    return it


def _m(x):
    return "\n".join(str(m.get("content") or "") for m in list(x))


CORP = {
    "pd_openr1": ("OpenR1-Math 6k sample: problem + reference solution + answer", "public", "post",
                  _rows("openr1_math", lambda r: f"{r.problem}\n{r.solution}\n{r.answer}")),
    "pd_code": ("verifiable-coding-problems-python (tested), file 1: problem + gold solution", "public", "post",
                _rows("code_tested", lambda r: f"{r.problem}\n{r.gold_standard_solution}")),
    "pd_if_multi": ("IF_multi_constraints_upto5 (all 95,373 prompts)", "public", "post",
                    _rows("if_multi", lambda r: _m(r.messages))),
    "pd_dolci_rl": ("Dolci-Think-RL-7B 4k sample: prompt + ground truth", "public", "post",
                    _rows("dolci_think_rl_s", lambda r: f"{r.prompt}\n{' '.join(map(str, list(r.ground_truth) if r.ground_truth is not None else []))}")),
    "pd_dolci_sft": ("Dolci-Instruct-SFT 4k sample", "public", "post", _rows("dolci_instruct_sft_s", lambda r: _m(r.messages))),
    "pd_dolci_think": ("Dolci-Think-SFT-7B 3k sample", "public", "post", _rows("dolci_think_sft_s", lambda r: _m(r.messages))),
    "pd_tulu3_pref": ("Tulu 3 8B preference mixture 5k sample (prompt and both answers)", "public", "post",
                      _rows("tulu3_pref", lambda r: _m(r.chosen) + "\n" + _m(r.rejected)[-4000:])),
    "pd_alpaca": ("Alpaca 52k", "public", "post", _rows("alpaca", lambda r: f"{r.instruction}\n{r.input}\n{r.output}")),
}


def out_dir(*parts):
    d = os.path.join(C.scratch(), "contam", *parts)
    os.makedirs(d, exist_ok=True)
    return d


def ifeval():
    """IFEval's 541 prompts against the instruction-following training prompts (8-gram coverage, Tulu 3 rule)."""
    ev = C.frame("ifeval")
    items = [K.norm_tokens(p) for p in ev.prompt]
    ih = [set(K.ngram_hashes(K.tok_hashes(t), 8).tolist()) for t in items]
    index = {}
    for i, s in enumerate(ih):
        for h in s:
            index.setdefault(h, []).append(i)
    res = {}
    for name, col in [("rlvr_ifeval", "messages"), ("if_multi", "messages"), ("if_pref_personas", "prompt")]:
        d = C.frame(name)
        best = np.zeros(len(items))
        bestrow = -np.ones(len(items), dtype=np.int64)
        for ri, x in enumerate(d[col]):
            text = _m(x) if col == "messages" else str(x)
            toks = K.norm_tokens(text)
            hs = K.ngram_hashes(K.tok_hashes(toks), 8).tolist()
            hit = {}
            for h in set(hs):
                for i in index.get(h, ()):
                    hit.setdefault(i, set()).add(h)
            for i, hh in hit.items():
                it = items[i]
                ihash = K.ngram_hashes(K.tok_hashes(it), 8).tolist()
                cov = np.zeros(len(it), dtype=bool)
                for j, h in enumerate(ihash):
                    if h in hh:
                        cov[j:j + 8] = True
                c = cov.mean() if len(it) else 0
                if c > best[i]:
                    best[i], bestrow[i] = c, ri
        flagged = [int(i) for i in np.nonzero(best > 0.5)[0]]
        res[name] = dict(rows=len(d), items=len(items), flagged=len(flagged), cov_hist=np.histogram(best, bins=10, range=(0, 1))[0].tolist(),
                         examples=[dict(item=ev.prompt.iloc[i][:400], row=int(bestrow[i]), cov=round(float(best[i]), 3))
                                   for i in sorted(flagged, key=lambda i: -best[i])[:8]])
        print(name, res[name]["flagged"], flush=True)
    json.dump(res, open(os.path.join(out_dir(), "ifeval.json"), "w"))


if __name__ == "__main__":
    G.CORPORA.update(CORP)
    G.out_dir = out_dir
    names = sys.argv[1:] or list(CORP)
    for n in names:
        if n == "ifeval":
            ifeval()
        else:
            K.scan(n)
