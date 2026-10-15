"""Open a fastText quality classifier: rebuild its prediction by hand from the weights, exactly.

fastText v0.9.2 (supervised, softmax loss), read at the pinned source in $DC_SCRATCH/src/fasttext:
  - tokens: the line split on whitespace, plus the end-of-sentence token "</s>" (python predict appends "\n",
    FastText.py:215; readWord turns it into EOS);
  - input ids: every in-vocabulary token's id (dictionary.cc:395-397) plus, for every pair of consecutive tokens
    (in-vocabulary or not), bucket nwords + (h % bucket) with h = h_i * 116049371 + h_j (dictionary.cc:312-322, 409-420),
    where h_i is the 32-bit FNV-1a hash of the token with bytes sign-extended (dictionary.cc:163-170), stored as int32
    (dictionary.cc:382) and so sign-extended again when widened to uint64 (dictionary.cc:317-319);
  - hidden = mean of the input rows (model.cc:42-50); logits = output matrix x hidden; softmax.
With two labels, logit(hq) - logit(cc) = sum over features of (w_hq - w_cc) . row / N, so every feature's push is exact.

usage: qc_ftexplain.py check <model.bin> <n docs>   (verifies the decomposition on run0 final docs)
       qc_ftexplain.py vocab <model.bin> <out.json> (top and bottom words and frequent bigrams by push)
Imported by other scripts: FT(model_path).explain(text)."""
import json
import sys

import re

import numpy as np

import qc_common as C

WS = re.compile(r"[ \n\t\v\f\r\0]+")  # fastText readWord splits on these ASCII bytes only (dictionary.cc:readWord)


def sx(h32):
    """int32 -> uint64 the way C++ converts a negative int32_t to uint64_t (two's complement, sign-extended)."""
    v = h32 - (1 << 32) if h32 >= (1 << 31) else h32
    return v & 0xFFFFFFFFFFFFFFFF


def fnv(tok):
    h = 2166136261
    for b in tok.encode("utf-8"):
        sb = b - 256 if b > 127 else b          # int8_t(str[i])
        h = (h ^ (sb & 0xFFFFFFFF)) & 0xFFFFFFFF  # uint32_t(int8_t) sign-extends
        h = (h * 16777619) & 0xFFFFFFFF
    return h


class FT:
    def __init__(self, path, hq="__label__hq"):
        import fasttext
        fasttext.FastText.eprint = lambda *a, **k: None
        self.m = fasttext.load_model(path)
        a = self.m.f.getArgs()
        self.bucket, self.ngrams = a.bucket, a.wordNgrams
        self.nwords = len(self.m.words)
        labs = self.m.labels
        wo = self.m.get_output_matrix()
        i_hq = labs.index(hq)
        i_lo = 1 - i_hq
        self.d = (wo[i_hq] - wo[i_lo]).astype(np.float64)  # push direction
        self.hq = hq

    def features(self, text):
        toks = [t for t in WS.split(C.one_line(text)) if t] + ["</s>"]
        ids, names = [], []
        hs = []
        for t in toks:
            wid = self.m.get_word_id(t)
            if wid >= 0:
                ids.append(wid); names.append(("w", t))
            hs.append(sx(fnv(t)))  # stored in a std::vector<int32_t> (dictionary.cc:382), so sign-extended below
        if self.ngrams >= 2:
            for i in range(len(hs) - 1):
                h = hs[i]
                for j in range(i + 1, min(len(hs), i + self.ngrams)):
                    h = (h * 116049371 + hs[j]) & 0xFFFFFFFFFFFFFFFF
                    ids.append(self.nwords + int(h % self.bucket)); names.append(("b", toks[i] + " " + toks[j]))
        return toks, ids, names

    def push(self, idx):
        return float(np.dot(self.m.get_input_vector(idx).astype(np.float64), self.d))

    def explain(self, text):
        toks, ids, names = self.features(text)
        n = len(ids)
        pushes = np.array([self.push(i) for i in ids]) if n else np.zeros(0)
        logit = float(pushes.sum() / n) if n else 0.0
        p = 1.0 / (1.0 + np.exp(-logit))
        labs, ps = self.m.predict(C.one_line(text), k=-1)
        p_ft = float(dict(zip(labs, ps)).get(self.hq, 0.0))
        return {"tokens": toks, "names": names, "push": pushes, "n": n, "logit": logit, "p": float(p), "p_fasttext": p_ft}


def check(path, n):
    ft = FT(path)
    docs = C.L.run0("final", limit=n)
    diffs = []
    for d in docs:
        e = ft.explain(d["text"])
        diffs.append(abs(e["p"] - e["p_fasttext"]))
    print(json.dumps({"model": path.split("/")[-1], "n": len(diffs), "max_abs_diff": max(diffs), "mean_abs_diff": float(np.mean(diffs))}))
    return max(diffs)


def vocab(path, out, min_count_bigram=8):
    ft = FT(path)
    M = ft.m.get_input_matrix()  # (nwords + bucket) x dim, float32
    s = M[:ft.nwords].astype(np.float64) @ ft.d
    words = ft.m.words
    _, freq = ft.m.get_words(include_freq=True)
    freq = np.asarray(freq)
    common = np.where(freq >= 200)[0]  # words seen at least 200 times in the classifier's training data
    order = common[np.argsort(s[common])]
    top = [[words[i], float(s[i]), int(freq[i])] for i in order[::-1][:60]]
    bot = [[words[i], float(s[i]), int(freq[i])] for i in order[:60]]
    # bigrams: name them from the run0 documents (bucket ids cannot be inverted)
    from collections import Counter
    cnt = Counter()
    for d in C.L.run0("final"):
        t = [x for x in WS.split(C.one_line(d["text"])) if x]
        cnt.update(zip(t, t[1:]))
    bg = []
    for (a, b), c in cnt.items():
        if c < min_count_bigram:
            continue
        h = (sx(fnv(a)) * 116049371 + sx(fnv(b))) & 0xFFFFFFFFFFFFFFFF
        idx = ft.nwords + int(h % ft.bucket)
        bg.append([a + " " + b, float(M[idx].astype(np.float64) @ ft.d), c])
    bg.sort(key=lambda r: -r[1])
    res = {"model": path.split("/")[-1], "nwords": ft.nwords, "bucket": ft.bucket, "dim": int(M.shape[1]),
           "n_common_words": int(len(common)), "top_words": top, "bottom_words": bot,
           "top_bigrams": bg[:40], "bottom_bigrams": bg[-40:][::-1], "n_bigrams_named": len(bg),
           "push_quantiles_common": {q: float(np.quantile(s[common], q)) for q in (0.01, 0.1, 0.5, 0.9, 0.99)}}
    with open(out, "w") as f:
        json.dump(res, f, indent=1, ensure_ascii=False)
    print(out, len(top), len(bg))


if __name__ == "__main__":
    if sys.argv[1] == "check":
        check(sys.argv[2], int(sys.argv[3]))
    elif sys.argv[1] == "vocab":
        vocab(sys.argv[2], sys.argv[3])
