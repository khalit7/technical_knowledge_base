"""Assemble everything the page embeds from the recorded runs: data/dg_data.json (window.DG) and data/facts.json (the
@@key@@ numbers in the prose). Run after the scripts in scripts/ (order in README.md):

    DC_SCRATCH=<shared dc folder> $DC_SCRATCH/venv/bin/python -I -B build_data.py

Nothing from a raw (unscrubbed) web document enters the page except the matched window itself, which is the text the
document shares with a benchmark item. Em-dashes in source text are written as "--" (house style).
"""
import gzip
import json
import os
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "scripts"))
import dg_common as C  # noqa: E402
import dg_contam as D  # noqa: E402

L = C.L
NAMES = C.BENCH_NAMES
FACTS = {}


def clean(s):
    return (s or "").replace("\u2014", "--").replace("\u2015", "--")


def fmt(n):
    return f"{n:,}"


def pct(a, b, d=1):
    return f"{100 * a / b:.{d}f}%" if b else "n/a"


def load_jsonl_gz(p):
    return [json.loads(x) for x in gzip.open(p, "rt")]


# ---------------------------------------------------------------- contamination
def contam():
    items = C.bench_items()
    od = os.path.join(L.scratch(), "data", "dg", "contam")
    lab = load_jsonl_gz(os.path.join(od, "labelled.jsonl.gz"))
    corpora = []
    for c, (label, kind, group, _) in C.CORPORA.items():
        sp = os.path.join(od, f"{c}.summary.json")
        if not os.path.exists(sp):
            continue
        s = json.load(open(sp))
        dt = {}
        for mode in ("default", "query"):
            p = os.path.join(L.scratch(), "data", "dg", "datatrove", f"{c}.{mode}.json")
            if os.path.exists(p):
                d = json.load(open(p))
                g = Counter(r["ngram"] for r in d["removed"])
                dt[mode] = {"docs": len(d["removed"]), "by_task": dict(Counter(r["task"] for r in d["removed"])),
                            "zeros": g.get("0 0 0 0 0 0 0 0 0 0 0 0", 0), "top": g.most_common(3)}
        P = [r for r in lab if r["corpus"] == c]
        cats = Counter(r["cat"] for r in P)
        items_by_cat = defaultdict(set)
        for r in P:
            items_by_cat[r["cat"]].add((r["bench"], r["bidx"]))
        corpora.append({
            "key": c, "label": label, "kind": kind, "group": group, "docs": s["docs"], "tokens": s["tokens"],
            "any5": s["any5"], "any8": s["any8"], "any13": s["any13"],
            "tulu_docs": len({r["doc"] for r in P if r["cov8"] > 0.5}),
            "tulu_items": len({(r["bench"], r["bidx"]) for r in P if r["cov8"] > 0.5}),
            "m13_items": len({(r["bench"], r["bidx"]) for r in P if r["m13"] > 0}),
            "pairs": len(P), "cats": dict(cats), "cat_items": {k: len(v) for k, v in items_by_cat.items()},
            "dt": dt})
    return items, lab, corpora


def dt_removed():
    out = {}
    for c in C.CORPORA:
        p = os.path.join(L.scratch(), "data", "dg", "datatrove", f"{c}.default.json")
        if os.path.exists(p):
            out[c] = {r["doc"] for r in json.load(open(p))["removed"]}
    return out


def rules_table(lab, dtr):
    """Per rule: flagged pairs and what they are (labels)."""
    rules = {"gpt3_13": lambda r: r["m13"] > 0, "tulu_8_50": lambda r: r["cov8"] > 0.5,
             "longest_50": lambda r: r["win"] and r["win"]["run_tokens"] >= 0.5 * r["win"]["item_tokens"],
             "datatrove": lambda r: r["corpus"] in dtr and r["doc"] in dtr[r["corpus"]]}
    out = {}
    for grp in ("web", "post"):
        docs = {(c, d) for c, ds in dtr.items() if C.CORPORA[c][2] == grp for d in ds}
        best = {}
        order = ["copy", "variant", "source", "passage", "phrase", "diagram"]
        for r in lab:
            k = (r["corpus"], r["doc"])
            if k in docs and (k not in best or order.index(r["cat"]) < order.index(best[k])):
                best[k] = r["cat"]
        cats = Counter(best.values())
        real = cats.get("copy", 0) + cats.get("variant", 0) + cats.get("source", 0)
        out[f"datatrove|{grp}"] = {"pairs": len(docs), "items": len({(r["bench"], r["bidx"]) for r in lab
                                                                     if (r["corpus"], r["doc"]) in docs}),
                                   "cats": {k: v for k, v in cats.items() if k in ("copy", "variant", "source")},
                                   "fp_label": len(docs) - real}
    for k, f in rules.items():
        if k == "datatrove":
            continue
        for grp in ("web", "post"):
            P = [r for r in lab if C.CORPORA[r["corpus"]][2] == grp and f(r)]
            out[f"{k}|{grp}"] = {"pairs": len(P), "cats": dict(Counter(r["cat"] for r in P)),
                                 "items": len({(r["bench"], r["bidx"]) for r in P})}
    return out


