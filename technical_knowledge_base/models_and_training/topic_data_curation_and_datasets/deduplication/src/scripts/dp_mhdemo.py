"""Data for the MinHash step-by-step animation: three real pairs from run0's filtered documents, computed with
datatrove 0.10.1's own code (MinhashDedupSignature: simplify_text, spaCy English word tokenizer, 5-grams, 64-bit
xxhash of each shingle, 112 functions (a*x + b) mod (2^61 - 1) with seed 1, 14 bands of 8).

Pairs (boilerplate only, no personal data; text passed through the PII formatter anyway):
  forum   vBulletin forum chrome on two different forums (Jaccard 0.59)
  agilent two product pages of one shop, same template, different product (0.86)
  stack   two Stack Exchange sites' sign-up chrome (0.95)
Writes ../data/out/dp_mhdemo.json.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dp_common as P  # noqa: E402
from datatrove.utils.text import simplify_text  # noqa: E402

PAIRS = {"forum": (410, 1529), "agilent": (1623, 1624), "stack": (1310, 1382)}
docs = list(P.C.L.run0("filtered"))
sg = P.C.signer()
a, b = sg.parameters
MP = np.uint64((1 << 61) - 1)
out = {"pairs": {}}
for name, (x, y) in PAIRS.items():
    rec = {"docs": []}
    sets = []
    for i in (x, y):
        text = docs[i]["text"]
        words = sg.word_tokenizer.word_tokenize(simplify_text(text, sg.config.norm_config))
        grams = [" ".join(words[k:k + 5]) for k in range(len(words) - 4)]
        hashes = [int(sg._hash_func(g)) for g in grams]
        uniq = {}
        for g, h in zip(grams, hashes):
            uniq.setdefault(h, g)
        hs = np.array(sorted(uniq), dtype=np.uint64).reshape(-1, 1)
        phv = (hs * a + b) % MP
        sig = np.min(phv, axis=0)
        ref = np.concatenate(sg.get_signature(sg.get_shingles(text)))
        assert (sig == ref).all(), "signature differs from datatrove's"
        host = (docs[i].get("metadata", {}).get("url", "").split("/") + ["", "", ""])[2]
        rec["docs"].append({"host": host, "text": P.C.scrub(text), "n_words": len(words),
                            "shingles": [uniq[int(h)] for h in hs.ravel()],
                            # hashed values shown as thousandths of the range (2^61 - 1); argmin8 is exact
                            "f8": [[int(int(v) * 1000 // int(MP)) for v in phv[:, k]] for k in range(8)],
                            "argmin8": [int(np.argmin(phv[:, k])) for k in range(8)],
                            "sig": [format(int(v), "x") for v in sig],
                            "sigf": [int(int(v) * 10000 // int(MP)) for v in sig]})
        sets.append(set(int(h) for h in hs.ravel()))
    inter, union = len(sets[0] & sets[1]), len(sets[0] | sets[1])
    s0 = np.array([int(v, 16) for v in rec["docs"][0]["sig"]], dtype=object)
    s1 = np.array([int(v, 16) for v in rec["docs"][1]["sig"]], dtype=object)
    eq = [int(u == v) for u, v in zip(s0, s1)]
    bands = [int(all(eq[k * 8:(k + 1) * 8])) for k in range(14)]
    rec.update({"inter": inter, "union": union, "j": round(inter / union, 4), "eq": eq, "est": round(sum(eq) / 112, 4),
                "bands": bands, "candidate": int(any(bands))})
    for d in rec["docs"]:
        d.pop("sig")
    out["pairs"][name] = rec
    print(name, inter, union, rec["j"], rec["est"], bands)
P.save("dp_mhdemo.json", out)
