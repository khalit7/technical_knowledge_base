"""Builds ../parts/32_js_dd_0data.js (window.DD) from out/*.json plus the showcase documents.

The showcase is a hand-picked set of 14 filtered documents (indices below, chosen 2026-10-14 so every cluster in it includes the copy each method keeps, covering every case the
methods disagree on); each gets its hostname, a short PII-scrubbed excerpt and its fate under every method.
Nothing else from document text reaches the page except the boilerplate lines/spans chosen in TOP_* below.
"""
import json
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

O = C.OUT
J = lambda n: json.load(open(os.path.join(O, n)))  # noqa: E731
SHOW = [
    (148, "Cookie banner only: extraction kept the consent text, not the page"),
    (612, "Byte-for-byte the same banner on another site"),
    (456, "The same banner under a 'Privacy & Cookies Policy' heading"),
    (1185, "Byte-for-byte the previous one, on a third site"),
    (1473, "Two sentences about a stove, then the same banner"),
    (983, "Repair-shop page for one suburb"),
    (984, "The same page for a second suburb"),
    (985, "The same page for a third suburb"),
    (862, "A generated privacy policy"),
    (972, "The same generated policy on another shop, a few words changed"),
    (1009, "Casino spam article"),
    (1600, "Another casino spam article, different words"),
    (2651, "A woodworking plan"),
    (2652, "A different plan on the same site, sharing its sales text"),
]
docs = [C.clean_doc(d) for d in C.L.run0("filtered")]
cmp_full = json.load(open(C.work("compare_full.json")))
M = {k: set(v) for k, v in cmp_full["methods"].items()}
cl = json.load(open(C.work("clusters.json")))
cluster_of = {x: ci for ci, g in enumerate(cl["clusters"]) for x in g}
show = []
for i, why in SHOW:
    t = C.scrub(docs[i]["text"]).replace("\n", " / ")
    show.append({"i": i, "host": C.host_label(urllib.parse.urlsplit(docs[i]["url"]).hostname), "why": why, "ex": t[:150],
                 "chars": len(docs[i]["text"]), "cluster": cluster_of.get(i, -1),
                 "fate": {k: int(i in M[k]) for k in M}, "sa": cmp_full["sa_frac"][i]})
    print(i, show[-1]["host"], show[-1]["fate"], show[-1]["ex"][:90])

scurve, pairs, big = J("dd_scurve.json"), J("dd_pairs.json"), J("dd_bighash.json")
exact, sent, suffix, bloom = J("dd_exact.json"), J("dd_sent.json"), J("dd_suffix.json"), J("dd_bloom.json")
sem, fw, cmpj = J("dd_semantic.json"), J("dd_fineweb.json"), J("dd_compare.json")
cdx = J("dd_cdx.json") if os.path.exists(os.path.join(O, "dd_cdx.json")) else None

# boilerplate lines to show: longest lines seen on many hosts (chosen by length, all are site chrome)
top_lines = [r for r in exact["extracted"]["top_lines"]]
# repeated spans in 'final' (L=100): keep only boilerplate kinds, chosen by keyword (no person, no adult content)
KEEP = ("cookies", "comment", "return", "first visit", "price", "misprints", "inventory", "refund", "shipping", "ordering")
spans = [s for s in suffix["stages"]["final"]["by_L"][1]["top_spans"]
         if s[0] >= 2 and any(k in s[3].lower() for k in KEEP) and "dominatri" not in s[3].lower() and "Mehrling" not in s[3]]

