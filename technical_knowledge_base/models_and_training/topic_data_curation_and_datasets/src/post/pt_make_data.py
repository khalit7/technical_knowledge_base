"""Assemble the small data the Post-training data lab embeds: parts/35_js_pt_0data.js (window.PTD).

Inputs: out/stats.json, out/filter.json, out/checkers.json, out/rephrase.json (this folder's scripts), the
Decontamination child's labelled pairs ($DC_SCRATCH/data/dg/contam/labelled.jsonl.gz) and its page data
(decontamination_pii_and_governance/src/data/dg_data.json), and $DC_SCRATCH/post/stats_rows.jsonl.gz for the
example rows. Contamination pairs are re-scored here with the child's own normalisation and n-gram code
(dg_contam.py) and asserted equal to its recorded numbers.
usage: DC_SCRATCH=... python -I -B pt_make_data.py
"""
import gzip
import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pt_common as P  # noqa: E402

sys.path.insert(0, P.DG_SCRIPTS)
import dg_common as DGC  # noqa: E402
import dg_contam as DGX  # noqa: E402

PART = os.path.join(P.ROOT_SRC, "parts", "35_js_pt_0data.js")

SHOW = {  # example rows per dataset (row numbers in the sample), chosen by reading; see README.md for why each
    "sft": [4974, 974, 342, 3974, 1974, 2316, 2102, 3074],
    "pref": [], "rlvr": [], "cosmo": [],
}
PAIRS = [  # (corpus, doc, bench, bidx) from the child's labelled pairs
    ("rlvr", "rlvr#98", "mmlu_test", 4331), ("rlvr", "rlvr#2206", "mmlu_test", 4274),
    ("rlvr", "rlvr#14157", "mmlu_test", 4466),
    ("ultrafeedback", "d5bc6679f788a5022885d1ffa705083c109ce1c865c176a4d16a0bdadcb8d7d7", "arc_easy_test", 545),
    ("rlvr", "rlvr#464", "math500_test", 123), ("rlvr", "rlvr#8606", "mmlu_test", 4374),
    ("rlvr", "rlvr#273", "math500_test", 174), ("rlvr", "rlvr#13357", "mmlu_test", 2147),
    ("ultrafeedback", "945be71a15cd5196d660d5c4d1b6e746c8ee6f4b519431145f7d7d103f10bb21", "mmlu_test", 5681),
    ("ultrafeedback", "5c0821e662644680fb0f", "humaneval_test", None),
]


def cut(t, n):
    t = t or ""
    return t if len(t) <= n else t[:n].rstrip() + " [...]"


def rows_by_ds():
    R = defaultdict(list)
    for x in gzip.open(os.path.join(P.scratch(), "stats_rows.jsonl.gz"), "rt"):
        r = json.loads(x)
        R[r["ds"]].append(r)
    return R


def pick_rows(R, F):
    """Example rows: fixed SFT picks, the rest by rule (first example of each filter code, plus typical rows)."""
    ex = F["examples"]
    pick = {"sft": list(SHOW["sft"]) + ex.get("sft|dup", [])[:1]}
    p = R["pref"]
    big = sorted((r for r in p if r["margin"] >= 5), key=lambda r: r["i"])[:2]
    pick["pref"] = [r["i"] for r in big] + ex["pref|tie"][:2] + ex["pref|same_text"][:1] + ex.get("pref|contam", [])[:1]
    longer = [r for r in p if r["margin"] >= 3 and r["chosen_tok"] > 3 * r["rejected_tok"] and r["chosen_tok"] < 500]
    pick["pref"] += [r["i"] for r in longer[:1]]
    v = R["rlvr"]
    first = lambda ds: [r["i"] for r in v if r["dataset"] == ds and not r["dup_exact"] >= 0][:1]  # noqa: E731
    syl = [r["i"] for r in v if "syllogist" in r["question"]][:1]
    pick["rlvr"] = first("gsm8k") + first("MATH") + syl + ex["rlvr|unrewardable"][:1] + [98, 2206] + ex["rlvr|empty_label"][:1]
    c = R["cosmo"]
    fm = {}
    for r in c:
        fm.setdefault(r["format"], r["i"])
    hy = [r["i"] for r in c if r["format"] == "blogpost" and r["response"].lstrip().lower().startswith("have you ever")]
    pick["cosmo"] = list(fm.values()) + hy[:1]
    return pick


