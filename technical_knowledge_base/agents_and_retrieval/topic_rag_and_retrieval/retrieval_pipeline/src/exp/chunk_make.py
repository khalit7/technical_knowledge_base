"""Chunk the 281 QASPER papers with the REAL LangChain splitters (langchain-text-splitters 1.1.3, own env
$RAG_SCRATCH/rp/venv), and measure tokenizer facts. No model runs; CPU only.
Writes chunk spans in the root's format ($RAG_SCRATCH/rp/chunks/<name>.jsonl: cid, paper_id, start, end, n_tokens in
Qwen3 tokens) for chunk_eval_rp.py, and out/chunk_internals.json (tokenizer and segmentation statistics).
usage: $RAG_SCRATCH/rp/venv/bin/python -I -B chunk_make.py"""
import bisect
import json
import os
import re
import sys

import numpy as np

RS = os.environ["RAG_SCRATCH"]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "out"))
CH = os.path.join(RS, "rp", "chunks")
os.makedirs(CH, exist_ok=True)

from transformers import AutoTokenizer  # noqa: E402
from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter  # noqa: E402

docs = [json.loads(l) for l in open(os.path.join(RS, "data", "longdoc", "docs.jsonl"))]
TOK = {"qwen3": AutoTokenizer.from_pretrained(os.path.join(RS, "models", "Qwen3-Embedding-0.6B")),
       "bert (bge-small, MiniLM)": AutoTokenizer.from_pretrained(os.path.join(RS, "models", "bge-small-en-v1.5")),
       "modernbert (gte)": AutoTokenizer.from_pretrained(os.path.join(RS, "models", "gte-modernbert-base"))}
qtok = TOK["qwen3"]


class Off:
    """Qwen3 token start offsets of one paper, to count tokens of any character span (as the root's chunkers.Doc)."""
    def __init__(self, text):
        enc = qtok(text, add_special_tokens=False, return_offsets_mapping=True)
        self.starts = [o[0] for o in enc["offset_mapping"]]

    def ntok(self, s, e):
        return bisect.bisect_left(self.starts, e) - bisect.bisect_left(self.starts, s)


def spans_from_texts(text, pieces):
    """map chunk strings back to character spans (in order; LangChain strips whitespace)"""
    out, pos = [], 0
    for p in pieces:
        k = text.find(p, pos)
        if k < 0:
            k = text.find(p)
        if k < 0:
            raise RuntimeError("piece not found")
        out.append((k, k + len(p)))
        pos = k + 1
    return out


def spans_from_lines(text, pieces):
    """MarkdownHeaderTextSplitter drops blank lines and joins lines with two spaces + newline
    (markdown.py lines 107, 122), so a piece is matched by its first and last line."""
    out, pos = [], 0
    for p in pieces:
        lines = [x.strip() for x in p.split("\n") if x.strip()]
        a = text.find(lines[0], pos)
        z = text.find(lines[-1], a)
        if a < 0 or z < 0:
            raise RuntimeError("line not found")
        out.append((a, z + len(lines[-1])))
        pos = a + 1
    return out


def qlen(s):
    return len(qtok(s, add_special_tokens=False)["input_ids"])


SPLITTERS = {
    # LangChain defaults: separators ["\n\n", "\n", " ", ""], keep_separator True (character.py lines 101, 107)
    "lc-rec-tok256": RecursiveCharacterTextSplitter(chunk_size=256, chunk_overlap=32, length_function=qlen),
    # the same with a sentence separator added, as the root Pipeline lab's recursive-256 rule
    "lc-rec-tok256-sent": RecursiveCharacterTextSplitter(chunk_size=256, chunk_overlap=32, length_function=qlen,
                                                         separators=["\n\n", "\n", ". ", " ", ""]),
    # the LangChain RAG tutorial setting: 1,000 characters, 200 overlap, length = len (characters)
    "lc-rec-char1000": RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200),
    # the library default: 4,000 characters, 200 overlap (base.py lines 64-66)
    "lc-rec-char4000": RecursiveCharacterTextSplitter(),
}


