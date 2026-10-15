"""A simple quality filter on each post-training sample: how many rows does it remove, by which rule, and what do the
optional rules (the ones that would remove data on purpose in the mix) take with them?

The text rules are Ai2's own post-hoc filters for the Tulu 3 SFT mixture, from open-instruct @ 72f46040
(scripts/data/filtering_and_updates/), imported and run as they are:
  identity  filter_dataset_by_keywords.py: assistant turns that name a model provider ("I am ChatGPT", "as a
            language model developed by OpenAI", any sentence with "DeepSeek" or "Qwen"; PATTERNS lines 44-104)
  cutoff    filter_cutoff_date.py: any message mentioning a knowledge cutoff ("as of my last update in 2023";
            CUT_OFF_PATTERN lines 17-37)
  repeat    filter_ngram_repetitions.py: the last assistant turn repeats a block, a sentence 40 times or a sentence
            4 times in a row (should_be_filtered_by_repetition, lines 679-694)
plus rules defined here: exact duplicate rows; for preferences, ties (chosen and rejected with the same judge score)
and identical texts; for RLVR, rows labelled copies of a benchmark test question by the Decontamination child page,
exact duplicate questions and labels Tulu 3's own checker can never match (pt_checkers.py).
Optional rules (off by default, shown with what they would remove): near-duplicate prompts (MinHash, Jaccard >= 0.8),
non-English prompts (lid.176), refusal phrases.

Writes out/filter.json (counts per rule and per subset, a per-row code string for the page's animation, examples).
usage: DC_SCRATCH=... PYTHONPATH=$DC_SCRATCH/post/pylib:$DC_SCRATCH/src/open-instruct nice -n 15 python -B pt_filter.py
"""
import gzip
import importlib.util
import json
import os
import re
import sys
import types
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pt_common as P  # noqa: E402

OI = os.path.join(P.L.scratch(), "src", "open-instruct", "scripts", "data", "filtering_and_updates")


