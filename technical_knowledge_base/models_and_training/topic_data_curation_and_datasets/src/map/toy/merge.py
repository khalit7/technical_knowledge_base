"""Merge the two toy runs (out/raw_toy_datatrove.json, out/raw_toy_dolma.json) with the toy documents into
out/toy_check.json, adding the page's captions. Every count in a caption is computed from the runs; the wording
around them was written after reading the results (2026-10-14). Run: python3 src/map/toy/merge.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(H, "..", "out")
dt = json.load(open(os.path.join(O, "raw_toy_datatrove.json"))); dm = json.load(open(os.path.join(O, "raw_toy_dolma.json")))
docs = [json.loads(l) for l in open(os.path.join(H, "toy_docs.jsonl"))]
DTR = {"top_3_gram": "Gopher repetition: most common 3-gram covers too many characters", "top_4_gram": "Gopher repetition: most common 4-gram covers too many characters",
       "dup_line_frac": "Gopher repetition: too many duplicate lines", "gopher_enough_stop_words": "Gopher quality: fewer than 2 English stop words",
       "lorem_ipsum": "C4: contains lorem ipsum", "curly_bracket": "C4: contains a curly bracket"}
rdt, rdm = {}, {}
for i, r in dt["docs"].items():
    if r["dropped_at"] == "minhash": rdt[i] = "MinHash: near or exact duplicate of a kept document"
    elif r["dropped_at"]: rdt[i] = DTR.get(r["reason"], r["reason"] or r["dropped_at"])
for i, r in dm["docs"].items():
    if r["dropped_at"] == "emptied": rdm[i] = "every paragraph was a duplicate (Bloom filter), so span replacement left it empty"
    elif r["dropped_at"]: rdm[i] = r["reason"]
cnt = lambda R, f: sum(1 for r in R["docs"].values() if f(r))
kept_dt = cnt(dt, lambda r: not r["dropped_at"]); kept_dm = cnt(dm, lambda r: not r["dropped_at"])
cap = {"dt": {"goph_rep": "GopherRepetitionFilter: %d dropped. It runs before the word-count rule, so the 11-word banner (d04) is caught by its 3-gram rule, not for being short." % cnt(dt, lambda r: r["dropped_at"] == "goph_rep"),
              "goph_qual": "GopherQualityFilter: %d dropped. The German article fails the rule that needs at least 2 English stop words: with no language-ID step, that rule acts as one." % cnt(dt, lambda r: r["dropped_at"] == "goph_qual"),
              "c4": "C4QualityFilter: %d dropped (lorem ipsum, a curly bracket); PIIFormatter then replaces the email and the public IP 8.8.8.8, and keeps 203.0.113.42 because a documentation-range address is not global." % cnt(dt, lambda r: r["dropped_at"] == "c4"),
              "minhash": "MinHash in four steps (signatures, buckets, clusters, filter): %d dropped. The exact copy (d02), the near copy (d03), and also d11, which is d10 minus one line: a duplicate the test did not intend, which MinHash found anyway." % cnt(dt, lambda r: r["dropped_at"] == "minhash"),
              "out": "%d of 12 kept: one bread article (d01) and one tides article (d10, anonymised)." % kept_dt},
       "dm": {"tag": "dolma tag writes attribute files next to the documents: %s. Nothing is dropped; every score is stored once." % ", ".join(dm["taggers"]),
              "dedupe": "dolma dedupe runs twice with Bloom filters: whole documents keyed on the text, then paragraphs (one per line). It only marks duplicates; the mixer acts on the marks.",
              "gopher": "The mixer's exclude rules (written here to mirror datatrove's defaults; the toolkit ships taggers, not thresholds) drop %d documents with Gopher rules. The reason shown is the first rule in the list that matches." % cnt(dm, lambda r: (r.get("reason") or "").startswith("gopher")),
              "c4": "%d dropped by C4 rules (lorem ipsum, a curly bracket)." % cnt(dm, lambda r: (r.get("reason") or "").startswith("c4")),
              "bloom": "%d dropped as an exact duplicate document (d02). The near copy d03 is not a duplicate document, so it survives this step." % cnt(dm, lambda r: (r.get("reason") or "").startswith("Bloom")),
              "spans": "Span replacement deletes duplicate paragraphs and the PII spans. d03 shrinks to its one reworded sentence; d11 loses every paragraph (all seen in d10 first) and disappears; both IP addresses in d10 are replaced, documentation range included.",
              "out": "%d of 12 kept: d01, d10 (anonymised) and d03 reduced to one sentence." % kept_dm}}
summary = ("Both toolkits drop the same eight documents (seven bad ones and the exact copy), both lose d11, and both keep d01 and d10; but they disagree on the near copy: datatrove's MinHash removes d03 whole, "
           "while the Dolma toolkit's paragraph Bloom filter keeps its one new sentence as a document of its own. The rules also fire in a different order (a short "
           "banner falls to a repetition rule in datatrove, to the word count in Dolma), the PII regexes differ (datatrove keeps a non-global IP, Dolma replaces every IPv4 "
           "pattern), and paragraph dedup depends on order: d11 vanished only because d10 came first. Same input, same rules on paper, three different outputs in the details.")
out = {"date": "2026-10-14", "datatrove": dt, "dolma": dm, "reasons": {"dt": rdt, "dm": rdm}, "capt": cap, "summary": summary,
       "docs": [{"id": d["id"], "design": d["metadata"]["design"], "excerpt": d["text"].replace("\n", " ")[:150]} for d in docs]}
for R in (dt, dm):
    for r in R["docs"].values():
        if r.get("text_after"): r["text_after"] = r["text_after"][-220:]
json.dump(out, open(os.path.join(O, "toy_check.json"), "w"), indent=1, ensure_ascii=False)
print("kept", kept_dt, kept_dm)
