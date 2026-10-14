"""Chunking strategies for the QASPER papers, all measured in Qwen3 tokens (the tokenizer of the main embedder
and of the generators). Each strategy returns, per paper, a list of character spans (start, end) into the
paper's text; chunk_eval.py scores them. Strategies:

  fixed-<size>-<overlap>  windows of <size> tokens, <overlap> tokens shared with the previous window, cut on
                          token boundaries (setup's default is fixed-256-32)
  recursive-256           LangChain RecursiveCharacterTextSplitter's algorithm (separators "\n\n", "\n", ". ",
                          " "; merge pieces up to the size, keep up to 32 tokens of overlap) with tokens as length
  sentence-256            sentences packed greedily up to 256 tokens; paragraph and section breaks are ignored
                          (a chunk never cuts a sentence, but may straddle two sections)
  structure-256           paragraphs packed up to 256 tokens, never across a section heading; a paragraph longer
                          than 256 tokens is split at sentence ends
  paragraph               one chunk per paragraph, whatever its size (long ones stay long)
  semantic-p<q>           sentences; cut where the cosine similarity between neighbouring sentences (bge-small) falls
                          below the paper's q-th percentile, with a 512-token cap (see semantic.py)
"""
import bisect
import re

SENT_END = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\[(])")


class Doc:
    def __init__(self, d, tok):
        self.d = d
        self.text = d["text"]
        enc = tok(self.text, add_special_tokens=False, return_offsets_mapping=True)
        self.off = enc["offset_mapping"]
        self.starts = [o[0] for o in self.off]
        self.ends = [o[1] for o in self.off]

    def ntok(self, s, e):
        """tokens whose span starts inside [s, e)"""
        return bisect.bisect_left(self.starts, e) - bisect.bisect_left(self.starts, s)

    # ---- units
    def paragraphs(self):
        return [(p["start"], p["end"], p["section"]) for p in self.d["paragraphs"]]

    def sentences(self, s, e):
        out, a = [], s
        for m in SENT_END.finditer(self.text, s, e):
            if m.start() > a:
                out.append((a, m.start()))
            a = m.end()
        if e > a:
            out.append((a, e))
        return out


def fixed(doc, size, over):
    n = len(doc.off)
    i, out = 0, []
    while i < n:
        j = min(i + size, n)
        out.append((doc.off[i][0], doc.off[j - 1][1]))
        if j == n:
            break
        i = j - over
    return out


def recursive(doc, size=256, over=32, seps=("\n\n", "\n", ". ", " ")):
    text = doc.text

    def split(s, e, seps):
        sep = next((x for x in seps if text.find(x, s, e) >= 0), None)
        rest = seps[seps.index(sep) + 1:] if sep else ()
        pieces, a = [], s
        if sep is None:  # fall back to tokens
            return fixed_span(s, e)
        while True:
            k = text.find(sep, a, e)
            if k < 0:
                pieces.append((a, e))
                break
            pieces.append((a, k + len(sep)))  # keep the separator with the piece before it
            a = k + len(sep)
        pieces = [p for p in pieces if p[1] > p[0]]
        out, good = [], []
        for p in pieces:
            if doc.ntok(*p) < size:
                good.append(p)
            else:
                if good:
                    out += merge(good)
                    good = []
                out += split(p[0], p[1], rest) if rest else fixed_span(*p)
        if good:
            out += merge(good)
        return out

    def fixed_span(s, e):
        i0 = bisect.bisect_left(doc.starts, s)
        i1 = bisect.bisect_left(doc.starts, e)
        out, i = [], i0
        while i < i1:
            j = min(i + size, i1)
            out.append((doc.off[i][0], doc.off[j - 1][1]))
            if j == i1:
                break
            i = j - over
        return out

    def merge(pieces):
        docs, cur, tot = [], [], 0
        for p in pieces:
            n = doc.ntok(*p)
            if cur and tot + n > size:
                docs.append((cur[0][0], cur[-1][1]))
                while cur and (tot > over or tot + n > size):
                    tot -= doc.ntok(*cur[0])
                    cur.pop(0)
            cur.append(p)
            tot += n
        if cur:
            docs.append((cur[0][0], cur[-1][1]))
        return docs

    return [(a, b) for a, b in split(0, len(text), seps) if text[a:b].strip()]


def pack(doc, units, size):
    """greedy: consecutive units into chunks up to `size` tokens; a unit larger than size is its own chunk"""
    out, cur = [], None
    for s, e in units:
        if cur is None:
            cur = [s, e]
        elif doc.ntok(cur[0], e) <= size:
            cur[1] = e
        else:
            out.append(tuple(cur))
            cur = [s, e]
    if cur:
        out.append(tuple(cur))
    return out


def sentence(doc, size=256):
    sents = []
    for s, e, _ in doc.paragraphs():
        sents += doc.sentences(s, e)
    return pack(doc, sents, size)


def structure(doc, size=256):
    out, by_sec = [], []
    last = None
    for s, e, sec in doc.paragraphs():
        if sec != last:
            if by_sec:
                out += pack(doc, by_sec, size)
            by_sec, last = [], sec
        if doc.ntok(s, e) > size:
            by_sec += doc.sentences(s, e)  # long paragraph: allow cuts at sentence ends
        else:
            by_sec.append((s, e))
    if by_sec:
        out += pack(doc, by_sec, size)
    # a single sentence longer than size stays whole (rare)
    return out


def paragraph(doc):
    return [(s, e) for s, e, _ in doc.paragraphs()]


STRATEGIES = {
    "fixed-128-16": lambda d: fixed(d, 128, 16),
    "fixed-256-0": lambda d: fixed(d, 256, 0),
    "fixed-256-32": lambda d: fixed(d, 256, 32),
    "fixed-512-64": lambda d: fixed(d, 512, 64),
    "recursive-256": lambda d: recursive(d, 256, 32),
    "sentence-256": lambda d: sentence(d, 256),
    "structure-256": lambda d: structure(d, 256),
    "paragraph": paragraph,
}
