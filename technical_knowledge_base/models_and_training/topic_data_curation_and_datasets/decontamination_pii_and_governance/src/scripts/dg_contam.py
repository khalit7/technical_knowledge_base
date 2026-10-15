"""Benchmark contamination scan: every benchmark item of the running example against every corpus, by several
published n-gram methods at once, on the same normalised tokens.

Normalisation (all methods): datatrove 0.10.1 simplify_text (utils/text.py:212-257: lower-case, punctuation to
spaces, diacritics removed, whitespace collapsed) with norm_numbers=False (numbers kept, as GPT-3 and Tulu 3 do),
then split on spaces. Tokens are words, not model tokens (GPT-3 and Tulu 3 used words/whitespace tokens; Llama
used model tokens: a stated departure).

Per corpus, per (document, benchmark item) it records:
  m13    number of the item's 13-grams found in the document           (GPT-3 style: any 13-gram)
  cov8   share of the item's tokens inside an 8-gram shared with this one document  (Tulu 3: flag if > 0.5)
  run8   longest run of consecutive item tokens covered by 8-gram matches in this document
and per item, over the whole corpus: the union coverage by 8-grams and by 13-grams (Llama 3 / ConTAM style:
share of the item's tokens that sit in any matched n-gram anywhere in the corpus), and the number of documents
with any 5-gram match (to show what short n-grams do).

Output: $DC_SCRATCH/data/dg/contam/<corpus>.pairs.jsonl.gz (pairs with m13 > 0 or cov8 >= 0.2) and
<corpus>.items.npz (per-item coverage arrays), plus <corpus>.summary.json.

Usage: python -I -B dg_contam.py <corpus> [<corpus> ...]   (or "all"); 4 worker processes, run under nice -n 15.
"""
import gzip
import json
import os
import sys
import time
from multiprocessing import get_context

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402

NS = (5, 8, 13)
P = np.uint64(1099511628211)  # FNV prime as the rolling multiplier (any odd 64-bit constant works)
WORKERS = 4
CHUNK = 400

_G = {}


def norm_tokens(text, keep_numbers=True):
    from datatrove.utils.text import TextNormConfig, simplify_text
    cfg = _G.get(("cfg", keep_numbers))
    if cfg is None:
        cfg = _G[("cfg", keep_numbers)] = TextNormConfig(norm_numbers=not keep_numbers)
    return simplify_text(text, cfg).split()


def tok_hashes(toks):
    import xxhash
    cache = _G.setdefault("tokcache", {})
    out = np.empty(len(toks), dtype=np.uint64)
    for i, t in enumerate(toks):
        h = cache.get(t)
        if h is None:
            h = cache[t] = xxhash.xxh64_intdigest(t)
            if len(cache) > 3_000_000:
                cache.clear()
        out[i] = h
    return out


def ngram_hashes(th, n):
    if len(th) < n:
        return np.empty(0, dtype=np.uint64)
    m = len(th) - n + 1
    h = np.zeros(m, dtype=np.uint64)
    with np.errstate(over="ignore"):
        for j in range(n):
            h = h * P + th[j:j + m]
    return h


def build_index(items):
    """For each n: sorted keys with parallel (item, pos) arrays, plus item token counts."""
    idx = {}
    toks = [norm_tokens(it["full"]) for it in items]
    lens = np.array([len(t) for t in toks], dtype=np.int32)
    ths = [tok_hashes(t) for t in toks]
    for n in NS:
        ks, its, ps = [], [], []
        for i, th in enumerate(ths):
            h = ngram_hashes(th, n)
            if len(h):
                ks.append(h)
                its.append(np.full(len(h), i, dtype=np.int32))
                ps.append(np.arange(len(h), dtype=np.int32))
        k = np.concatenate(ks)
        o = np.argsort(k, kind="stable")
        idx[n] = (k[o], np.concatenate(its)[o], np.concatenate(ps)[o])
    return idx, lens


def _init(items_len):
    items = C.bench_items()
    _G["items"] = items
    _G["idx"], _G["lens"] = build_index(items)


def _scan(batch):
    idx, lens = _G["idx"], _G["lens"]
    nitems = len(lens)
    cov_union = {8: {}, 13: {}}   # item -> set of covered positions (sparse; merged in the parent)
    docs5 = np.zeros(nitems, dtype=np.int32)
    pairs = []
    flags = {"docs": 0, "tokens": 0, "any5": 0, "any8": 0, "any13": 0}
    for doc_id, text in batch:
        toks = norm_tokens(text or "")
        flags["docs"] += 1
        flags["tokens"] += len(toks)
        if len(toks) < 5:
            continue
        th = tok_hashes(toks)
        per = {}
        for n in NS:
            h = ngram_hashes(th, n)
            if not len(h):
                continue
            keys, its, ps = idx[n]
            pos = np.minimum(np.searchsorted(keys, h), len(keys) - 1)
            hit = keys[pos] == h  # np.isin would re-sort the 2M-key index for every document
            if not hit.any():
                continue
            flags[f"any{n}"] += 1
            hv = h[hit]
            lo = np.searchsorted(keys, hv, "left")
            hi = np.searchsorted(keys, hv, "right")
            sel = np.concatenate([np.arange(a, b) for a, b in zip(lo, hi)])
            ii, pp = its[sel], ps[sel]
            if n == 5:
                docs5[np.unique(ii)] += 1
                continue
            for i, p in zip(ii.tolist(), pp.tolist()):
                d = per.setdefault(i, {8: set(), 13: set(), "m13": 0})
                d[n].update(range(p, p + n))
                if n == 13:
                    d["m13"] += 1
        for i, d in per.items():
            for n in (8, 13):
                if d[n]:
                    cov_union[n].setdefault(i, set()).update(d[n])
            L_ = int(lens[i])
            cov8 = len(d[8]) / L_ if L_ else 0.0
            if d["m13"] or cov8 >= 0.2:
                s = sorted(d[8])
                run = best = 0
                prev = -2
                for p in s:
                    run = run + 1 if p == prev + 1 else 1
                    best = max(best, run)
                    prev = p
                pairs.append({"doc": doc_id, "item": i, "m13": d["m13"], "cov8": round(cov8, 4), "run8": best,
                              "ntok_doc": len(toks)})
    return flags, docs5, {n: {i: sorted(s) for i, s in cov_union[n].items()} for n in (8, 13)}, pairs