def doc_texts(lab):
    need = defaultdict(set)
    for r in lab:
        need[r["corpus"]].add(r["doc"])
    out = {}
    for c, ids in need.items():
        for d, t in C.corpus_iter(c):
            if d in ids:
                out[(c, d)] = t
    return out


def _longest(m):
    b = c = 0
    for x in m:
        c = c + 1 if x else 0
        b = max(b, c)
    return b


def checker(items, lab, texts, dtr):
    """Per benchmark item with any flagged pair: a slice of its normalised tokens and, per pair, the covered ranges."""
    by = defaultdict(list)
    for r in lab:
        by[r["item"]].append(r)
    order = ["copy", "variant", "source", "passage", "phrase", "diagram"]
    out = []
    for i, P in by.items():
        it = items[i]
        toks = D.norm_tokens(it["full"])
        nq = len(D.norm_tokens(it["query"]))
        P.sort(key=lambda r: (order.index(r["cat"]), -r["cov8"], -r["m13"]))
        pairs, seen, cov0 = [], set(), None
        for r in P:
            w = " ".join(r["window"].split())[:300]
            if w.lower() in seen:
                continue
            seen.add(w.lower())
            _, cov = D.item_coverage(it["full"], texts[(r["corpus"], r["doc"])], 8)
            if cov0 is None:
                cov0 = cov
            rng, a = [], None
            for k, x in enumerate(list(cov) + [False]):
                if x and a is None:
                    a = k
                if not x and a is not None:
                    rng.append([a, k])
                    a = None
            kind = C.CORPORA[r["corpus"]][1]
            pairs.append({"c": r["corpus"], "d": r["doc"] if kind == "public" or r["corpus"] == "rlvr" else r["doc"][-13:],
                          "cat": r["cat"], "note": clean(r["note"]), "m13": r["m13"], "cov8": r["cov8"],
                          "run": r["win"]["run_tokens"] if r["win"] else 0,
                          "dt": (r["doc"] in dtr[r["corpus"]]) if r["corpus"] in dtr else None,
                          "rg": rng, "win": clean(w)})
            if len(pairs) >= 4:
                break
        on = [k for k, x in enumerate(cov0) if x] if cov0 is not None else []
        off = max(0, (on[0] if on else 0) - 20)
        if len(toks) - off < 120:
            off = max(0, len(toks) - 120)
        out.append({"i": i, "b": it["bench"], "x": it["idx"], "t": toks[off:off + 120], "off": off, "nt": len(toks),
                    "nq": nq, "n": len(P), "cats": dict(Counter(r["cat"] for r in P)), "p": pairs})
    out.sort(key=lambda o: (o["b"], o["x"]))
    return out


_DT = {}


def dt_pair(it, text):
    """datatrove default rule for one (item, document) pair: any label or straddling 12-gram of the item in the doc."""
    from types import SimpleNamespace
    from datatrove.pipeline.decont.n_grams import NGramsDecontConfig, NGramsDecontIndexer
    from datatrove.utils.hashing import create_hash_func
    from datatrove.utils.text import ngrams, simplify_text
    from datatrove.utils.word_tokenizers import load_word_tokenizer
    if not _DT:
        cfg = NGramsDecontConfig()
        _DT["fake"] = SimpleNamespace(tokenizer=load_word_tokenizer("en"), config=cfg,
                                      hash_func=create_hash_func(cfg.hash_config))
    f = _DT["fake"]
    idx = set(NGramsDecontIndexer.compute_hashes(f, it["label"], it["query"]))
    toks = f.tokenizer.word_tokenize(simplify_text(text, f.config.norm_config))
    return any(f.hash_func(" ".join(g)) in idx for g in ngrams(toks, f.config.n_grams))


WHY = {"copy": "This is the case decontamination exists for: the test question and its answer are in the training row.",
       "passage": "The item quotes a famous speech; the page quotes the same speech. The question itself is not on the page.",
       "phrase": "A stock question opening shared by thousands of quiz items; the rest of the item is not on the page.",
       "diagram": "Asymptote plotting code shared by many MATH problems; the problems are different."}


def anim_pairs(items, lab, texts):
    """Four pairs for the Reading animation: copy, passage, phrase, diagram."""
    want = [("copy", "rlvr", "mmlu_test", "amoeba"), ("passage", "fineweb_edu", "mmlu_test", "moon"),
            ("phrase", "nemotron", "mmlu_test", "symptom"), ("diagram", "rlvr", "math500_test", "")]
    out = []
    for cat, corpus, bench, word in want:
        cands = [r for r in lab if r["cat"] == cat and r["corpus"] == corpus and r["bench"] == bench and r["win"]
                 and word in r["window"].lower()]
        cands.sort(key=lambda r: (r["win"]["item_tokens"] > 70, -r["cov8"]))
        r = cands[0]
        it = items[r["item"]]
        text = texts[(corpus, r["doc"])]
        dt, ds = D.aligned_tokens(text)
        # document window: the matched run plus 12 tokens each side
        a = next(k for k, sp in enumerate(ds) if sp[1] > r["win"]["start"])
        b = max(k for k, sp in enumerate(ds) if sp[0] < r["win"]["end"]) + 1
        a, b = max(0, a - 12), min(len(dt), b + 12, a + 70)
        itoks, cov = D.item_coverage(it["full"], text, 8)
        on = [k for k, x in enumerate(cov) if x]
        i0 = max(0, (on[0] if on else 0) - 15)
        i1 = min(len(itoks), i0 + 90)
        out.append({"cat": cat, "corpus": corpus, "label": C.CORPORA[corpus][0], "bench": bench, "bidx": it["idx"],
                    "item": itoks[i0:i1], "item_off": i0, "item_full_len": len(itoks),
                    "doc": dt[a:b], "note": clean(r["note"]), "why": WHY[cat],
                    "v": {"m13": r["m13"], "cov8": r["cov8"], "run": r["win"]["run_tokens"],
                          "lm": round(_longest(cov) / len(itoks), 3), "dt": dt_pair(it, text)}})
    return out


