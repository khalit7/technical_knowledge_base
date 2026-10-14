"""Exact dedup on the running example: whole documents, normalised documents, URLs, and lines/paragraphs.

Two inputs from run0: 'extracted' (19,241 documents straight out of Trafilatura, every language) and 'filtered'
(2,692 English documents that passed every heuristic filter, the input of MinHash).
Line (paragraph) dedup follows the Dolma toolkit's loop (deduper.rs: split on "\n", skip empty, if the paragraph's
hash is already in the filter mark it, else insert it), here with an exact set instead of a Bloom filter.
Writes out/dd_exact.json (counts and the most repeated lines: only lines seen on at least 5 different hosts, PII-scrubbed).
"""
import collections
import hashlib
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402
from datatrove.utils.text import simplify_text, TextNormConfig  # noqa: E402

NORM = TextNormConfig()


def h(s):
    return hashlib.blake2b(s.encode("utf-8", "replace"), digest_size=8).digest()


def measure(docs, top=False):
    n, chars = len(docs), sum(len(d["text"]) for d in docs)
    r = {"docs": n, "chars": chars}
    for key, f in [("doc_exact", lambda d: d["text"]), ("doc_norm", lambda d: simplify_text(d["text"], NORM)),
                   ("url", lambda d: d["url"])]:
        seen, rm, rmc = set(), 0, 0
        for d in docs:
            k = h(f(d))
            if k in seen:
                rm += 1; rmc += len(d["text"])
            else:
                seen.add(k)
        r[key] = {"removed": rm, "chars_removed": rmc}
    # paragraphs = lines, Dolma-style check-then-insert, keep the first occurrence
    seen, lines, dup, dupc, emptied, touched = set(), 0, 0, 0, 0, 0
    cnt, hosts = collections.Counter(), collections.defaultdict(set)
    for d in docs:
        host = urllib.parse.urlsplit(d["url"]).hostname or ""
        kept_any, hit = False, False
        for p in d["text"].split("\n"):
            if not p.strip():
                continue
            lines += 1
            k = h(p)
            if top:
                cnt[p] += 1; hosts[p].add(host)
            if k in seen:
                dup += 1; dupc += len(p); hit = True
            else:
                seen.add(k); kept_any = True
        touched += hit
        emptied += (hit and not kept_any)
    r["lines"] = {"total": lines, "dup": dup, "chars_removed": dupc, "docs_touched": touched, "docs_emptied": emptied}
    if top:
        rows = [(c, len(hosts[p]), p) for p, c in cnt.items() if c >= 5 and len(hosts[p]) >= 5]
        rows.sort(key=lambda x: (-x[1], -x[0]))
        r["top_lines"] = [[c, nh, C.scrub(p)[:160]] for c, nh, p in rows[:40]]
        r["top_long"] = [[c, nh, C.scrub(p)[:160]] for c, nh, p in rows if len(p) >= 40][:25]
        r["lines_on_5plus_hosts"] = {"distinct": len(rows), "occurrences": sum(c for c, _, _ in rows)}
    return r


res = {}
for stage in ("extracted", "filtered", "final"):
    docs = [C.clean_doc(d) for d in C.L.run0(stage)]
    res[stage] = measure(docs, top=(stage == "extracted"))
    x = res[stage]
    print(stage, x["docs"], "docs | exact", x["doc_exact"]["removed"], "| norm", x["doc_norm"]["removed"], "| url",
          x["url"]["removed"], "| lines", x["lines"])
C.save("dd_exact.json", res)