def _batches(it):
    b = []
    for x in it:
        b.append(x)
        if len(b) >= CHUNK:
            yield b
            b = []
    if b:
        yield b


def scan(corpus):
    t0 = time.time()
    items = C.bench_items()
    _, lens = build_index(items)
    nitems = len(lens)
    tot = {"docs": 0, "tokens": 0, "any5": 0, "any8": 0, "any13": 0}
    docs5 = np.zeros(nitems, dtype=np.int64)
    cov = {8: {}, 13: {}}
    pairs = []
    ctx = get_context("spawn")
    with ctx.Pool(WORKERS, initializer=_init, initargs=(nitems,)) as pool:
        for flags, d5, cu, pr in pool.imap_unordered(_scan, _batches(C.corpus_iter(corpus))):
            for k in tot:
                tot[k] += flags[k]
            docs5 += d5
            for n in (8, 13):
                for i, s in cu[n].items():
                    cov[n].setdefault(i, set()).update(s)
            pairs.extend(pr)
    od = C.out_dir("contam")
    cov8 = np.zeros(nitems, dtype=np.float32)
    cov13 = np.zeros(nitems, dtype=np.float32)
    for i, s in cov[8].items():
        cov8[i] = len(s) / lens[i]
    for i, s in cov[13].items():
        cov13[i] = len(s) / lens[i]
    np.savez_compressed(os.path.join(od, f"{corpus}.items.npz"), cov8=cov8, cov13=cov13, docs5=docs5, lens=lens)
    with gzip.open(os.path.join(od, f"{corpus}.pairs.jsonl.gz"), "wt") as f:
        for p in pairs:
            f.write(json.dumps(p) + "\n")
    summ = dict(tot, corpus=corpus, seconds=round(time.time() - t0, 1), pairs=len(pairs))
    json.dump(summ, open(os.path.join(od, f"{corpus}.summary.json"), "w"))
    print(json.dumps(summ), flush=True)


if __name__ == "__main__":
    names = sys.argv[1:]
    if names == ["all"]:
        names = list(C.CORPORA)
    for nm in names:
        scan(nm)


# ------------------------------------------------------------------ explaining one match
def aligned_tokens(text, keep_numbers=True):
    """Normalised tokens with the character span (in the original text) of the whitespace word each came from."""
    import re
    toks, spans = [], []
    for m in re.finditer(r"\S+", text):
        for t in norm_tokens(m.group(), keep_numbers):
            toks.append(t)
            spans.append((m.start(), m.end()))
    return toks, spans


def match_window(item_text, doc_text, n=8):
    """Positions of the document's tokens inside an n-gram shared with the item; returns (doc spans of the longest
    matched region, share of item tokens covered, longest run in doc tokens)."""
    it, _ = aligned_tokens(item_text)
    dt, ds = aligned_tokens(doc_text)
    ih = set(ngram_hashes(tok_hashes(it), n).tolist())
    dh = ngram_hashes(tok_hashes(dt), n)
    cov_doc = np.zeros(len(dt), dtype=bool)
    for j, h in enumerate(dh.tolist()):
        if h in ih:
            cov_doc[j:j + n] = True
    # longest run in the document
    best, cur, bs = (0, 0), 0, 0
    for j, c in enumerate(cov_doc):
        if c:
            if cur == 0:
                bs = j
            cur += 1
            if cur > best[1] - best[0]:
                best = (bs, j + 1)
        else:
            cur = 0
    if best[1] == best[0]:
        return None
    a, b = ds[best[0]][0], ds[best[1] - 1][1]
    return {"start": a, "end": b, "run_tokens": best[1] - best[0], "doc_tokens": len(dt), "item_tokens": len(it)}


def item_coverage(item_text, doc_text, n=8):
    """Boolean array over the item's normalised tokens: True where the token sits in an n-gram shared with doc."""
    it = norm_tokens(item_text)
    ih = ngram_hashes(tok_hashes(it), n)
    dh = set(ngram_hashes(tok_hashes(norm_tokens(doc_text)), n).tolist())
    cov = np.zeros(len(it), dtype=bool)
    for j, h in enumerate(ih.tolist()):
        if h in dh:
            cov[j:j + n] = True
    return it, cov