# ---------------------------------------------------------------- PII
PII_DETS = ["datatrove", "dolma", "presidio", "extra"]
SHORT = {"EMAIL_ADDRESS": "EMAIL", "PHONE_NUMBER": "PHONE", "IP_ADDRESS": "IP", "CREDIT_CARD": "CARD",
         "IBAN_CODE": "IBAN"}
NOT_ID = {"DATE_TIME", "URL", "NRP"}  # Presidio types that are not identifiers on their own


def _merge(sp):
    sp = sorted(sp, key=lambda x: (x["s"], x["e"]))
    out = []
    for x in sp:
        if out and x["s"] < out[-1]["e"]:
            out[-1]["e"] = max(out[-1]["e"], x["e"])
            out[-1]["t"] = out[-1]["t"] if out[-1]["t"] == x["t"] else out[-1]["t"] + "/" + x["t"]
            out[-1]["p"] = max(out[-1]["p"], x["p"])
        else:
            out.append(dict(x))
    return out


def pii():
    sys.path.insert(0, os.path.join(HERE, "scripts"))
    import dg_pii_prep as PP
    rows = PP.synthetic()
    pd_ = os.path.join(L.scratch(), "data", "dg", "pii")
    det = {}
    for d in PII_DETS:
        det[d] = {json.loads(x)["id"]: json.loads(x)["spans"] for x in open(os.path.join(pd_, f"synthetic.{d}.jsonl"))}
    variants = [("datatrove", "datatrove", None, 0), ("dolma", "dolma", None, 0), ("extra", "extra", None, 0),
                ("presidio", "presidio", None, 0), ("presidio_ids", "presidio", NOT_ID, 0),
                ("presidio_05", "presidio", NOT_ID, 0.5)]
    summ = {}
    shown = []
    for r in rows:
        shown.append({"id": r["id"], "text": r["text"], "gold": r["gold"], "neg": r["neg"],
                      "det": {d: _merge([x for x in det[d][r["id"]]]) for d in PII_DETS}})
    gold_types = Counter(g["t"] for r in rows for g in r["gold"])
    for name, d, drop, th in variants:
        hit = Counter()
        fa = 0
        fa_list = []
        for r in rows:
            sp = [x for x in det[d][r["id"]] if x["p"] >= th and not (drop and x["t"] in drop)]
            sp = _merge(sp)
            for g in r["gold"]:
                if any(x["s"] < g["e"] and g["s"] < x["e"] for x in sp):
                    hit[g["t"]] += 1
            for x in sp:
                if not any(x["s"] < g["e"] and g["s"] < x["e"] for g in r["gold"]):
                    fa += 1
                    fa_list.append(r["text"][x["s"]:x["e"]])
        summ[name] = {"hit": dict(hit), "recall": round(sum(hit.values()) / sum(gold_types.values()), 3),
                      "false_alarms": fa, "fa_examples": fa_list[:12]}
    real = {}
    for fn, tag in (("run0_final500", "500 documents"), ("run0_final", "all 2,617")):
        for d in PII_DETS:
            p = os.path.join(pd_, f"{fn}.{d}.jsonl")
            if not os.path.exists(p) or (d == "presidio" and fn == "run0_final"):
                continue
            c, docs = Counter(), Counter()
            for x in open(p):
                sp = json.loads(x)["spans"]
                ts = set()
                for s_ in sp:
                    if d == "presidio" and (s_["p"] < 0.5 or s_["t"] in NOT_ID):
                        continue
                    t_ = SHORT.get(s_["t"], s_["t"])
                    c[t_] += 1
                    ts.add(t_)
                for t in ts:
                    docs[t] += 1
            real[f"{d}, {tag}"] = {"spans": dict(c), "docs": dict(docs)}
    return {"rows": shown, "gold_types": dict(gold_types), "summary": summ, "real": real,
            "real_note": "Presidio counted at score 0.5 or more, identifier types only."}


def rm_units(lab, texts):
    """Characters removed per unit for the web pairs flagged by the 13-gram or Tulu rule (distinct documents)."""
    seen = {}
    for r in lab:
        if C.CORPORA[r["corpus"]][2] != "web" or not r["win"] or r["corpus"].endswith("_file0"):
            continue
        k = (r["corpus"], r["doc"])
        t = texts[k]
        a, b = r["win"]["start"], r["win"]["end"]
        p0 = t.rfind("\n", 0, a) + 1
        p1 = t.find("\n", b)
        p1 = len(t) if p1 < 0 else p1
        cur = seen.get(k)
        val = {"doc": len(t), "para": p1 - p0, "span": min(len(t), (b - a) + 400), "str": b - a}
        if not cur or val["str"] > cur["str"]:
            seen[k] = val
    tot = Counter()
    for v in seen.values():
        tot.update(v)
    return len(seen), dict(tot)