def _load(name):
    sys.modules.setdefault("open_instruct.utils", types.ModuleType("open_instruct.utils"))  # only used by main()
    spec = importlib.util.spec_from_file_location(name, os.path.join(OI, name + ".py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


KW, CO, NG = _load("filter_dataset_by_keywords"), _load("filter_cutoff_date"), _load("filter_ngram_repetitions")
REFUSAL = re.compile(r"(?i)\b(I'?m sorry, but I (?:can'?t|cannot)|I (?:can'?t|cannot) (?:help|assist|provide|fulfil)|"
                     r"as an AI(?: language model)?)\b")


def text_rules(messages):
    """Ai2's three text filters on one conversation (list of {role, content}). Returns the first that fires."""
    ex = {"messages": messages}
    if KW.should_be_filtered_by_advanced_patterns(ex, column="messages"):
        return "identity"
    if any(CO.CUT_OFF_PATTERN.search(m["content"] or "") for m in messages):
        return "cutoff"
    if NG.should_be_filtered_by_repetition(ex, column="messages")[0]:
        return "repeat"
    return None


def stats_rows():
    rows = defaultdict(list)
    for x in gzip.open(os.path.join(P.scratch(), "stats_rows.jsonl.gz"), "rt"):
        r = json.loads(x)
        rows[r["ds"]].append(r)
    return rows


def dg_copies():
    """RLVR / UltraFeedback / SFT rows the Decontamination child labelled 'copy' (its labelled.jsonl.gz)."""
    fn = os.path.join(P.L.scratch(), "data", "dg", "contam", "labelled.jsonl.gz")
    out = defaultdict(set)
    for x in gzip.open(fn, "rt"):
        r = json.loads(x)
        if r["cat"] == "copy" and r["corpus"] in ("rlvr", "ultrafeedback", "tulu3_sft", "cosmopedia"):
            out[r["corpus"]].add(r["doc"])
    return out


def near_extra(rs, key="dup_near"):
    """Rows a near-duplicate pass would remove beyond the first of each cluster."""
    seen, out = set(), set()
    for r in rs:
        c = r[key]
        if c < 0:
            continue
        if c in seen:
            out.add(r["i"])
        seen.add(c)
    return out


def main():
    R = stats_rows()
    cop = dg_copies()
    res, examples = {}, defaultdict(list)
    # ------------------------------------------------ SFT
    s = R["sft"]
    code, opt = {}, defaultdict(set)
    for r in s:
        why = "dup" if r["dup_exact_full"] >= 0 else text_rules(r["messages"])
        code[r["i"]] = why
        if why and len(examples[("sft", why)]) < 40:
            examples[("sft", why)].append(r["i"])
        if r["lang"] != "en":
            opt["non_english"].add(r["i"])
        if REFUSAL.search(r["response"]):
            opt["refusal"].add(r["i"])
        if r["asst_tok"] + r["prompt_tok"] > 4096:
            opt["over_4096"].add(r["i"])
    opt["near_dup_prompt"] = near_extra(s)
    res["sft"] = summary(s, code, opt, "source", ["dup", "identity", "cutoff", "repeat"])
    # ------------------------------------------------ preferences
    p = R["pref"]
    code, opt = {}, defaultdict(set)
    for r in p:
        if r["margin"] == 0:
            why = "tie"
        elif P.norm(r["chosen"]) == P.norm(r["rejected"]):
            why = "same_text"
        elif not r["chosen"].strip() or not r["rejected"].strip():
            why = "empty"
        elif r["id"] in cop["ultrafeedback"]:
            why = "contam"
        else:
            why = text_rules([{"role": "user", "content": r["prompt"]}, {"role": "assistant", "content": r["chosen"]}])
        code[r["i"]] = why
        if why and len(examples[("pref", why)]) < 40:
            examples[("pref", why)].append(r["i"])
        if 0 < r["margin"] < 1:
            opt["margin_below_1"].add(r["i"])
        if REFUSAL.search(r["chosen"]):
            opt["refusal"].add(r["i"])
    opt["near_dup_prompt"] = near_extra(p)
    res["pref"] = summary(p, code, opt, None, ["tie", "same_text", "empty", "contam", "identity", "cutoff", "repeat"])
    # ------------------------------------------------ RLVR
    v = R["rlvr"]
    chk = P.load_out("checkers.json") if os.path.exists(os.path.join(P.OUT, "checkers.json")) else None
    unreward = set()
    for x in gzip.open(os.path.join(P.scratch(), "checkers_ref.jsonl.gz"), "rt"):
        c = json.loads(x)
        r = v[c["i"]]
        tulu = "last_number" if r["dataset"] == "gsm8k" else "tulu_math"
        if not c[tulu][1] and (r["dataset"] != "gsm8k" or "," in r["ground_truth"]):
            unreward.add(c["i"])
    code, opt = {}, defaultdict(set)
    for r in v:
        if f"rlvr#{r['i']}" in cop["rlvr"]:
            why = "contam"
        elif r["dup_exact"] >= 0:
            why = "dup"
        elif not r["ground_truth"].strip():
            why = "empty_label"
        elif r["i"] in unreward:
            why = "unrewardable"
        else:
            why = None
        code[r["i"]] = why
        if why and len(examples[("rlvr", why)]) < 40:
            examples[("rlvr", why)].append(r["i"])
    opt["near_dup_question"] = near_extra(v)
    res["rlvr"] = summary(v, code, opt, "dataset", ["contam", "dup", "empty_label", "unrewardable"])
    res["rlvr"]["unrewardable_detail"] = dict(Counter(v[i]["dataset"] for i in unreward))
    # ------------------------------------------------ Cosmopedia
    c = R["cosmo"]
    code, opt = {}, defaultdict(set)
    for r in c:
        why = "dup" if r["dup_exact"] >= 0 else text_rules([{"role": "assistant", "content": r["response"]}])
        code[r["i"]] = why
        if why and len(examples[("cosmo", why)]) < 40:
            examples[("cosmo", why)].append(r["i"])
        if r["format"] == "blogpost" and r["response"].lstrip().lower().startswith("have you ever"):
            opt["ignored_instruction"].add(r["i"])
    opt["near_dup_text"] = near_extra(c)
    res["cosmo"] = summary(c, code, opt, "format", ["dup", "identity", "cutoff", "repeat"])
    res["oi_commit"] = "72f46040"
    res["examples"] = {f"{k[0]}|{k[1]}": v for k, v in examples.items()}
    P.save_out("filter.json", res)
    for k in ("sft", "pref", "rlvr", "cosmo"):
        print(k, res[k]["removed"], res[k]["by_rule"], {a: b["n"] for a, b in res[k]["optional"].items()})


def summary(rows, code, opt, group, order):
    o = {"n": len(rows), "order": order, "by_rule": dict(Counter(v for v in code.values() if v)),
         "removed": sum(1 for v in code.values() if v)}
    letters = {r: chr(97 + k) for k, r in enumerate(order)}
    # per-row code string: '.' kept, letter = first rule that removed it (page animation)
    o["codes"] = "".join(letters[code[r["i"]]] if code[r["i"]] else "." for r in rows)
    if group:
        o["groups"] = [r[group] for r in rows]
        g = defaultdict(Counter)
        for r in rows:
            g[r[group]]["n"] += 1
            if code[r["i"]]:
                g[r[group]][code[r["i"]]] += 1
        o["by_group"] = {k: dict(v) for k, v in g.items()}
    o["optional"] = {}
    for name, ids in opt.items():
        d = {"n": len(ids), "new": sum(1 for i in ids if not code[i])}
        if group:
            d["by_group"] = dict(Counter(rows[i][group] for i in ids))
        d["ids"] = sorted(ids)[:1500]
        o["optional"][name] = d
    return o


if __name__ == "__main__":
    main()
