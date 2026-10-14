"""Step 9 of the Pipeline lab: assemble everything the tab embeds into src/parts/31_js_pip_0data.js (window.DCPD)
and a copy as src/pipe/out/page_data.json (checked by check_numbers.py).

Inputs: src/pipe/out/*.json (steps 1 to 8), src/pipe/labels/*.json, the root's src/data/run0_*.json, and the
scratch files rule_values / extract_all / outcomes / label_sample. Every text excerpt shown on the page goes through
datatrove's PIIFormatter first (emails and public IPs replaced), is cut to a few hundred characters, and comes from
a page chosen by hand among organisations (see EXCLUDE for pages never shown).
"""
import json
import os
import re
import sys
from collections import Counter
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P  # noqa: E402
L = P.L
from datatrove.pipeline.formatters import PIIFormatter  # noqa: E402

PII = PIIFormatter()
ROOT_DATA = os.path.join(P.HERE, "..", "data")
EXCLUDE = {"iheartmyteacher.org", "healcon.com", "www.agent123.com", "vkpasanen.com", "rajeshsangwan.com",
           "www.talkingwithtami.com", "www.eltaller.org", "elsabebriers.com", "www.digthedunes.com",
           "orangecountyphotographerblog.com", "superjuni-or13.forumotion.com", "michaellorke.owlstown.net",
           "chathamsquare.ning.com", "asimplehomestead.com", "honesthandsringco.com", "goodcasinos.org",
           "levelupcasino.top", "exwindows.com", "theactiongames.co", "lynda-lopez.alanyahotels.eu",
           "heyloadspruw.web.app", "perorusi.ru", "darkhorseforum.com", "www.darkhorseforum.com",
           "forum.orioleshangout.com", "caballonegro.blogspot.com", "toaf.ca", "rdpsoft.com"}
ORG = re.compile(r"\.(org|gov|edu|museum|int)(\.|$)|\.ac\.|\.gov\.|council|library|univ")


def out(name):
    return json.load(open(os.path.join(P.OUT, name)))


def excerpt(t, n=260):
    t = PII.format(t or "")
    t = re.sub(r"\s*\n\s*", " / ", t.strip())
    t = re.sub(r"[ \t]+", " ", t)
    return t[:n] + ("..." if len(t) > n else "")