def facts(items, lab, corpora, texts, data):
    F = FACTS
    by = {c["key"]: c for c in corpora}
    F["n_items"] = fmt(len(items))
    F["n_docs_all"] = fmt(sum(c["docs"] for c in corpora))
    F["nemo_docs"] = fmt(by["nemotron"]["docs"])
    F["n_pairs"] = fmt(len(lab))
    F["n_overrides"] = str(sum(r["checked"] for r in lab))
    idx, _ = D.build_index(items)
    import numpy as np
    F["idx13"] = fmt(len(np.unique(idx[13][0])))
    F["idx8"] = fmt(len(np.unique(idx[8][0])))
    ex = by["run0_extracted"]["dt"].get("default")
    if ex:
        F["dt_zero_ex"] = fmt(ex["zeros"])
        F["dt_rm_ex"] = fmt(ex["docs"])
    tu = by["tulu3_sft"]["dt"].get("default")
    if tu:
        tl = [r for r in lab if r["corpus"] == "tulu3_sft"]
        F["pr1_answer"] = (f"About 170: {fmt(tu['docs'])} of 5,000 rows ({pct(tu['docs'], 5000)}), "
                           f"{fmt(tu['zeros'])} of them because of the single n-gram of twelve zeros, the rest on maths "
                           f"notation n-grams such as \"frac 0 0 frac 0 0\". By reading, none of the Tulu 3 SFT rows here "
                           f"contains a test question ({len(tl)} rows share a 13-gram or pass Tulu's rule, all stock "
                           "phrases). The same filter run against the SFT rows with numbers kept would remove almost nothing.")
    web = [r for r in lab if C.CORPORA[r["corpus"]][2] == "web" and not r["corpus"].endswith("_file0")]
    web13 = {(r["corpus"], r["doc"]) for r in web if r["m13"] > 0}
    webtu = {(r["corpus"], r["doc"]) for r in web if r["cov8"] > 0.5}
    webcopy = [r for r in web if r["cat"] == "copy"]
    F["iq_13_docs"] = fmt(len(web13))
    F["iq_8_docs"] = fmt(len(webtu))
    wc = Counter(r["cat"] for r in web)
    F["pr3_answer"] = (f"None. {len(web13)} web documents share a 13-gram with some test item; reading every flagged pair, "
                       f"{wc.get('passage', 0)} pairs are famous passages the items quote (speeches, novels, statutes), "
                       f"{wc.get('phrase', 0)} are stock phrases and question stems, {wc.get('source', 0)} is the WikiHow "
                       f"source of a HellaSwag item, and {len(webcopy)} contain a test question. (In the two whole FineWeb "
                       "files read afterwards, four pages out of 1.45 million do; section 3.)")
    # RLVR x MMLU high-school maths
    mm = L.bench("mmlu_test")
    hsm = int((mm.subject == "high_school_mathematics").sum())
    rl = L.post("rlvr_gsm_math_if_all")

    def nrm(x):
        x = str(x)
        for a, b in [("\\dfrac", "\\frac"), ("\\tfrac", "\\frac"), ("\\left", ""), ("\\right", ""), ("\\!", ""),
                     ("\\,", ""), ("$", ""), (" ", ""), ("^\\circ", "")]:
            x = x.replace(a, b)
        return x
    cop = {}
    for r in lab:
        if r["corpus"] == "rlvr" and r["cat"] == "copy" and r["bench"] == "mmlu_test":
            gt = rl.ground_truth[int(r["doc"].split("#")[1])]
            cop.setdefault(r["bidx"], False)
            if nrm(gt) == nrm(items[r["item"]]["label"]) or nrm(gt).lstrip("-") in nrm(items[r["item"]]["label"]):
                cop[r["bidx"]] = True
    n_same = sum(cop.values())
    F["mmlu_hsm_copies"] = str(len(cop))
    F["mmlu_hsm_share"] = pct(len(cop), hsm, 0)
    F["mmlu_all_share"] = pct(len(cop), len(mm), 2)
    m5v = {r["bidx"] for r in lab if r["corpus"] == "rlvr" and r["bench"] == "math500_test" and r["cat"] == "variant"}
    m5d = {r["bidx"] for r in lab if r["corpus"] == "rlvr" and r["bench"] == "math500_test" and r["cat"] == "diagram"}
    m5p = {r["bidx"] for r in lab if r["corpus"] == "rlvr" and r["bench"] == "math500_test" and r["cat"] == "phrase"}
    gv = {r["bidx"] for r in lab if r["corpus"] == "rlvr" and r["bench"] == "gsm8k_test"}
    uf = {r["bidx"] for r in lab if r["corpus"] == "ultrafeedback" and r["cat"] == "copy"}
    F["rlvr_line"] = (f"Tulu 3's RLVR set (all 29,946 prompts, whose MATH part is the MATH training split with four worked "
                      f"examples in front of each question) contains {len(cop)} MMLU test questions word for word, every one "
                      f"from high-school mathematics ({len(cop)} of its {hsm} items, {pct(len(cop), hsm, 0)}); for "
                      f"{n_same} of them the RLVR reward key equals MMLU's correct answer. MMLU's high-school maths items "
                      "evidently include problems that are also in MATH's training split (the MMLU paper says its questions "
                      "were collected from online sources; it does not name MATH). Measured over all of MMLU this is "
                      f"{pct(len(cop), len(mm), 2)} of items, far below Tulu 3's 2% dataset threshold, which is why a "
                      "benchmark-level rule cannot see it. UltraFeedback's 5,000 rows include one prompt that uses "
                      f"{len(uf)} ARC-Easy test questions, with options and answers, as few-shot examples.")
    def dtset(c, mode):
        q = os.path.join(L.scratch(), "data", "dg", "datatrove", f"{c}.{mode}.json")
        return {r["doc"] for r in json.load(open(q))["removed"]} if os.path.exists(q) else None
    cpd = {r["doc"] for r in lab if r["corpus"] == "rlvr" and r["cat"] == "copy"}
    dd, dq = dtset("rlvr", "default"), dtset("rlvr", "query")
    if dd is not None and dq is not None:
        F["dt_line"] = (f"Its default indexes only n-grams of the answer and n-grams that straddle the end of the question and "
                        f"the start of the answer. In an MMLU item the question ends with the four options, which a RLVR "
                        f"row does not contain, so the default removed {fmt(len(dd))} RLVR rows and caught "
                        f"{len(cpd & dd)} of the {len(cpd)} rows labelled copy. Switching on question n-grams "
                        f"(<code>find_query_ngrams=True</code>) catches {len(cpd & dq)} of {len(cpd)}, and removes "
                        f"{fmt(len(dq))} rows ({pct(len(dq), 29946)}), most of them on instruction phrases and "
                        "number patterns. Which n-grams you index decides what you catch.")
    F["variant_line"] = (f"{len(m5v)} MATH-500 test problems have a sibling in RLVR's MATH training problems: the same "
                         "diagram or opening with another question or other numbers (the altitudes of a triangle with "
                         "angles 54 and 52 degrees in the test, 46 and 71 in training). One of these was first labelled a "
                         "copy by the rules: <code>z^4 + z^2 + 1</code> in the test, <code>z^4 - z^2 + 1</code> in training, "
                         "identical after punctuation is stripped. Variants teach the method, not the answer; GSM1k-style "
                         "perturbed test sets exist to measure exactly that gap. GSM8K: "
                         f"{len(gv)} test items share an opening with a GSM8K training problem in RLVR, all variants.")
    rlc = Counter(r["cat"] for r in lab if r["corpus"] == "rlvr")
    F["fp_line"] = (f"In RLVR alone {rlc.get('phrase', 0)} flagged pairs are answer-format instructions (\"where m and n are "
                    "relatively prime positive integers. Find m+n\", \"Enter the letter of the correct option\") and "
                    f"{rlc.get('diagram', 0)} are shared Asymptote code ({len(m5d)} MATH-500 items, one preamble of 250 "
                    f"tokens reused by many graph problems); {len(m5p)} MATH-500 items are matched by such phrases. "
                    "GPT-3's remedy, ignoring n-grams that match more than 10 training documents, would remove most of "
                    "these and keep the copies, which match one or two rows each.")
    F["web_line"] = (f"The web samples share 13-grams with "
                     f"{fmt(sum(c['m13_items'] for c in corpora if c['group'] == 'web' and not c['key'].endswith('_file0')))} "
                     "(item, corpus) combinations, nearly all MMLU history and US-history items that quote a famous text: "
                     "Kennedy's moon speech, Roosevelt's Pearl Harbor address, Dr King's letter from Birmingham, Patrick "
                     "Henry, Dickens, the Declaration of Independence. Pages quote the speech, never the question. "
                     "Nemotron-CC's synthetic question-answer rewrites add stock stems (\"Which of the following is not "
                     "a symptom of\") that pass Tulu's 50% rule on short MMLU items. One DCLM page is the WikiHow article "
                     "a HellaSwag item was built from, true ending included: real, if minor, contamination for a "
                     "completion task. run0's own output (2,617 documents) has no 13-gram overlap with any item at all.")
    n_d, u = rm_units(lab, texts)
    F["rm_units_line"] = (f"for the {n_d} flagged web documents, removing whole documents deletes {fmt(u['doc'])} characters, "
                          f"the paragraphs containing the match {fmt(u['para'])}, the matched span plus 200 characters "
                          f"each side {fmt(u['span'])}, and the matched strings alone {fmt(u['str'])} "
                          f"({u['doc'] / max(1, u['str']):.0f} times less than whole documents).")
    F["headline"] = (f"Tulu 3's RLVR prompts contain {len(cop)} MMLU high-school-mathematics test questions word for word "
                     f"({pct(len(cop), hsm, 0)} of that subject), {n_same} with the MMLU answer as the reward key, yet the "
                     "set passes Tulu 3's own 2% rule. On the web side, every one of the "
                     f"{len(web13)} documents GPT-3's 13-gram rule flags in the samples is a false positive (famous speeches "
                     "the history items quote, stock phrases).")
    # canary
    cy = data.get("canary")
    if cy:
        nd = sum(v["docs"] for v in cy["corpora"].values())
        hit = sum(v["docs_with_canary"] for v in cy["corpora"].values())
        F["canary_line"] = (f"{hit} of {fmt(nd)} documents across all {len(cy['corpora'])} sets (samples and whole FineWeb "
                            f"files), and {cy['warc']['records_with_canary']} of the WARC's {fmt(cy['warc']['records'])} raw "
                            "responses (HTML before extraction). The one hit, in the whole FineWeb file, is a forum user's "
                            "comment page that quotes the BIG-bench canary and another evaluation canary while discussing "
                            "them: no benchmark data, exactly the caveat in the table. A canary filter would have dropped an "
                            "innocent page and nothing else here.")
    # PII
    P = data["pii"]
    F["pii_n_rows"] = str(len(P["rows"]))
    F["pii_n_gold"] = str(sum(P["gold_types"].values()))
    F["pii_n_neg"] = str(sum(1 for r in P["rows"] if r["neg"]))
    S_ = P["summary"]
    F["pii_note"] = (f"Presidio with identifier types only finds {round(100 * S_['presidio_ids']['recall'])}% with "
                     f"{S_['presidio_ids']['false_alarms']} false alarms; at score 0.5, "
                     f"{round(100 * S_['presidio_05']['recall'])}% with {S_['presidio_05']['false_alarms']}.")
    F["pii_misses"] = (f"datatrove ({round(100 * S_['datatrove']['recall'])}% recall) is built for two things, emails and public "
                       "IPv4 addresses, and finds exactly those: it misses the obfuscated emails (\"j.morales [at] example "
                       "[dot] net\"), the IPv6 address and everything else, and replaces the role addresses press@ and dpo@ "
                       "(not personal) and the version number 4.2.1.7. Dolma's regexes "
                       f"({round(100 * S_['dolma']['recall'])}%) add phones in one US shape and flag private IPs too. The extra "
                       f"regexes ({round(100 * S_['extra']['recall'])}%) catch cards (with the Luhn check), IBANs, street "
                       "addresses and handles, nothing else. Presidio "
                       f"({round(100 * S_['presidio']['recall'])}% with every type) is the only one that finds names, and "
                       "it pays in false alarms: London, Paris, Jordan and Georgia as places or people, times (\"6pm\", "
                       "\"Friday\") as DATE_TIME, the private IPs. Nobody flags a name with no context (\"Text Aisha\") "
                       "reliably, and none treats an age, a job and a town in one sentence (row " + next(r["id"] for r in P["rows"] if "34 years old" in r["text"]) + ") as identifying together: "
                       "the quasi-identifier case.")
    F["dolma_url_line"] = ("tested here, a sentence with a phone number and a URL keeps its phone span (the URL check returns "
                           "False); with the pattern as a raw string the check returns True and the phone would be dropped. "
                           "The post-filter has never worked as written.")
    R_ = P["real"]
    def g(k, t):
        return R_.get(k, {}).get("spans", {}).get(t, 0)
    F["pii_real_line"] = (f"on all 2,617 documents, datatrove's own detector finds {g('datatrove, all 2,617', 'EMAIL')} emails "
                          f"and {g('datatrove, all 2,617', 'IP')} public IPs (already replaced, so these are its replacement "
                          f"addresses); Dolma's regexes {g('dolma, all 2,617', 'PHONE')} phone numbers and "
                          f"{g('dolma, all 2,617', 'IP')} IPs; the extra regexes {g('extra, all 2,617', 'PHONE')} phones, "
                          f"{g('extra, all 2,617', 'ADDRESS')} street addresses and {g('extra, all 2,617', 'HANDLE')} handles. "
                          f"On a random 500, Presidio (score 0.5 or more, identifiers only) marks "
                          f"{g('presidio, 500 documents', 'PERSON')} person names, {g('presidio, 500 documents', 'LOCATION')} "
                          f"locations and {g('presidio, 500 documents', 'PHONE')} phone numbers.")
    wf, we = by.get("fineweb_file0"), by.get("fineweb_edu_file0")
    if wf and we:
        W = [r for r in lab if r["corpus"] in ("fineweb_file0", "fineweb_edu_file0")]
        wc2 = Counter(r["cat"] for r in W)
        F["wide_line"] = (f"FineWeb's file 000_00000 of CC-MAIN-2024-30 ({fmt(wf['docs'])} documents, {wf['tokens'] / 1e6:.0f} "
                          f"million words) and FineWeb-Edu's ({fmt(we['docs'])} documents, {we['tokens'] / 1e6:.0f} million "
                          f"words), {(wf['tokens'] + we['tokens']) / 1e9:.2f} billion words in all.")
        F["wide_find"] = (f"In the two whole FineWeb files, {fmt(wf['any13'])} and {fmt(we['any13'])} documents share a 13-gram "
                          f"with some item. Reading all {fmt(len(W))} flagged pairs: {wc2.get('passage', 0)} passages, "
                          f"{wc2.get('phrase', 0)} phrases, {wc2.get('source', 0)} WikiHow sources of HellaSwag items, "
                          f"{wc2.get('variant', 0)} variants and {wc2.get('copy', 0)} copies: two quiz pages and an article title "
                          "that ask the same short trivia question as an MMLU item (\"How many stars are on the American "
                          "flag?\") without options, and one quiz-aggregator page with an MMLU marketing question and its "
                          "options. At web scale real copies exist, but they are a few per million documents, and the 13-gram "
                          "rule finds them only among hundreds of false alarms.")
        F["headline"] += (f" In {(wf['docs'] + we['docs']) / 1e6:.2f} million more FineWeb documents the reading finds "
                          f"{wc2.get('copy', 0)} pages with a test question among {fmt(len(W))} flagged pairs.")
        sec = wf["tokens"] / max(1, json.load(open(os.path.join(L.scratch(), "data", "dg", "contam",
                                                                 "fineweb_file0.summary.json")))["seconds"])
        F["scan_speed"] = f"{sec / 1e3:.0f} thousand words per second"
    rn = data.get("robots_now")
    if rn:
        F["robots_date"] = rn["date"]
    F["judge_n"] = "300"