def row_view(ds, r, F):
    code = F[ds]["codes"][r["i"]]
    rule = None if code == "." else F[ds]["order"][ord(code) - 97]
    o = {"i": r["i"], "rule": rule}
    if ds == "sft":
        o.update(src=r["source"].replace("tulu_v3.9_", "").split("_decontaminated")[0], lang=r["lang"],
                 turns=r["turns"], pt=r["prompt_tok"], rt=r["response_tok"], p=cut(r["prompt"], 360),
                 r=cut(r["response"], 520), dup=r["dup_exact_full"] >= 0)
    elif ds == "pref":
        o.update(pt=r["prompt_tok"], ct=r["chosen_tok"], jt=r["rejected_tok"], sc=r["score_chosen"],
                 sj=r["score_rejected"], p=cut(r["prompt"], 360), c=cut(r["chosen"], 420), j=cut(r["rejected"], 420))
    elif ds == "rlvr":
        o.update(ds=r["dataset"], ct=r["constraint_type"], gt=cut(r["ground_truth"], 160), qt=r["question_tok"],
                 ft=r["prompt_tok"], p=cut(r["question"], 420))
    elif ds == "cosmo":
        o.update(fmt=r["format"], aud=r["audience"], st=r["seed_tok"], tt=r["text_tok"], seed=cut(r["seed"], 360),
                 r=cut(r["response"], 520))
    return o


def contam_pairs():
    lab = [json.loads(x) for x in gzip.open(os.path.join(P.L.scratch(), "data", "dg", "contam", "labelled.jsonl.gz"), "rt")]
    items = DGC.bench_items()
    key = {(it["bench"], it["idx"]): k for k, it in enumerate(items)}
    out = []
    want = {(c, d[:20]) for c, d, _, _ in PAIRS}
    texts = {}
    for c in ("rlvr", "ultrafeedback"):
        for d, t in DGC.corpus_iter(c):
            if (c, d[:20]) in want:
                texts[(c, d[:20])] = t
    for c, d, b, bi in PAIRS:
        cand = [x for x in lab if x["corpus"] == c and x["doc"].startswith(d[:20]) and x["bench"] == b
                and (bi is None or x["bidx"] == bi)]
        x = cand[0]
        it = items[key[(x["bench"], x["bidx"])]]
        itok = DGX.norm_tokens(it["full"])
        dtok = DGX.norm_tokens(texts[(c, d[:20])])
        # trim the document to the region holding every shared 8- and 13-gram (+ context)
        ih = {n: set(DGX.ngram_hashes(DGX.tok_hashes(itok), n).tolist()) for n in (5, 8, 13)}
        pos = [j for n in (8, 13) for j, h in enumerate(DGX.ngram_hashes(DGX.tok_hashes(dtok), n).tolist()) if h in ih[n]]
        lo, hi = max(0, min(pos) - 12), min(len(dtok), max(pos) + 13 + 12)
        keep = set()
        for j in pos:
            keep.update(range(max(lo, j - 12), min(hi, j + 13 + 12)))
        win, gap = [], 0
        for j in range(lo, hi):  # tokens far from any match are replaced by one gap marker per run
            if j in keep:
                if gap:
                    win.append("\u00a7" + str(gap))
                    gap = 0
                win.append(dtok[j])
            else:
                gap += 1
        # re-score on the trimmed window with the child's code; must equal its recorded numbers
        cov8 = DGX.item_coverage(" ".join(itok), " ".join(win), 8)[1].mean()
        # dg_contam counts one match per (document position, item position) pair with equal 13-gram hashes
        from collections import Counter
        im13 = Counter(DGX.ngram_hashes(DGX.tok_hashes(itok), 13).tolist())
        m13 = sum(im13[h] for h in DGX.ngram_hashes(DGX.tok_hashes(win), 13).tolist())
        assert abs(cov8 - x["cov8"]) < 1e-3 and m13 == x["m13"], (d, cov8, x["cov8"], m13, x["m13"])
        out.append({"corpus": c, "bench": b, "bidx": x["bidx"], "cat": x["cat"], "note": x.get("note", ""),
                    "item": " ".join(itok), "nq": len(DGX.norm_tokens(it["query"])), "doc": " ".join(win), "pre": lo,
                    "post": len(dtok) - hi, "cov8": x["cov8"], "m13": x["m13"],
                    "row": c + " row " + (d.split("#")[1] if "#" in d else d[:8])})
    return out