def main():
    stats = {"papers": len(docs)}
    # ---- tokenizer facts on the papers
    tt = {}
    chars = sum(len(d["text"]) for d in docs)
    words = sum(len(d["text"].split()) for d in docs)
    for name, tk in TOK.items():
        n = sum(len(tk(d["text"], add_special_tokens=False)["input_ids"]) for d in docs)
        tt[name] = {"tokens": n, "chars_per_token": round(chars / n, 2), "tokens_per_word": round(n / words, 3)}
    stats["tokenizers"] = tt
    stats["chars"] = chars
    stats["words"] = words
    # ---- chunk with the real splitters
    offs = {d["paper_id"]: Off(d["text"]) for d in docs}
    made = {}
    for name, sp in SPLITTERS.items():
        if os.path.exists(os.path.join(CH, name + ".jsonl")):
            made[name] = sum(1 for _ in open(os.path.join(CH, name + ".jsonl")))
            continue
        rows = []
        for d in docs:
            pieces = sp.split_text(d["text"])
            for i, (a, b) in enumerate(spans_from_texts(d["text"], pieces)):
                rows.append({"cid": "%s_%03d" % (d["paper_id"], i), "paper_id": d["paper_id"], "start": a, "end": b,
                             "n_tokens": offs[d["paper_id"]].ntok(a, b)})
        with open(os.path.join(CH, name + ".jsonl"), "w") as f:
            for r in rows:
                f.write(json.dumps(r) + "\n")
        made[name] = len(rows)
        print(name, len(rows), flush=True)
    # Markdown header split (sections), then the token recursive splitter inside each section
    md = MarkdownHeaderTextSplitter(headers_to_split_on=[("#", "title"), ("##", "section")])
    inner = SPLITTERS["lc-rec-tok256"]
    rows = []
    for d in docs:
        pieces = []
        for doc in md.split_text(d["text"]):
            pieces += inner.split_text(doc.page_content)
        for i, (a, b) in enumerate(spans_from_lines(d["text"], pieces)):
            rows.append({"cid": "%s_%03d" % (d["paper_id"], i), "paper_id": d["paper_id"], "start": a, "end": b,
                         "n_tokens": offs[d["paper_id"]].ntok(a, b)})
    with open(os.path.join(CH, "lc-md+rec-tok256.jsonl"), "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    made["lc-md+rec-tok256"] = len(rows)
    stats["made"] = made
    # ---- what each embedder actually reads of character-sized chunks (silent truncation)
    trunc = {}
    limits = {"MiniLM-L6 (256)": ("bert (bge-small, MiniLM)", 256), "bge-small (512)": ("bert (bge-small, MiniLM)", 512),
              "gte-modernbert (1,024 here)": ("modernbert (gte)", 1024)}
    text = {d["paper_id"]: d["text"] for d in docs}
    for name in ("lc-rec-char1000", "lc-rec-char4000", "lc-rec-tok256"):
        rows = [json.loads(l) for l in open(os.path.join(CH, name + ".jsonl"))]
        rs = np.random.RandomState(0)
        sample = [rows[i] for i in rs.choice(len(rows), min(1500, len(rows)), replace=False)]
        res = {}
        for lname, (tkn, lim) in limits.items():
            n = np.array([len(TOK[tkn](text[r["paper_id"]][r["start"]:r["end"]], add_special_tokens=True)["input_ids"]) for r in sample])
            res[lname] = {"share_over": round(float((n > lim).mean()), 3), "share_of_tokens_seen": round(float(np.minimum(n, lim).sum() / n.sum()), 3),
                          "median_tokens": int(np.median(n))}
        trunc[name] = res
    stats["truncation"] = trunc
    # ---- chunk-count formula check: fixed windows (root's fixed-512-64 file), n = ceil((L - o) / (c - o))
    fx = {}
    for (c, o, f) in ((256, 32, "fixed-256-32"), (512, 64, "fixed-512-64"), (128, 16, "fixed-128-16")):
        rows = [json.loads(l) for l in open(os.path.join(RS, "pipe", "chunks", f + ".jsonl"))]
        per = {}
        for r in rows:
            per[r["paper_id"]] = per.get(r["paper_id"], 0) + 1
        ok = 0
        for d in docs:
            Ld = len(offs[d["paper_id"]].starts)
            n = 1 if Ld <= c else -(-(Ld - o) // (c - o))
            ok += n == per[d["paper_id"]]
        Ltot = sum(len(offs[d["paper_id"]].starts) for d in docs)
        fx[f] = {"papers_matching_formula": ok, "total_tokens_stored": int(sum(r["n_tokens"] for r in rows)), "raw_tokens": Ltot,
                 "overhead": round(sum(r["n_tokens"] for r in rows) / Ltot - 1, 3)}
    stats["formula"] = fx
    # ---- sentence segmentation: the root's regex vs pysbd, on every paragraph
    import pysbd
    seg = pysbd.Segmenter(language="en", clean=False, char_span=True)
    SENT_END = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\[(])")
    ABBR = re.compile(r"(?:\bet al\.|\be\.g\.|\bi\.e\.|\bFig\.|\bFigs\.|\bEq\.|\bSec\.|\bTab\.|\bvs\.|\bcf\.|\bapprox\.|\bresp\.|\bNo\.|\bal\.)$")
    nre = npy = sre = spy = 0
    ex = []
    for d in docs[::3]:
        for p in d["paragraphs"]:
            t = d["text"][p["start"]:p["end"]]
            a = 0
            parts = []
            for m in SENT_END.finditer(t):
                parts.append(t[a:m.start()]); a = m.end()
            parts.append(t[a:])
            nre += len(parts)
            bad = [x for x in parts[:-1] if ABBR.search(x.strip())]
            sre += len(bad)
            if bad and len(ex) < 3:
                ex.append(bad[0][-80:])
            sp_ = [s.sent for s in seg.segment(t)]
            npy += len(sp_)
            spy += sum(1 for x in sp_[:-1] if ABBR.search(x.strip()))
    stats["sentences"] = {"papers": len(docs[::3]), "regex": {"sentences": nre, "split_after_abbreviation": sre},
                          "pysbd 0.3.4": {"sentences": npy, "split_after_abbreviation": spy}, "regex_examples": ex}
    os.makedirs(OUT, exist_ok=True)
    json.dump(stats, open(os.path.join(OUT, "chunk_internals.json"), "w"), separators=(",", ":"))
    print(json.dumps(stats, indent=1)[:4000])


if __name__ == "__main__":
    main()
