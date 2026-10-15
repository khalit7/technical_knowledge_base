"""Line-level against document-level filtering on the 6,971 English documents (shared venv: datatrove 0.10.1).

1. C4's line rules as datatrove 0.10.1 applies them (filters/c4_filters.py:88-133), re-implemented line by line so
   each removed line carries its reason, and checked against datatrove's own C4QualityFilter output text for every
   document (must match 6,971 of 6,971). Two settings: FineWeb's (filter_no_terminal_punct=False) and C4's own
   (terminal-punctuation rule on).
2. RefinedWeb's line-wise corrections (arXiv 2306.01116 App. G.2), RECONSTRUCTED from the paper's description (the code
   was not released): discard a line that is mostly upper case, only digits, a counter ('3 likes'), or one word;
   edit a short line (<= 10 words) matching a call-to-action pattern at its start ('sign in'), end ('read more') or
   anywhere ('items in cart'); drop the document if flagged lines hold more than 5% of its words. The pattern lists
   below are this page's guesses, labelled as such on the page.
Outputs: src/data/ef_lines.json (aggregates and one worked example) and $DC_SCRATCH/data/ef/lines.jsonl.gz.
"""
import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402
sys.path.insert(0, os.path.join(E.ROOT_SRC, "pipe"))
L = E.L

RW_START = re.compile(r"^(sign in|sign up|log in|login|register|subscribe|share|follow us|skip to|back to|"
                      r"click here|download|buy now|add to (cart|basket|wishlist)|home\b)", re.I)
RW_END = re.compile(r"(read more|continue reading|learn more|see more|view all|show more|more info)\W*$", re.I)
RW_ANY = re.compile(r"(items? in (your )?(cart|basket)|all rights reserved|cookie|privacy policy|terms of use|"
                    r"newsletter|follow us on)", re.I)
COUNTER = re.compile(r"^\W*\d[\d,.]*\s*[kKmM]?\s*(likes?|views?|comments?|shares?|followers?|reviews?|votes?|"
                     r"replies|retweets?|downloads?)\W*$", re.I)


def rw_flag(line):
    s = line.strip()
    w = s.split()
    if not w:
        return None
    letters = [c for c in s if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) / len(letters) > 0.5 and len(letters) > 3:
        return "upper"
    if re.fullmatch(r"[\d\W_]+", s):
        return "numeric"
    if COUNTER.match(s):
        return "counter"
    if len(w) == 1:
        return "one_word"
    if len(w) <= 10 and (RW_START.search(s) or RW_END.search(s) or RW_ANY.search(s)):
        return "cta"
    return None


def c4_lines(text, punct):
    from datatrove.pipeline.filters.c4_filters import CITATION_REGEX, END_PUNCTUATION, ELLIPSIS, POLICY_SUBSTRINGS
    from datatrove.utils.text import split_into_sentences
    kept, removed, n_sent, doc_reason = [], [], 0, None
    for line in text.splitlines():
        line = line.strip()
        words = line.split()
        if any(len(x) > 1000 for x in words):
            removed.append((line, "too_long_word"))
            continue
        line = CITATION_REGEX.sub("", line)
        if punct and (not line.endswith(END_PUNCTUATION) or line.endswith(ELLIPSIS)):
            removed.append((line, "no_terminal_punct"))
            continue
        if len(words) < 3:
            removed.append((line, "too_few_words" if words else "blank"))
            continue
        ll = line.lower()
        if "lorem ipsum" in ll:
            doc_reason = "lorem_ipsum"
            break
        if "javascript" in ll:
            removed.append((line, "javascript"))
            continue
        if "{" in line:
            doc_reason = "curly_bracket"
            break
        if any(p in ll for p in POLICY_SUBSTRINGS):
            removed.append((line, "policy"))
            continue
        n_sent += len(split_into_sentences(line, "en"))
        kept.append(line)
    if doc_reason is None and n_sent < 5:
        doc_reason = "too_few_sentences"
    return kept, removed, doc_reason