def emb(items, lab):
    p = os.path.join(L.scratch(), "data", "dg", "embed", "top.json")
    if not os.path.exists(p):
        return None
    E = json.load(open(p))
    import dg_embed as M
    tr = {(c, d): t for c, d, t in M.train_prompts()}
    it = {(i["bench"], i["idx"]): i for i in items}
    man = json.load(open(os.path.join(HERE, "scripts", "labels", "embed_labels.json")))
    ngp = {}
    for r in lab:
        if C.CORPORA[r["corpus"]][2] == "post":
            k = (r["bench"], r["bidx"], r["doc"])
            order = ["copy", "variant", "source", "passage", "phrase", "diagram"]
            if k not in ngp or order.index(r["cat"]) < order.index(ngp[k]):
                ngp[k] = r["cat"]
    stats = {}
    rows = []
    for r in E["items"]:
        b = r["bench"]
        t = r["top"][0]
        st = stats.setdefault(b, {"n": 0, "s95": 0, "s90": 0, "s85": 0})
        st["n"] += 1
        st["s95"] += t["score"] >= 0.95
        st["s90"] += t["score"] >= 0.9
        st["s85"] += t["score"] >= 0.85
        key = f'{b}|{r["bidx"]}'
        ng = ngp.get((b, r["bidx"], t["doc"]))
        labl = (man.get(key) or {}).get("cat") or ng
        if labl or t["score"] >= 0.95:
            rows.append({"b": b, "x": r["bidx"], "s": t["score"], "c": C.CORPORA[t["corpus"]][0], "lab": labl,
                         "ng": bool(ng), "note": (man.get(key) or {}).get("note", ""),
                         "q": clean(" ".join(M.stem(it[(b, r["bidx"])]).split())[:170]),
                         "t": clean(" ".join(tr[(t["corpus"], t["doc"])].split())[:170])})
    pri = {"copy": 0, "variant": 1, "similar": 2}
    rows.sort(key=lambda r: (r["ng"], pri.get(r["lab"], 3), -r["s"]))
    hi = [r for r in rows if r["s"] >= 0.95]
    hi_ng = [r for r in hi if r["ng"]]
    hi_new = [r for r in hi if not r["ng"]]
    cnt = Counter(r["lab"] for r in hi_new)
    band = [r for r in rows if r["s"] < 0.95 and not r["ng"] and r["lab"]]
    bc = Counter(r["lab"] for r in band)
    FACTS["emb_n_train"] = fmt(E["n_train"])
    FACTS["emb_n_items"] = fmt(len(E["items"]))
    FACTS["emb_n_lab"] = str(len(man))
    FACTS["emb_line"] = (f"{len(hi)} test items have a training prompt at cosine 0.95 or more; the n-gram rules had already "
                         f"flagged {len(hi_ng)} of those pairs. Of the {len(hi_new)} they missed, {cnt.get('copy', 0)} are the "
                         "same question: four MMLU maths items shorter than eight tokens (\"Evaluate $\\log_8 2$.\"), which "
                         "no 8- or 13-gram rule can match at all, and questions reworded or reformatted; "
                         f"{cnt.get('variant', 0)} are variants with other numbers. In a labelled sample of "
                         f"{len(band)} pairs between 0.88 and 0.95: {bc.get('copy', 0)} reworded copy (a GSM8K test problem "
                         "whose training-split twin tells the same story in other words), "
                         f"{bc.get('variant', 0)} variants, {bc.get('similar', 0)} merely similar. That is Tulu 3's "
                         "complaint in numbers: below about 0.95 the score does not separate a paraphrase from a cousin, "
                         "and a judge has to read the pair.")
    return {"stats": stats, "top": hi_new + [r for r in rows if r not in hi_new][:40]}