# hand descriptions of the 31 MinHash clusters (index = order in clusters.json), written 2026-10-14 from the members.
# kinds: B boilerplate or extraction failure, S the same text copied across sites, T a template page whose item differs,
# M the same page at two or more URLs (query strings, session ids), D different main content sharing boilerplate
CL_DESC = [
    ("S", "WordPress 'Sample Page' placeholder text left on 3 sites"), ("B", "consent banner, 8 sites (one plugin's wording)"),
    ("B", "bot-check page at two URLs"), ("B", "consent banner, 25 sites; a few members add one or two lines of real text"),
    ("M", "auction help text at two URL variants"), ("S", "the same cookie-policy text on 4 shops"),
    ("B", "marketplace sign-in chrome"), ("B", "cookie-choice page on two careers sites"), ("B", "forum listing chrome"),
    ("T", "domain-for-sale landing pages"), ("M", "one FAQ page at two session-id URLs"),
    ("T", "installer review pages with no reviews"), ("M", "one notice at two query-string URLs"),
    ("M", "one shop's review block on two product URLs"), ("S", "a generated privacy policy on two shops"),
    ("T", "location doorway pages, suburb name swapped"), ("M", "one product page at two query URLs"),
    ("B", "captcha page on three hosts of one company"), ("S", "the WordPress default privacy policy on two sites"),
    ("B", "Q&A network chrome on two sites"), ("B", "forum registration chrome"), ("S", "car-dealer pricing disclaimer on two sites"),
    ("T", "'obsolete product' pages"), ("T", "event-listing pages with no events"),
    ("T", "florist product pages from one platform, 8 shops"), ("B", "domain marketplace disclaimer"),
    ("M", "one category page at two filter URLs"), ("M", "one profile page at two tab URLs"),
    ("M", "one government page at three malformed URLs"), ("D", "a product page and a terms page sharing a long terms template"),
    ("T", "product pages with no description"),
]
cl_sizes = [len(g) for g in cl["clusters"]]
assert len(CL_DESC) == len(cl_sizes)

DD = {
    "n": scurve["n_docs"], "npairs": scurve["n_pairs"], "pairs": pairs["pairs"], "low": scurve["low_pairs"],
    "scurve": scurve["settings"], "clusters": scurve["clusters"], "big": big,
    "exact": {k: {kk: vv for kk, vv in v.items() if kk not in ("top_lines", "top_long")} for k, v in exact.items()},
    "topLines": top_lines[:24], "topLong": exact["extracted"]["top_long"], "sent": {k: {kk: vv for kk, vv in v.items() if kk != "stats"} for k, v in sent.items()},
    "suffix": {st: {**{k: v for k, v in s.items() if k != "by_L"},
                    "by_L": [{k: v for k, v in r.items() if k != "top_spans"} for r in s["by_L"]]}
               for st, s in suffix["stages"].items()},
    "spans": [[s[0], s[1], s[2], s[3][:200]] for s in spans[:8]],
    "bloom": bloom, "sem": {k: v for k, v in sem.items() if k != "high_cos_low_jaccard"},
    "semExtra": sem["high_cos_low_jaccard"][:30], "fw": fw, "cmp": cmpj, "show": show, "cdx": None,
    "clDesc": [[k, d, s] for (k, d), s in zip(CL_DESC, cl_sizes)], "clIdx": cl["clusters"], "run0Removed": cl["run0_removed"],
}
if cdx:
    DD["cdx"] = {"n": cdx["n"], "crawls": {c: {k: v for k, v in x.items() if k != "pairs"} for c, x in cdx["crawls"].items()},
                 "anyCapture": len({p[0] for x in cdx["crawls"].values() for p in x["pairs"]}),
                 "anyGe08": len({p[0] for x in cdx["crawls"].values() for p in x["pairs"] if p[1] >= 0.8})}
fws = os.path.join(O, "dd_fwshard.json")
DD["fwshard"] = json.load(open(fws)) if os.path.exists(fws) else None  # filled when dd_fwshard.py has finished
if DD["fwshard"]:
    DD["fwshard"]["seconds"] = 8935  # "rough seconds" printed by dd_fwshard.py sign on 2026-10-15 (fwshard.log)
import numpy as np  # noqa: E402
sizes = np.load(C.work("pairs.npz"))["sizes"]
DD["medShingles"] = int(np.median(sizes))
DD["semSeconds"] = 415  # "rough seconds to embed" printed by dd_semantic.py on 2026-10-14 (shared machine, 4 threads)
s = json.dumps(DD, ensure_ascii=False, separators=(",", ":"))
for bad in ("/Users/", "Users-", "scratchpad", "/private/"):
    assert bad not in s, bad
out = os.path.join(C.HERE, "..", "parts", "32_js_dd_0data.js")
open(out, "w").write("// ---- Dedup lab data: generated by src/dedup/dd_pagedata.py from src/dedup/out/*.json; do not edit ----\n"
                     "window.DD=" + s + ";\n")
print("wrote 32_js_dd_0data.js", len(s), "bytes")