# ------------------------------------------------------------------ rules for the explorer
# key, label, stage, direction ('gt': dropped when value > t; 'lt': dropped when value < t), default, grid max, note
RULES = [
    ("dup_line_frac", "Duplicate lines (fraction of lines)", "Gopher repetition", "gt", 0.3, 1.0, ""),
    ("dup_line_char_frac", "Characters in duplicate lines", "Gopher repetition", "gt", 0.2, 1.0, ""),
    ("dup_para_frac", "Duplicate paragraphs (fraction)", "Gopher repetition", "gt", 0.3, 1.0, ""),
    ("top_2_gram", "Most frequent 2-gram, share of characters", "Gopher repetition", "gt", 0.2, 0.6, ""),
    ("top_3_gram", "Most frequent 3-gram, share of characters", "Gopher repetition", "gt", 0.18, 0.6, ""),
    ("top_4_gram", "Most frequent 4-gram, share of characters", "Gopher repetition", "gt", 0.16, 0.6, ""),
    ("dup_5_gram", "Characters in repeated 5-grams", "Gopher repetition", "gt", 0.15, 0.8, ""),
    ("dup_10_gram", "Characters in repeated 10-grams", "Gopher repetition", "gt", 0.10, 0.8, ""),
    ("n_words", "Words (non-symbol)", "Gopher quality", "lt", 50, 300, "integer"),
    ("alpha_words", "Words with a letter (datatrove: spaCy tokens)", "Gopher quality", "lt", 0.8, 1.0, ""),
    ("alpha_words_ws", "Words with a letter (whitespace words)", "Gopher quality", "lt", 0.8, 1.0, "what-if"),
    ("stop_words", "Distinct stop words of 8", "Gopher quality", "lt", 2, 8, "integer"),
    ("end_ellipsis_lines", "Lines ending in an ellipsis", "Gopher quality", "gt", 0.3, 1.0, ""),
    ("bullet_lines", "Lines starting with a bullet", "Gopher quality", "gt", 0.9, 1.0, ""),
    ("c4_sentences", "Sentences after C4's line edits", "C4", "lt", 5, 20, "integer"),
    ("line_punct", "Lines ending in punctuation", "FineWeb", "lt", 0.12, 0.6, ""),
    ("short_lines", "Lines of 30 characters or fewer", "FineWeb", "gt", 0.67, 1.0, ""),
    ("char_dup", "Characters in duplicated lines", "FineWeb", "gt", 0.01, 0.3, ""),
    ("list_ratio", "Newlines per word", "FineWeb", "gt", 0.3, 0.5, ""),
]
DEFAULTS = {r[0]: (r[3], r[4]) for r in RULES}
# every rule of the chain at datatrove defaults, with the C4 document rules, for "passes all other rules"
CHAIN = dict(DEFAULTS)
CHAIN.pop("alpha_words_ws")
EXTRA_CHAIN = {"dup_para_char_frac": ("gt", 0.2), "dup_6_gram": ("gt", 0.14), "dup_7_gram": ("gt", 0.13),
               "dup_8_gram": ("gt", 0.12), "dup_9_gram": ("gt", 0.11), "avg_word_len_lo": ("lt", 3),
               "avg_word_len_hi": ("gt", 10), "hash_ratio": ("gt", 0.1), "ellipsis_ratio": ("gt", 0.1),
               "n_words_hi": ("gt", 100000), "c4_curly": ("gt", 0.5), "c4_lorem": ("gt", 0.5)}


def val(v, k):
    if k == "avg_word_len_lo" or k == "avg_word_len_hi":
        return v["avg_word_len"]
    if k == "n_words_hi":
        return v["n_words"]
    return v[k]


def fails(v, k, d, t):
    x = val(v, k)
    return x > t if d == "gt" else x < t


def grid(rule):
    k, _, _, d, dft, mx, note = rule
    if note == "integer":
        g = list(range(0, int(mx) + 1))
    elif k == "char_dup":
        g = [0, 0.0025, 0.005, 0.0075, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.12, 0.15,
             0.2, 0.25, 0.3]
    else:
        g = [round(mx * i / 40, 4) for i in range(41)]
    if dft not in g:
        g = sorted(g + [dft])
    return g


def rules_block():
    rows = P.read_jsonl_gz(P.scratch("rule_values.jsonl.gz"))
    allk = {**CHAIN, **EXTRA_CHAIN}
    fw = set(L.ids("fineweb_kept"))
    res = []
    for rule in RULES:
        k, label, stage, d, dft, mx, note = rule
        others = {kk: vv for kk, vv in allk.items() if kk != k and not (k == "alpha_words_ws" and kk == "alpha_words")}
        g = grid(rule)
        iso, marg, fwin = [], [], []
        pass_others = [r for r in rows if not any(fails(r["v"], kk, dd, tt) for kk, (dd, tt) in others.items())]
        for t in g:
            iso.append(sum(1 for r in rows if fails(r["v"], k, d, t)))
            marg.append(sum(1 for r in pass_others if fails(r["v"], k, d, t)))
            fwin.append(sum(1 for r in pass_others if fails(r["v"], k, d, t) and r["id"] in fw))
        # value histogram (20 bins over the grid range) for all 6,971 and for those passing the other rules
        lo, hi = g[0], g[-1]
        def hist(rs):
            h = [0] * 20
            for r in rs:
                x = r["v"][k]
                i = int((x - lo) / (hi - lo) * 20) if hi > lo else 0
                h[max(0, min(19, i))] += 1
            return h
        res.append({"k": k, "label": label, "stage": stage, "dir": d, "dft": dft, "grid": g, "iso": iso,
                    "marg": marg, "fw": fwin, "n_pass_others": len(pass_others), "hist_all": hist(rows),
                    "hist_others": hist(pass_others), "note": note})
    return res, rows