def gpu_results(items, lab):
    out = {}
    md = os.path.join(L.scratch(), "data", "dg", "mink")
    for m in ("Qwen3-0.6B", "Qwen3-1.7B"):
        p = os.path.join(md, m + ".float16.json")
        if os.path.exists(p):
            out.setdefault("mink", {})[m] = json.load(open(p))["summary"]
    p32 = os.path.join(md, "Qwen3-0.6B.float32.json")
    if os.path.exists(p32):
        out["mink32"] = json.load(open(p32))["summary"]
    jp = os.path.join(L.scratch(), "data", "dg", "embed", "judge_Qwen3-1.7B.json")
    if os.path.exists(jp):
        J = json.load(open(jp))
        man = {k: v["cat"] for k, v in json.load(open(os.path.join(HERE, "scripts", "labels", "embed_labels.json"))).items()}
        ngl = {}
        for r in lab:
            ngl.setdefault(f'{r["bench"]}|{r["bidx"]}|{r["doc"]}', r["cat"])
        tab = Counter()
        for o in J:
            g = man.get(f'{o["bench"]}|{o["bidx"]}') or ngl.get(f'{o["bench"]}|{o["bidx"]}|{o["doc"]}')
            tab[(g or "unlabelled", o["judge"])] += 1
        out["judge"] = {"n": len(J), "same": sum(o["judge"] == "SAME" for o in J),
                        "table": {f"{a}|{b}": v for (a, b), v in tab.items()},
                        "min_score": round(min(o["score"] for o in J), 3)}
    MK = out.get("mink", {})
    if MK:
        def a(m, b, k):
            return f"{MK[m]['auc'][b][k]:.2f}"
        ms = sorted(MK)
        F = FACTS
        parts = []
        for m in ms:
            parts.append(f"{m}: GSM8K {a(m, 'gsm8k_test', 'loss')} by loss and {a(m, 'gsm8k_test', 'minkpp')} by Min-K%++, "
                         f"MATH-500 {a(m, 'math500_test', 'loss')} and {a(m, 'math500_test', 'minkpp')}, MMLU high-school "
                         f"maths {a(m, 'mmlu_test', 'loss')} and {a(m, 'mmlu_test', 'minkpp')}")
        same = ""
        if "mink32" in out and "Qwen3-0.6B" in MK:
            d = max(abs(out["mink32"]["auc"][b][k] - MK["Qwen3-0.6B"]["auc"][b][k]) for b in MK["Qwen3-0.6B"]["auc"]
                    for k in ("loss", "mink", "minkpp", "zlib"))
            same = ((" A first 0.6B run with float32 weights gives the same AUCs to three decimals" if d < 0.0005 else
                     f" A first 0.6B run with float32 weights agrees with the float16 run within {d:.3f} AUC") + "; the 1.7B "
                    "run in float32 did not fit in memory on the shared machine, so both models are reported in float16.")
        F["mink_line"] = ("AUC (original vs number-shifted) for " + "; ".join(parts) + ". The worked solutions of GSM8K "
                          "and MATH-500 are part of each item, and shifting numbers breaks their arithmetic, so the control "
                          "is less natural text: some of the signal there is the perturbation, not memory. MMLU's maths "
                          "items carry no worked solution, and there the scores stay near 0.5 to 0.6, the regime Duan et al. "
                          "describe." + same)
    J = out.get("judge")
    if J:
        t = J["table"]
        cs = sum(v for k, v in t.items() if k.startswith("copy|"))
        cs_same = t.get("copy|SAME", 0)
        oth = sum(v for k, v in t.items() if not k.startswith("copy|") and not k.startswith("unlabelled|"))
        oth_same = sum(v for k, v in t.items() if k.endswith("|SAME") and not k.startswith("copy|")
                       and not k.startswith("unlabelled|"))
        unl = sum(v for k, v in t.items() if k.startswith("unlabelled|"))
        unl_same = t.get("unlabelled|SAME", 0)
        FACTS["judge_line"] = (f"Qwen3-1.7B (bf16, thinking off, greedy) read the {J['n']} most similar pairs (cosine "
                               f"{J['min_score']} and above). On pairs labelled copy it said SAME for {cs_same} of {cs}; on "
                               f"pairs labelled variant, similar or a false positive it said SAME for {oth_same} of {oth}; "
                               f"{unl} pairs carry no label ({unl_same} judged SAME). A small local judge "
                               "catches copies but also calls many variants the same question; Yang et al. used GPT-4, and the "
                               "judge's own error rate has to be measured on labelled pairs like these before it removes "
                               "anything. Measured on the M1 Pro GPU, 2026-10-15.")
    return out


def pj(name):
    p = os.path.join(HERE, "data", name)
    return json.load(open(p)) if os.path.exists(p) else None


def main():
    items, lab, corpora = contam()
    texts = doc_texts(lab)
    dtr = dt_removed()
    data = {"corpora": corpora, "checker": checker(items, lab, texts, dtr), "rules": rules_table(lab, dtr), "anim": anim_pairs(items, lab, texts),
            "optout": pj("optout.json"), "robots_now": pj("robots_now.json"), "prov": pj("prov.json"),
            "canary": pj("canary.json"), "bench_names": NAMES, "bench_sizes": dict(Counter(it["bench"] for it in items)), "pii": pii(), "emb": emb(items, lab), "gpu": gpu_results(items, lab)}
    facts(items, lab, corpora, texts, data)
    os.makedirs(os.path.join(HERE, "data"), exist_ok=True)
    json.dump(data, open(os.path.join(HERE, "data", "dg_data.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(FACTS, open(os.path.join(HERE, "data", "facts.json"), "w"), ensure_ascii=False, indent=0)
    print("data", os.path.getsize(os.path.join(HERE, "data", "dg_data.json")), "bytes;", len(FACTS), "facts")


if __name__ == "__main__":
    main()