def main():
    st, F = P.load_out("stats.json"), P.load_out("filter.json")
    ck, rp = P.load_out("checkers.json"), P.load_out("rephrase.json")
    dg = json.load(open(os.path.join(P.DG_SCRIPTS, "..", "data", "dg_data.json")))
    R = rows_by_ds()
    pick = pick_rows(R, F)
    rows = {ds: [row_view(ds, R[ds][i], F) for i in ids] for ds, ids in pick.items()}
    # filters: drop the long id lists, keep counts and the per-row codes
    filt = {}
    for ds in ("sft", "pref", "rlvr", "cosmo"):
        f = {k: v for k, v in F[ds].items() if k not in ("codes", "groups", "optional")}
        # removed rows as "index:letter" pairs (letter = first rule in f["order"] that removed the row)
        # removed rows as one string: rule letter then the gap from the previous removed row ("a12b3" = row 12 by
        # rule a, row 15 by rule b); the letter indexes f["order"]
        prev, parts = 0, []
        for k, c in enumerate(F[ds]["codes"]):
            if c != ".":
                parts.append(c + str(k - prev))
                prev = k
        f["removed_rows"] = "".join(parts)
        if "groups" in F[ds] and ds == "sft":  # SFT subsets are contiguous blocks; elsewhere only counts
            names = sorted(set(F[ds]["groups"]))
            f["gnames"] = names
            runs = []
            for g in F[ds]["groups"]:
                gi = names.index(g)
                if runs and runs[-1][0] == gi:
                    runs[-1][1] += 1
                else:
                    runs.append([gi, 1])
            f["group_runs"] = runs
        f["optional"] = {}
        for k, v in F[ds]["optional"].items():
            o = {a: b for a, b in v.items() if a != "ids"}
            if len(v["ids"]) == v["n"] and v["n"] <= 1500:
                o["mask"] = bitmask(v["ids"], F[ds]["n"])
            f["optional"][k] = o
        filt[ds] = f
    post_c = [c for c in dg["corpora"] if c["group"] == "post"]
    data = {
        "stats": prune_stats(st), "filter": filt, "rows": rows,
        "checkers": trim_checkers(ck),
        "rephrase": {"syn_file": rp["syn_file"], "complete": rp["complete"], "agg": rp["agg"], "cosmo_agg": rp["cosmo_agg"],
                     "docs": rp["docs"], "cosmo": [[round(x["seed_edu"], 2), round(x["out_edu"], 2)] for x in rp["cosmo"]],
                     "cosmo_pair": cosmo_pair(R, rp)},
        "contam": {"pairs": contam_pairs(), "corpora": [{k: c[k] for k in ("key", "label", "docs", "any5", "any8", "any13",
                                                                             "tulu_docs", "tulu_items", "m13_items", "pairs", "cats",
                                                                             "cat_items")} for c in post_c],
                   "rules_post": {k: v for k, v in dg["rules"].items() if k.endswith("|post")}},
    }
    s = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    with open(PART, "w") as f:
        f.write("// ---- Post-training data lab (t-post): data generated by src/post/pt_make_data.py; do not edit ----\n")
        f.write("window.PTD=" + s + ";\n")
    print(len(s), {k: len(json.dumps(v, ensure_ascii=False)) for k, v in data.items()})


USED_Q = ("0.5", "0.9", "0.99", "max")


def prune_stats(st):
    """Keep only what the page reads: median, 90th, 99th percentile, max and the histogram of each length field."""
    import copy
    st = copy.deepcopy(st)
    for ds in ("sft", "pref", "rlvr", "cosmo"):
        for g, o in st[ds]["len"].items():
            for k in list(o):
                if k == "n" or k.endswith("_hist"):
                    continue
                if k == "text_token_length" or k.startswith("text_token_length"):
                    o.pop(k)
                    continue
                o[k] = {q: o[k][q] for q in USED_Q if q in o[k]}
            o.pop("text_token_length_hist", None)
            if ds == "sft":
                o.pop("turns_hist", None)
    return st


def trim_checkers(ck):
    out = {k: v for k, v in ck.items() if k not in ("ref", "ref_examples", "model")}
    out["ref"] = {d: ({k: v for k, v in o.items() if k != "agree"} if isinstance(o, dict) else o) for d, o in ck["ref"].items()}
    out["ref_examples"] = [dict(e, tail=e["tail"][-170:], q=e["q"][:170]) for e in ck["ref_examples"][:9]]
    out["model"] = {m: {k: ({a: b for a, b in v.items() if a != "agree"} if isinstance(v, dict) and k in ("gsm8k", "MATH") else v)
                        for k, v in o.items() if k != "examples"} | {"examples": o.get("examples", [])[:8]}
                    for m, o in ck.get("model", {}).items()}
    return out


def bitmask(ids, n):
    import base64
    b = bytearray((n + 7) // 8)
    for i in ids:
        b[i // 8] |= 1 << (i % 8)
    return base64.b64encode(bytes(b)).decode()


def cosmo_pair(R, rp):
    """One Cosmopedia seed -> document pair for the before/after view: the sampled row with the median score gain."""
    xs = sorted(rp["cosmo"], key=lambda x: x["out_edu"] - x["seed_edu"])
    x = xs[len(xs) // 2]
    r = R["cosmo"][x["i"]]
    return {"i": r["i"], "format": r["format"], "seed": r["seed"], "out": cut(r["response"], 2200), "seed_edu": x["seed_edu"],
            "out_edu": x["out_edu"], "src_words": x["src_words"], "out_words": x["out_words"], "novel4": x["novel4"],
            "nums": x["nums"], "nums_kept": x["nums_kept"]}


if __name__ == "__main__":
    main()