def main():
    import pip_common  # noqa: F401
    from datatrove.data import Document
    from datatrove.pipeline.filters import C4QualityFilter
    eng = {r["id"]: r for r in E.read_jsonl_gz(E.pipe_scratch("rule_values.jsonl.gz"))}
    fw = set(L.ids("fineweb_kept"))
    c4 = C4QualityFilter(filter_no_terminal_punct=False)
    agg = {"docs": 0, "c4_check_equal": 0, "fw": collections.Counter(), "c4punct": collections.Counter(),
           "rw": collections.Counter()}
    chars = collections.Counter()
    out = []
    for d in L.run0("extracted"):
        if d["id"] not in eng:
            continue
        t = d["text"]
        agg["docs"] += 1
        kept, removed, reason = c4_lines(t, punct=False)
        doc = Document(text=t, id=d["id"])
        ref = c4.filter(doc)
        mine_ok = reason is None
        ref_ok = ref is True
        if mine_ok == ref_ok and (not mine_ok or doc.text == "\n".join(kept).strip()):
            agg["c4_check_equal"] += 1
        for _, r in removed:
            agg["fw"][r] += 1
        chars["total"] += len(t)
        chars["fw_removed_lines"] += sum(len(x) for x, _ in removed)
        k2, r2, reason2 = c4_lines(t, punct=True)
        for _, r in r2:
            agg["c4punct"][r] += 1
        chars["c4punct_removed_lines"] += sum(len(x) for x, _ in r2)
        lines = [x for x in t.splitlines() if x.strip()]
        flags = [rw_flag(x) for x in lines]
        fl_words = sum(len(x.split()) for x, f in zip(lines, flags) if f)
        tot_words = sum(len(x.split()) for x in lines) or 1
        for f in flags:
            if f:
                agg["rw"][f] += 1
        rw_drop = fl_words / tot_words > 0.05
        out.append({"id": d["id"], "fw": d["id"] in fw, "c4_reason": reason, "c4p_reason": reason2,
                    "n_lines": len(lines), "fw_removed": len(removed), "c4p_removed": len(r2),
                    "rw_flagged": sum(1 for f in flags if f), "rw_share": round(fl_words / tot_words, 4),
                    "rw_drop": rw_drop, "run0_step": eng[d["id"]]["run0_step"]})
    E.write_jsonl_gz(E.scratch("lines.jsonl.gz"), out)
    kept_final = [r for r in out if r["run0_step"] is None]
    res = {"docs": agg["docs"], "c4_reimpl_equal_datatrove": agg["c4_check_equal"],
           "fw_line_reasons": dict(agg["fw"]), "c4punct_line_reasons": dict(agg["c4punct"]),
           "rw_line_flags": dict(agg["rw"]), "chars": dict(chars),
           "lines_total": sum(r["n_lines"] for r in out),
           "rw_drop_docs": sum(r["rw_drop"] for r in out),
           "rw_drop_docs_among_run0_kept": sum(r["rw_drop"] for r in kept_final),
           "run0_kept": len(kept_final),
           "rw_drop_among_kept_in_fineweb": sum(r["rw_drop"] and r["fw"] for r in kept_final),
           "docs_edited_by_fw_c4_among_kept": sum(1 for r in kept_final if r["fw_removed"] > 0)}
    E.save("ef_lines.json", res)
    print(json.dumps(res, indent=1))


if __name__ == "__main__" and len(sys.argv) == 1:
    main()


def example():
    """Pick documents for the line-level animation: kept by run0, in FineWeb, an organisation's host, 10 to 30 lines,
    at least 3 lines C4 removes and at least 2 lines the RefinedWeb reconstruction flags. Prints candidates; with an id
    argument writes that document's lines to src/data/ef_lines_example.json."""
    import urllib.parse
    rows = {r["id"]: r for r in E.read_jsonl_gz(E.scratch("lines.jsonl.gz"))}
    want = sys.argv[2] if len(sys.argv) > 2 else None
    for d in L.run0("extracted"):
        r = rows.get(d["id"])
        if not r or r["run0_step"] is not None or not r["fw"]:
            continue
        host = urllib.parse.urlsplit(d["metadata"]["url"]).netloc
        if want is None:
            if host.endswith((".org", ".edu", ".gov", ".org.uk", ".ac.uk", ".gov.uk")) and 10 <= r["n_lines"] <= 30 \
                    and r["fw_removed"] >= 3 and r["rw_flagged"] >= 2:
                print(d["id"], host, r)
            continue
        if d["id"] != want:
            continue
        lines = [x for x in d["text"].split("\n")]
        kept, removed, reason = c4_lines(d["text"], punct=False)
        rem = {}
        for x, why in removed:
            rem.setdefault(x, why)
        k2, r2, reason2 = c4_lines(d["text"], punct=True)
        rem2 = {}
        for x, why in r2:
            rem2.setdefault(x, why)
        out = []
        for x in lines:
            s = x.strip()
            out.append({"t": s.replace("—", "--"), "c4": rem.get(s), "c4p": rem2.get(s), "rw": rw_flag(x)})
        E.save("ef_lines_example.json", {"host": host, "lines": out, "c4_doc": reason, "c4p_doc": reason2,
                                         "rw_share": r["rw_share"], "rw_drop": r["rw_drop"]})
        print("saved", host, len(out))
        return


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "example":
    import pip_common  # noqa: F401
    example()
