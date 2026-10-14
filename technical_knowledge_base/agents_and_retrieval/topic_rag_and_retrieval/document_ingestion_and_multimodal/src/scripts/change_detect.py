"""Incremental re-indexing on real document revisions: how many chunks must be re-embedded when a paper changes?
usage: python -I change_detect.py <parsed_dir> <fetch_manifest.json> <out.json> [detail_paper_id]
<parsed_dir>/<id>v<k>.md holds one parser's output for every arXiv version of the selected QASPER papers.
For each paper with two or more versions, the last two are compared. Each version is chunked four ways, every
chunk is hashed (sha256 of whitespace-normalised lower-case text), and a chunk of the new version is reusable
when its hash already exists in the old version's set.
  fixed     : windows of 200 words, no overlap
  overlap   : windows of 200 words, stride 150 (50 words overlap)
  structure : paragraphs (blank-line separated blocks), headings start a new chunk, merged up to 200 words
  cdc       : content-defined chunking: a boundary after word i when hash(words i-2..i) % 24 == 0, chunks of
              60 to 400 words (the idea of rsync and LBFS: boundaries depend on content, not on position)
Floor: the share of the new version's words that difflib marks as inserted or replaced (the text that really
changed). Re-embedding cost is the share of new-version words in non-reusable chunks."""
import difflib, hashlib, json, os, re, sys, zlib

PD, MAN, OUT = sys.argv[1:4]
DETAIL = sys.argv[4] if len(sys.argv) > 4 else None
vers = json.load(open(MAN))["arxiv_versions"]


def words(t):
    return re.findall(r"\S+", t)


def h(ws):
    return hashlib.sha256(" ".join(w.lower() for w in ws).encode()).hexdigest()[:16]


def fixed(t, size=200, stride=200):
    w = words(t)
    return [w[i:i + size] for i in range(0, max(1, len(w) - (size - stride)), stride)]


def overlap(t):
    return fixed(t, 200, 150)


def structure(t, cap=200):
    blocks = [b.strip() for b in re.split(r"\n\s*\n", t) if b.strip()]
    out, cur = [], []
    for b in blocks:
        bw = words(b)
        head = b.startswith("#")
        if cur and (head or len(cur) + len(bw) > cap):
            out.append(cur); cur = []
        cur = cur + bw
        while len(cur) > cap * 2:          # a giant block is split by size
            out.append(cur[:cap]); cur = cur[cap:]
    if cur:
        out.append(cur)
    return out


def cdc(t, lo=60, hi=400, mod=24):
    w = words(t); out, cur = [], []
    for i, x in enumerate(w):
        cur.append(x)
        key = " ".join(w[max(0, i - 2):i + 1]).lower().encode()
        if (len(cur) >= lo and zlib.crc32(key) % mod == 0) or len(cur) >= hi:
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    return out


STRATS = {"fixed": fixed, "overlap": overlap, "structure": structure, "cdc": cdc}
res = {"papers": {}, "totals": {}}
tot = {s: [0, 0, 0, 0] for s in STRATS}  # reembed words, total words, reembed chunks, total chunks
tot_floor = [0, 0]
for pid, vs in sorted(vers.items()):
    if len(vs) < 2:
        continue
    a = os.path.join(PD, "%sv%d.md" % (pid, vs[-2])); b = os.path.join(PD, "%sv%d.md" % (pid, vs[-1]))
    if not (os.path.exists(a) and os.path.exists(b)):
        continue
    ta, tb = open(a).read(), open(b).read()
    wa, wb = [x.lower() for x in words(ta)], [x.lower() for x in words(tb)]
    sm = difflib.SequenceMatcher(None, wa, wb, autojunk=False)
    changed = sum(j2 - j1 for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag in ("insert", "replace"))
    ops = [[j1, j2] for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag in ("insert", "replace")]
    dels = sum(i2 - i1 for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag == "delete")
    r = {"versions": [vs[-2], vs[-1]], "words_old": len(wa), "words_new": len(wb), "words_changed": changed,
         "words_deleted_only": dels, "changes": ops}
    tot_floor[0] += changed; tot_floor[1] += len(wb)
    for s, fn in STRATS.items():
        ca, cb = fn(ta), fn(tb)
        old = set(h(c) for c in ca)
        flags = [h(c) in old for c in cb]
        rw = sum(len(c) for c, f in zip(cb, flags) if not f)
        r[s] = {"chunks_old": len(ca), "chunks_new": len(cb), "reembed_chunks": flags.count(False),
                "reembed_words": rw, "flags": flags,
                "sizes": [len(c) for c in cb]}
        t = tot[s]; t[0] += rw; t[1] += sum(len(c) for c in cb); t[2] += flags.count(False); t[3] += len(cb)
    res["papers"][pid] = r
    print(pid, vs[-2:], "changed %.1f%%" % (100 * changed / max(1, len(wb))),
          {s: "%d/%d" % (r[s]["reembed_chunks"], r[s]["chunks_new"]) for s in STRATS})
res["totals"] = {s: {"reembed_word_share": t[0] / max(1, t[1]), "reembed_chunks": t[2], "chunks": t[3]} for s, t in tot.items()}
res["totals"]["floor_changed_word_share"] = tot_floor[0] / max(1, tot_floor[1])
json.dump(res, open(OUT, "w"), indent=0)
print(json.dumps(res["totals"], indent=0))
