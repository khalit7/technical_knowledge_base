"""Step 2 of the Pipeline lab: every heuristic rule's statistic on every document that reached the heuristic filters
in run0 (the 6,971 English documents after language ID), computed with datatrove 0.10.1's own helper functions, so
that thresholding at the defaults reproduces run0's decisions exactly (checked below, document by document).

Text seen by each rule is the text that reaches it in the chain: Gopher and C4 rules see the extracted text; the
FineWeb rules see the text after C4's line edits (C4QualityFilter rewrites doc.text, c4_filters.py:135).

Outputs:
  $DC_SCRATCH/data/pipe/rule_values.jsonl.gz   one row per document: id, url, run0 outcome, every statistic
  src/pipe/out/rules_check.json                 the reproduction check (must be 6,971 of 6,971)
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P  # noqa: E402
L = P.L

from datatrove.pipeline.filters.gopher_repetition_filter import (find_duplicates, find_top_duplicate,  # noqa: E402
                                                                  find_all_duplicate, get_n_grams)
from datatrove.pipeline.filters.gopher_quality_filter import STOP_WORDS  # noqa: E402
from datatrove.pipeline.filters.c4_filters import CITATION_REGEX, END_PUNCTUATION, ELLIPSIS, POLICY_SUBSTRINGS  # noqa: E402
from datatrove.utils.text import PUNCTUATION_SET, TERMINAL_PUNCTUATION, split_into_words, split_into_sentences  # noqa: E402

PARA = re.compile(r"\n{2,}")
LINES = re.compile("\n+")


def gopher_rep(text):
    v = {}
    paras = PARA.split(text.strip())
    pd, pc = find_duplicates(paras)
    v["dup_para_frac"] = pd / len(paras)
    v["dup_para_char_frac"] = pc / len(text)
    lines = LINES.split(text)
    ld, lc = find_duplicates(lines)
    v["dup_line_frac"] = ld / len(lines)
    v["dup_line_char_frac"] = lc / len(text)
    words = split_into_words(text)
    for n in (2, 3, 4):
        g = get_n_grams(words, n)
        v[f"top_{n}_gram"] = find_top_duplicate(g) / len(text) if g else 0.0
    for n in range(5, 11):
        v[f"dup_{n}_gram"] = find_all_duplicate(words, n) / len(text)
    return v, words


def gopher_qual(text, words):
    v = {}
    nsw = [w for w in words if any(ch not in PUNCTUATION_SET for ch in w)]
    v["n_words"] = len(nsw)
    v["avg_word_len"] = sum(len(w) for w in nsw) / len(nsw) if nsw else 0.0
    n = len(words) or 1
    v["hash_ratio"] = text.count("#") / n
    v["ellipsis_ratio"] = (text.count("...") + text.count("…")) / n
    lines = text.splitlines() or [""]
    v["bullet_lines"] = sum(s.lstrip().startswith("•") or s.lstrip().startswith("-") for s in lines) / len(lines)
    v["end_ellipsis_lines"] = sum(s.rstrip().endswith("...") or s.rstrip().endswith("…") for s in lines) / len(lines)
    v["alpha_words"] = sum(any(c.isalpha() for c in w) for w in words) / n
    ws = text.split()
    v["alpha_words_ws"] = sum(any(c.isalpha() for c in w) for w in ws) / max(1, len(ws))  # whitespace words, not datatrove
    v["stop_words"] = len(set(STOP_WORDS).intersection(set(words)))
    return v


def c4(text, terminal=False):
    """C4QualityFilter.filter (c4_filters.py:88-136) with run0's settings; returns stats and the edited text."""
    n_sent, kept, lorem, curly = 0, [], 0, 0
    nl = {"total": 0, "short": 0, "js": 0, "policy": 0, "noterm": 0, "longword": 0}
    for line in text.splitlines():
        line = line.strip()
        words = line.split()
        nl["total"] += 1
        if any(len(w) > 1000 for w in words):
            nl["longword"] += 1
            continue
        line = CITATION_REGEX.sub("", line)
        if terminal and (not line.endswith(END_PUNCTUATION) or line.endswith(ELLIPSIS)):
            nl["noterm"] += 1
            continue
        if len(words) < 3:
            nl["short"] += 1
            continue
        ll = line.lower()
        if "lorem ipsum" in ll:
            lorem = 1
        if "javascript" in ll:
            nl["js"] += 1
            continue
        if "{" in line:
            curly = 1
        if any(p in ll for p in POLICY_SUBSTRINGS):
            nl["policy"] += 1
            continue
        n_sent += len(split_into_sentences(line))
        kept.append(line)
    return {"c4_sentences": n_sent, "c4_lorem": lorem, "c4_curly": curly, "c4_lines": nl}, "\n".join(kept).strip()


def c4_first_drop(text):
    """Which C4 document-level rule fires first in datatrove's loop order (lorem and curly return mid-loop)."""
    n_sent = 0
    for line in text.splitlines():
        line = line.strip()
        words = line.split()
        if any(len(w) > 1000 for w in words):
            continue
        line = CITATION_REGEX.sub("", line)
        if len(words) < 3:
            continue
        ll = line.lower()
        if "lorem ipsum" in ll:
            return "lorem_ipsum"
        if "javascript" in ll:
            continue
        if "{" in line:
            return "curly_bracket"
        if any(p in ll for p in POLICY_SUBSTRINGS):
            continue
        n_sent += len(split_into_sentences(line))
    return "too_few_sentences" if n_sent < 5 else None