# ------------------------------------------------------------------ examples for the explorer and the label table
def examples(rows):
    ext = {d["id"]: d for d in L.run0("extracted")}
    labs = json.load(open(os.path.join(P.HERE, "labels", "drops.json")))
    by_id = {r["id"]: r for r in rows}
    ex = {}
    keymap = {"dup_line_frac": "dup_line_frac", "dup_line_char_frac": "dup_line_char_frac", "top_2_gram": "top_2_gram",
              "top_3_gram": "top_3_gram", "top_4_gram": "top_4_gram", "duplicated_5_n_grams": "dup_5_gram",
              "gopher_short_doc": "n_words", "gopher_below_alpha_threshold": "alpha_words",
              "gopher_too_many_end_ellipsis": "end_ellipsis_lines", "gopher_enough_stop_words": "stop_words",
              "gopher_too_many_bullets": "bullet_lines", "too_few_sentences": "c4_sentences",
              "line_punct_ratio": "line_punct", "char_dup_ratio": "char_dup", "short_line_ratio": "short_lines"}
    for l in labs:
        k = keymap.get(l["group"])
        if not k or l["domain"] in EXCLUDE:
            continue
        r = by_id[l["id"]]
        ex.setdefault(k, []).append({"side": "dropped", "label": l["label"], "v": round(r["v"][k], 4),
                                     "host": l["domain"], "note": l["note"], "t": excerpt(ext[l["id"]]["text"])})
    # kept side: documents that passed everything, organisation hosts, nearest to each rule's default threshold
    kept = [r for r in rows if r["run0_step"] is None and ORG.search(urlparse(r["url"]).netloc)
            and urlparse(r["url"]).netloc not in EXCLUDE]
    for rule in RULES:
        k, d, dft = rule[0], rule[3], rule[4]
        if k == "alpha_words_ws":
            continue
        near = sorted(kept, key=lambda r: abs(r["v"][k] - dft))[:2]
        for r in near:
            ex.setdefault(k, []).append({"side": "kept", "label": "", "v": round(r["v"][k], 4),
                                         "host": urlparse(r["url"]).netloc, "note": "", "t": excerpt(ext[r["id"]]["text"])})
    for k in ex:
        ex[k] = [e for e in ex[k] if e["side"] == "dropped"][:4] + [e for e in ex[k] if e["side"] == "kept"]
    # label summary per group
    summ = {}
    for l in labs:
        s = summ.setdefault(l["group"], {"n_in_group": l["n_in_group"], "R": 0, "W": 0, "U": 0, "K": 0, "J": 0})
        s[l["label"]] += 1
    return ex, summ


# ------------------------------------------------------------------ the three extraction pages
PAGES = [("www.protectnmwater.org", "An advocacy campaign page: WET keeps the calendar widget"),
         ("mkwc.ifa.hawaii.edu", "A university weather-centre page: trafilatura merges the menu"),
         ("www.railwaycodes.org.uk", "A railway reference page: resiliparse drops the data")]


def norm(s):
    return " ".join(s.split())


def page_lines(wet, x):
    nx = norm(x or "")
    xl = {norm(l) for l in (x or "").split("\n") if l.strip()}
    outl = []
    for l in wet.split("\n"):
        if not l.strip():
            continue
        n = norm(l)
        keep = (n in xl) if len(n) < 4 else (n in nx)
        outl.append(1 if keep else 0)
    return outl


def html_excerpt(html):
    h = re.sub(r"(?is)<script.*?</script>|<style.*?</style>|<!--.*?-->|<svg.*?</svg>", "", html)
    h = re.sub(r"\s+", " ", h)
    m = re.search(r"(?i)<body", h)
    return h[m.start() if m else 0:][:1400]


