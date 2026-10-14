"""Does the answer evidence survive parsing? QASPER evidence paragraphs located in each parser's output.
usage: python -I score_qasper.py <RAG_SCRATCH> <papers.json> <ING_DIR> <out.json>
For every selected paper and every answerable question, the annotators' text evidence (QASPER validation;
FLOAT SELECTED entries are tables or figures and are counted separately) is searched in each parser's Markdown
of the latest arXiv version, after the normalisation below, as word trigrams: the share of the evidence's trigrams
that occur anywhere in the output (QASPER's text replaces citations and maths with placeholders such as BIBREF3 and
INLINEFORM0; trigrams that would span a placeholder are not counted).
  intact:  >= 90% of trigrams found   (the paragraph is there, a few words may differ)
  damaged: 50% to 90%  (there, but broken: hyphenated line ends, missing spaces, interleaved columns, inserted footers)
  lost:    < 50%
A surviving paragraph is located with rapidfuzz partial_ratio_alignment of its longest placeholder-free piece.
Retrieval check, with the root's defaults so the numbers sit beside its Pipeline lab: each text is cut into the
root's naive chunks (256 Qwen3 tokens, 32 tokens overlap, src/data chunk_default.py), BM25 with the root's settings
(bm25s, Lucene variant, k1 1.2, b 0.75, English stopwords, Snowball stemmer) ranks them for the question within its
own paper (QASPER's setting), and a question is a hit at k if one of the top-k chunks overlaps at least half of the
located span of one of its evidence paragraphs (lost evidence cannot be hit).
The reference row "s2orc" is the root's own text of the same papers (data/longdoc/docs.jsonl, from QASPER's
S2ORC-based full text), scored by the same code."""
import json, os, re, sys, unicodedata
import pandas as pd
from rapidfuzz import fuzz
import bm25s, Stemmer
from tokenizers import Tokenizer

RS, PAPERS, ING, OUT = sys.argv[1:5]
sel = json.load(open(PAPERS))["papers"]
q = pd.read_parquet(os.path.join(RS, "data", "raw", "qasper", "validation.parquet"))
q = q[q["id"].isin(sel)]
REP = {"‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "−": "-",
       "ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl"}


def norm(s):
    s = unicodedata.normalize("NFKC", s)
    for a, b in REP.items():
        s = s.replace(a, b)
    s = re.sub(r"[*_`#|]", " ", s)          # Markdown marks ignored, as olmOCR-bench does
    return re.sub(r"\s+", " ", s).strip().lower()


qs, evid = [], {}
for _, r in q.iterrows():
    qa = r["qas"]
    for qi, (question, qid) in enumerate(zip(qa["question"], qa["question_id"])):
        anns = [a for a in qa["answers"][qi]["answer"] if not a["unanswerable"]]
        if not anns:
            continue
        ev = [e for a in anns for e in a["evidence"]]
        tx = sorted(set(norm(e) for e in ev if not e.startswith("FLOAT SELECTED") and len(e.strip()) > 20))
        fl = sorted(set(e for e in ev if e.startswith("FLOAT SELECTED")))
        qs.append({"qid": qid, "paper": r["id"], "question": question, "text_ev": tx, "float_ev": fl})
        for e in tx:
            evid.setdefault((r["id"], e), 0)
parsers = sorted(d for d in os.listdir(os.path.join(ING, "out_qasper")) if not d.startswith(".")) + ["s2orc"]
TOK = Tokenizer.from_file(os.path.join(RS, "models", "Qwen3-Embedding-0.6B", "tokenizer.json"))
STEM = Stemmer.Stemmer("english")
ref = {}
for line in open(os.path.join(RS, "data", "longdoc", "docs.jsonl")):
    d = json.loads(line)
    if d["paper_id"] in sel:
        ref[d["paper_id"]] = d["text"]


def chunks(text, size=256, over=32):
    off = TOK.encode(text, add_special_tokens=False).offsets
    out, i, n = [], 0, len(off)
    while i < n:
        j = min(i + size, n)
        out.append((off[i][0], off[j - 1][1]))
        if j == n:
            break
        i = j - over
    return out
PH = re.compile(r"\b(?:bibref|inlineform|displayform|tabref|figref|secref)\d+\b")  # QASPER's placeholders
grams = {}
res = {"n_papers": len(sel), "n_questions": len(qs), "n_text_evidence": len(evid),
       "n_questions_float_only": sum(1 for x in qs if x["float_ev"] and not x["text_ev"]), "parsers": {}, "evidence": {}}
for p in parsers:
    docs = {}
    for pid in sel:
        f = os.path.join(ING, "out_qasper", p, pid + ".md")
        if p == "s2orc":
            docs[pid] = norm(ref.get(pid, ""))
        else:
            docs[pid] = norm(open(f).read()) if os.path.exists(f) else ""
    loc, cls = {}, {"intact": 0, "damaged": 0, "lost": 0}
    for (pid, e) in evid:
        d = docs[pid]
        if pid not in grams.setdefault(p, {}):
            w = re.findall(r"\w+", d)
            grams[p][pid] = set(zip(w, w[1:], w[2:]))
        segs = [re.findall(r"\w+", x) for x in PH.split(e)]
        eg = [g for w in segs for g in zip(w, w[1:], w[2:])]
        rec = sum(1 for g in eg if g in grams[p][pid]) / max(1, len(eg))
        c = "intact" if rec >= 0.9 else "damaged" if rec >= 0.5 else "lost"
        cls[c] += 1
        loc[(pid, e)] = None
        if c != "lost" and d:
            probe = " ".join(max(segs, key=len))
            al = fuzz.partial_ratio_alignment(probe, d)
            loc[(pid, e)] = (al.dest_start, al.dest_end)
        res["evidence"].setdefault(pid + "|" + e[:60], {})[p] = round(rec, 3)
    hits = {1: 0, 3: 0, 5: 0}
    for pid in sel:
        d = docs[pid]
        wins = chunks(d) if d else []
        texts = [d[a:b] for a, b in wins]
        pq = [x for x in qs if x["paper"] == pid]
        if not texts:
            continue
        ret = bm25s.BM25(method="lucene", k1=1.2, b=0.75)
        ret.index(bm25s.tokenize(texts, stopwords="en", stemmer=STEM, show_progress=False), show_progress=False)
        for x in pq:
            spans = [loc[(pid, e)] for e in x["text_ev"] if loc.get((pid, e))]
            if not spans:
                continue
            k = min(5, len(texts))
            ids, _ = ret.retrieve(bm25s.tokenize([norm(x["question"])], stopwords="en", stemmer=STEM, show_progress=False), k=k, show_progress=False)
            ids = list(ids[0])
            for kk in hits:
                top = [wins[i] for i in ids[:kk]]
                if any(min(b, wb) - max(a, wa) >= 0.5 * (b - a) for (a, b) in spans for (wa, wb) in top):
                    hits[kk] += 1
    nq = sum(1 for x in qs if x["text_ev"])
    res["parsers"][p] = {"evidence": cls, "recall_at": {k: v / nq for k, v in hits.items()}, "n_q_text": nq,
                         "chars": sum(len(v) for v in docs.values())}
    print(p, cls, {k: round(v / nq, 3) for k, v in hits.items()})
json.dump(res, open(OUT, "w"), indent=0)
