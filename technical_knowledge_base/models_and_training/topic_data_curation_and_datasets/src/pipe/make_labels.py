"""Write labels/drops.json from the hand labels below (read by the agent from pip_sample.py's printout, 2026-10-14).

Label meaning for a REMOVED document: R = right drop (a careful curator would also drop it for pretraining:
navigation, listings, teasers, templates, spam, error pages), W = wrong drop (coherent, informative prose a curator
would keep), U = unclear. For a KEPT document: K = worth keeping, J = junk that got through, U = unclear.
Labelled by Claude (the agent building this tab) reading the first 360 to 700 characters plus the rule value; not
by a human annotator, and one reader only, so treat the shares as indicative (8 documents per group).
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P
from urllib.parse import urlparse

LAB = {
 "gopher_below_alpha_threshold": "U R R U R U W W",
 "gopher_short_doc": "R R R R R R R R",
 "dup_line_frac": "R W R R R R R W",
 "top_4_gram": "R R R R R U R R",
 "duplicated_5_n_grams": "U U R R R W R R",
 "top_3_gram": "R R R W R R R R",
 "dup_line_char_frac": "U U R R R R W R",
 "top_2_gram": "R R R R R R R R",
 "duplicated_6_to_10_n_grams": "R R R W R R R R",
 "gopher_too_many_end_ellipsis": "R R R R R R R R",
 "gopher_enough_stop_words": "R R R U R R R R",
 "gopher_too_many_bullets": "W R W R R U R W",
 "gopher_above_avg_threshold": "R R",
 "gopher_too_many_ellipsis": "R",
 "too_few_sentences": "R R R R U R R U",
 "curly_bracket": "R R W R U W W R",
 "lorem_ipsum": "W W R R R R",
 "line_punct_ratio": "R R R R R R R R",
 "char_dup_ratio": "W W W W W R W R",
 "short_line_ratio": "W R R R R R U R",
 "kept": "K J U K U K K K J K U K K J J U J J K K U J J J",
}
NOTE = {  # short notes for the documents the page shows as examples (group, index): note
 ("gopher_below_alpha_threshold", 6): "product page with a plot synopsis; punctuation tokens count as words",
 ("gopher_below_alpha_threshold", 7): "TV series overview, ordinary prose",
 ("char_dup_ratio", 1): "concert article; one date-and-venue line repeated",
 ("char_dup_ratio", 2): "recipe post; a heading repeated",
 ("curly_bracket", 5): "API documentation with a code sample",
 ("curly_bracket", 2): "developer diary, 53,551 characters, one brace in a code line",
 ("lorem_ipsum", 0): "real article with one placeholder block left by the site template",
 ("gopher_too_many_bullets", 0): "track-grade definitions written as a list",
 ("line_punct_ratio", 0): "list of article teasers ending in Read More",
}

def main():
    rows = P.read_jsonl_gz(P.scratch("label_sample.jsonl.gz"))
    by = {}
    for r in rows:
        by.setdefault(r["group"], []).append(r)
    out = []
    for g, labs in LAB.items():
        labs = labs.split()
        assert len(labs) == len(by[g]), (g, len(labs), len(by[g]))
        for i, (r, l) in enumerate(zip(by[g], labs)):
            out.append({"group": g, "i": i, "id": r["id"], "domain": urlparse(r["url"]).netloc, "label": l,
                        "value_key": r["value_key"], "value": r["value"], "n_in_group": r["n_in_group"],
                        "note": NOTE.get((g, i), "")})
    json.dump(out, open(os.path.join(P.HERE, "labels", "drops.json"), "w"), indent=0, ensure_ascii=False)
    print(len(out))

if __name__ == "__main__":
    main()