def fineweb(text):
    v = {}
    lines = [x for x in text.split("\n") if x.strip() != ""]
    if not lines:
        return {"fw_empty": 1, "line_punct": 0.0, "short_lines": 1.0, "char_dup": 0.0, "list_ratio": 0.0}
    stop = tuple(TERMINAL_PUNCTUATION)
    v["line_punct"] = sum(1 for x in lines if x.endswith(stop)) / len(lines)
    v["short_lines"] = sum(1 for x in lines if len(x) <= 30) / len(lines)
    denom = len(text.replace("\n", "")) or 1
    v["char_dup"] = find_duplicates(lines)[1] / denom
    words = split_into_words(text)
    v["list_ratio"] = text.count("\n") / max(1, len(words))
    return v


# run0's first-firing reasons, in datatrove's order
def decide(v):
    if v["dup_para_frac"] > 0.3: return "3_gopher_rep", "dup_para_frac"
    if v["dup_para_char_frac"] > 0.2: return "3_gopher_rep", "dup_para_char_frac"
    if v["dup_line_frac"] > 0.3: return "3_gopher_rep", "dup_line_frac"
    if v["dup_line_char_frac"] > 0.2: return "3_gopher_rep", "dup_line_char_frac"
    for n, t in ((2, .2), (3, .18), (4, .16)):
        if v[f"top_{n}_gram"] > t: return "3_gopher_rep", f"top_{n}_gram"
    for n, t in ((5, .15), (6, .14), (7, .13), (8, .12), (9, .11), (10, .10)):
        if v[f"dup_{n}_gram"] > t: return "3_gopher_rep", f"duplicated_{n}_n_grams"
    if v["n_words"] < 50: return "4_gopher_qual", "gopher_short_doc"
    if v["n_words"] > 100000: return "4_gopher_qual", "gopher_long_doc"
    if v["avg_word_len"] < 3: return "4_gopher_qual", "gopher_below_avg_threshold"
    if v["avg_word_len"] > 10: return "4_gopher_qual", "gopher_above_avg_threshold"
    if v["hash_ratio"] > .1: return "4_gopher_qual", "gopher_too_many_hashes"
    if v["ellipsis_ratio"] > .1: return "4_gopher_qual", "gopher_too_many_ellipsis"
    if v["bullet_lines"] > .9: return "4_gopher_qual", "gopher_too_many_bullets"
    if v["end_ellipsis_lines"] > .3: return "4_gopher_qual", "gopher_too_many_end_ellipsis"
    if v["alpha_words"] < .8: return "4_gopher_qual", "gopher_below_alpha_threshold"
    if v["stop_words"] < 2: return "4_gopher_qual", "gopher_enough_stop_words"
    if v["c4_first"]: return "5_c4", v["c4_first"]
    if v.get("fw_empty"): return "6_fineweb_qual", "empty"
    if v["line_punct"] < .12: return "6_fineweb_qual", "line_punct_ratio"
    if v["short_lines"] > .67: return "6_fineweb_qual", "short_line_ratio"
    if v["char_dup"] > .01: return "6_fineweb_qual", "char_dup_ratio"
    if v["list_ratio"] > .3: return "6_fineweb_qual", "list_ratio"
    return None, None


def main():
    outcome = {}
    for step in ("3_gopher_rep", "4_gopher_qual", "5_c4", "6_fineweb_qual"):
        for d in L.run0_removed(step):
            outcome[d["id"]] = (step, d["metadata"].get("filter_reason"))
    texts = {}
    for step in ("3_gopher_rep", "4_gopher_qual", "5_c4", "6_fineweb_qual"):
        for d in L.run0_removed(step):
            texts[d["id"]] = d
    for d in L.run0("filtered"):
        outcome[d["id"]] = (None, None)
    # the text as it arrived at the heuristic filters = run0's extracted text (C4 edits it in place, so the removed
    # 6_fineweb_qual and filtered docs carry edited text): take it from run0/extracted
    ext = {d["id"]: d for d in L.run0("extracted")}
    rows, ok, bad = [], 0, []
    for i, (did, (step, reason)) in enumerate(outcome.items()):
        d = ext[did]
        text = d["text"]
        v, words = gopher_rep(text)
        v.update(gopher_qual(text, words))
        c4s, edited = c4(text)
        v.update({k: c4s[k] for k in ("c4_sentences", "c4_lorem", "c4_curly")})
        v["c4_lines_total"] = c4s["c4_lines"]["total"]
        v["c4_lines_removed"] = sum(c4s["c4_lines"][k] for k in ("short", "js", "policy", "longword"))
        v["c4_first"] = c4_first_drop(text)
        _, edited_t = c4(text, terminal=True)
        v["c4_terminal_chars_kept"] = len(edited_t)
        v.update(fineweb(edited))
        v["chars"] = len(text)
        v["chars_after_c4"] = len(edited)
        s2, r2 = decide(v)
        if (s2, r2) == (step, reason):
            ok += 1
        else:
            bad.append({"id": did, "run0": [step, reason], "recomputed": [s2, r2]})
        rows.append({"id": did, "url": d["metadata"].get("url"), "run0_step": step, "run0_reason": reason,
                     "lang_score": d["metadata"].get("language_score"), "v": v})
        if (i + 1) % 1000 == 0:
            print(i + 1, ok, len(bad), flush=True)
    P.write_jsonl_gz(P.scratch("rule_values.jsonl.gz"), rows)
    P.save_out("rules_check.json", {"docs": len(rows), "reproduced": ok, "mismatches": bad[:20], "n_mismatch": len(bad)})
    print("reproduced", ok, "of", len(rows), "mismatches", len(bad))


if __name__ == "__main__":
    main()