def extraction_pages():
    ext = {r["id"]: r for r in P.read_jsonl_gz(P.scratch("extract_all.jsonl.gz"))}
    oc = {o["id"]: o for o in P.read_jsonl_gz(P.scratch("outcomes.jsonl.gz"))}
    want = {}
    for i, r in ext.items():
        h = urlparse(r["url"]).netloc
        for host, title in PAGES:
            if h == host and (host != "mkwc.ifa.hawaii.edu" or "chnl=08" in r["url"]) and \
                    (host != "www.railwaycodes.org.uk" or "kje2" in r["url"]):
                want[host] = i
    htmls = {}
    for d in P.html_docs():
        if d.id in want.values():
            htmls[d.id] = d.text
    pages = []
    for host, title in PAGES:
        i = want[host]
        r, o = ext[i], oc[i]
        wet = PII.format(r["wet"])
        lines = [l for l in wet.split("\n") if l.strip()]
        html = htmls[i]
        def side(x):
            t = PII.format(r[x] or "")
            lid = o.get(f"{x}_lid") or {}
            ls = [l for l in t.split("\n") if l.strip()]
            ends = sum(1 for l in ls if l.rstrip().endswith((".", "!", "?", '"', "'", "”"))) / max(1, len(ls))
            return {"text": t, "chars": len(t), "lines": len(ls), "en": lid.get("en"), "top": lid.get("top"),
                    "punct_lines": round(ends, 3), "out": o[f"{x}_out"]}
        pages.append({"host": host, "title": title, "url_path": urlparse(r["url"]).path[:60],
                      "html_chars": len(html), "html_tags": len(re.findall(r"<[a-zA-Z]", html)),
                      "html_excerpt": html_excerpt(html), "wet_lines": lines,
                      "keep": {"traf": page_lines(wet, PII.format(r["traf"] or "")), "res": page_lines(wet, PII.format(r["res"] or ""))},
                      "wet": side("wet"), "traf": side("traf"), "res": side("res")})
    return pages


# ------------------------------------------------------------------ language-ID boundary examples
# what each boundary page is, read by the agent (2026-10-14); every one of them is English
LID_KIND = {"gold.jgi.doe.gov": "navigation menu", "biobank.ndph.ox.ac.uk": "data table", "hebrew.bodleian.ox.ac.uk":
            "search facets", "ace.duke.edu": "navigation menu", "paar.kh.edu.tw": "PHP error log",
            "digital.bentley.umich.edu": "OCR of a 1960 newspaper scan", "clemenscenter.org": "short event blurb",
            "ieefa.org": "navigation menu", "isr.uci.edu": "citation list", "www.wallcoveringinstallers.org":
            "navigation menu", "research.library.mun.ca": "citation list", "trid.trb.org": "search interface"}


def lid_examples():
    ext = {r["id"]: r for r in P.read_jsonl_gz(P.scratch("extract_all.jsonl.gz"))}
    oc = P.read_jsonl_gz(P.scratch("outcomes.jsonl.gz"))
    cands = [o for o in oc if o["traf_status"] == "run0" and o["traf_lid"] and 0.45 <= o["traf_lid"]["en"] <= 0.85
             and ORG.search(urlparse(ext[o["id"]]["url"]).netloc) and urlparse(ext[o["id"]]["url"]).netloc not in EXCLUDE]
    cands.sort(key=lambda o: o["id"])
    import random
    rnd = random.Random(0)
    pick = rnd.sample(cands, min(14, len(cands)))
    return [{"host": urlparse(ext[o["id"]]["url"]).netloc, "en": o["traf_lid"]["en"], "top": o["traf_lid"]["top"],
             "top_score": o["traf_lid"]["top_score"], "t": excerpt(ext[o["id"]]["traf"], 220),
             "kind": LID_KIND[urlparse(ext[o["id"]]["url"]).netloc]}
            for o in sorted(pick, key=lambda o: o["traf_lid"]["en"]) if urlparse(ext[o["id"]]["url"]).netloc in LID_KIND]


