"""CCNet perplexity on the run0 final documents with CCNet's own English Wikipedia models
(dl.fbaipublicfiles.com/cc_net/lm/en.arpa.bin and en.sp.model, the files cc_net's Makefile:55-56 fetches).
Ported from cc_net at bda555bd (2020-12-09):
  text_normalizer.normalize (text_normalizer.py:158-173): lower case, strip accents, digits -> 0, unicode punctuation
  SentencePiece.do (perplexity.py:66-73): sentencepiece pieces joined by spaces
  DocLM.do (perplexity.py:207-222): per line log10 score, length = pieces + 1, doc ppl = 10 ** (-sum score / sum length)
  PerplexityBucket (perplexity.py:257-286): head if ppl < cutoff[30], middle if < cutoff[60], else tail; English
  cutoffs from cc_net/data/cutoff.csv (en column): 30th percentile 340, 60th 520.
CPU only (KenLM is an n-gram model: no GPU needed). Needs the kenlm + sentencepiece venv (see README.md).
usage: q_ccnet.py   -> $DC_SCRATCH/q/ccnet_run0.jsonl and out/q_ccnet.json (summary)
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import load as L  # noqa: E402
import kenlm  # noqa: E402
import sentencepiece  # noqa: E402

# --- cc_net's own normaliser, loaded from the pinned clone ($DC_SCRATCH/src/cc_net, commit bda555bd) ---
import importlib.util  # noqa: E402
_spec = importlib.util.spec_from_file_location("tn", os.path.join(L.scratch(), "src", "cc_net", "cc_net", "text_normalizer.py"))
tn = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(tn)
normalize = tn.normalize  # defaults accent=True, case=True, numbers=True, punct=1 (text_normalizer.py:158)


D = os.path.join(L.scratch(), "data", "models", "ccnet_lm_en")
sp = sentencepiece.SentencePieceProcessor()
sp.load(os.path.join(D, "en.sp.model"))
t0 = time.time()
lm = kenlm.Model(os.path.join(D, "en.arpa.bin"))
print("loaded LM in", round(time.time() - t0), "s", flush=True)
HEAD, TAIL = 340.0, 520.0


def ppl(text):
    tok = " ".join(sp.encode_as_pieces(normalize(text)))  # SentencePiece.do with normalize=True
    s, n = 0.0, 0
    for line in tok.split("\n"):  # DocLM.get_lines splits the tokenized field on newlines
        s += lm.score(line)
        n += len(line.split()) + 1
    return 10.0 ** (-s / n), n


def bucket(p):
    return "head" if p < HEAD else ("middle" if p < TAIL else "tail")


if __name__ == "__main__":
    for probe in ["I am very perplexed", "im hella trippin"]:
        print(probe, round(ppl(probe)[0], 1))
    docs = L.run0("final")
    out = open(os.path.join(L.scratch(), "q", "ccnet_run0.jsonl"), "w")
    cnt = {"head": 0, "middle": 0, "tail": 0}
    t0 = time.time()
    for d in docs:
        p, n = ppl(d["text"])
        b = bucket(p)
        cnt[b] += 1
        out.write(json.dumps({"id": d["id"], "ppl": round(p, 1), "len": n, "bucket": b}) + "\n")
    secs = time.time() - t0
    s = {"n": len(docs), "buckets": cnt, "cutoffs_en": {"p30_head": HEAD, "p60_tail": TAIL},
         "secs_rough": round(secs), "ccnet_commit": "bda555bd1cf1ee2e0b925363e62a61cd46c8b60d"}
    print(s)
    json.dump(s, open(os.path.join(HERE, "out", "q_ccnet.json"), "w"), indent=1)