def as_shipped():
    """run0's variant with datatrove's example as shipped (LanguageFilter() with languages=None)."""
    import glob, gzip
    b = os.path.join(L.scratch(), "data", "run0", "example_as_shipped")
    def rd(p):
        return [json.loads(l) for f in sorted(glob.glob(os.path.join(b, p, "*.jsonl.gz"))) for l in gzip.open(f, "rt")]
    q = rd("removed/4_gopher_qual")
    sw = [d for d in q if d["metadata"].get("filter_reason") == "gopher_enough_stop_words"]
    k = rd("filtered")
    st = json.load(open(os.path.join(ROOT_DATA, "run0_datatrove_stats.json")))["1_filter"]
    lid = [x for x in st if "Language" in x["name"]][0]["stats"]
    return {"lid_pass": lid["forwarded"], "gopher_qual_drops": len(q), "stop_word_drops": len(sw),
            "stop_word_drops_en": sum(1 for d in sw if d["metadata"].get("language") == "en"),
            "stop_word_top": Counter(d["metadata"].get("language") for d in sw).most_common(6),
            "kept": len(k), "kept_en": sum(1 for d in k if d["metadata"].get("language") == "en"),
            "kept_other_top": Counter(d["metadata"].get("language") for d in k if d["metadata"].get("language") != "en").most_common(5)}


def main():
    counts = json.load(open(os.path.join(ROOT_DATA, "run0_counts.json")))
    stats = json.load(open(os.path.join(ROOT_DATA, "run0_datatrove_stats.json")))
    fe = out("funnel_extractors.json")
    der = out("derived.json")
    rules, rows = rules_block()
    ex, summ = examples(rows)
    url_labels = json.load(open(os.path.join(P.HERE, "labels", "url.json")))
    D = {
        "run0": {"responses": 20991, "html_read": 20463, "url_kept": 20280, "extracted": 19241, "english": 6971,
                 "gopher_rep": 5459, "gopher_qual": 3576, "c4": 3221, "fineweb": 2692, "minhash": 2617, "pii": 2617,
                 "removed": {k: v for k, v in counts["removed"].items()}, "fineweb_kept": 2425, "fineweb_in_final": 2403},
        "funnel_ext": {x: fe[x] for x in ("traf", "res", "wet", "traf_rerun")},
        "variants": {k[4:]: fe[k]["by_step"] for k in fe if k.startswith("var_")},
        "derived": der,
        "url": {"reasons": counts["removed"]["1_url"]["reasons"],
                "labels": dict(Counter(l["label"] for l in url_labels)),
                "wrong": [{"host": l["host"], "what": l["what"], "reason": l["reason"]} for l in url_labels if l["label"] == "W"]},
        "rules": rules, "examples": ex, "label_summary": summ,
        "pages": extraction_pages(), "lid_examples": lid_examples(),
        "pii": out("pii.json"), "timing": out("timing.json"), "extract_timing": out("extract_timing.json"),
        "as_shipped": as_shipped(),
        "wide": out("wide.json") if os.path.exists(os.path.join(P.OUT, "wide.json")) else None,
    }
    # the house style has no em-dashes, so the one character is replaced in crawled text too (noted on the page)
    D = json.loads(json.dumps(D, ensure_ascii=False).replace("\u2014", "--"))
    P.save_out("page_data.json", D)
    js = "// ---- Pipeline lab (t-pipe): data, generated by src/pipe/pip_data.py; do not edit ----\nwindow.DCPD=" + \
         json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n"
    with open(os.path.join(P.HERE, "..", "parts", "31_js_pip_0data.js"), "w") as f:
        f.write(js)
    print("bytes", len(js.encode("utf-8")), {k: len(json.dumps(v)) for k, v in D.items()})


if __name__ == "__main__":
    main()
