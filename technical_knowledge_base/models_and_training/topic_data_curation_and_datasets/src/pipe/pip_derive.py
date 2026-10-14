"""Step 8 of the Pipeline lab: derived numbers from the outputs of steps 1 to 5 (no new model runs except the GPT-2
tokenizer for token counts). Writes src/pipe/out/derived.json.

- trafilatura statuses (run0 text, re-run text, re-run empty) and what the recovered pages do in the chain
- per extractor: empty share, characters, English share, kept count, characters entering each stage
- the chain variants against FineWeb's own kept set (which threshold does FineWeb's data agree with?)
- TeX survival measured on visible text (WET) instead of raw HTML, and structure survival on English pages
- language ID: histogram of the English score on trafilatura text, kept count by threshold, top languages
- GPT-2 tokens at the points of the funnel that FineWeb's paper reports in tokens
"""
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P  # noqa: E402
L = P.L

TEX = re.compile(r"\\\(|\\\[|\$\$|\\begin\{(?:equation|align)|\\frac\{")


def main():
    ext = {r["id"]: r for r in P.read_jsonl_gz(P.scratch("extract_all.jsonl.gz"))}
    oc = {o["id"]: o for o in P.read_jsonl_gz(P.scratch("outcomes.jsonl.gz"))}
    fw = set(L.ids("fineweb_kept"))
    D = {}
    # trafilatura statuses
    st = Counter(r["traf_status"] for r in ext.values())
    rec = [o for o in oc.values() if o["traf_status"] == "rerun_text"]
    D["traf_status"] = dict(st)
    D["traf_recovered"] = {"n": len(rec), "english": sum(1 for o in rec if o["traf_out"] and o["traf_rerun_out"][0] != "2_lid"),
                           "kept": sum(1 for o in rec if o["traf_rerun_out"][0] == "kept"),
                           "kept_in_fineweb": sum(1 for o in rec if o["traf_rerun_out"][0] == "kept" and o["id"] in fw),
                           "outcomes": dict(Counter(o["traf_rerun_out"][0] for o in rec))}
    # per extractor
    per = {}
    for x in ("traf", "res", "wet"):
        txt = [(ext[i][x] if not (x == "traf" and ext[i]["traf_status"] != "run0") else None) for i in ext]
        ne = [t for t in txt if t and t.strip()]
        lens = sorted(len(t) for t in ne)
        en = sum(1 for o in oc.values() if o.get(f"{x}_lid") and o[f"{x}_lid"]["en"] > 0.65)
        per[x] = {"pages": len(txt), "empty": len(txt) - len(ne), "chars_total": sum(lens),
                  "chars_median": lens[len(lens) // 2], "english_over_065": en,
                  "kept": sum(1 for o in oc.values() if o[f"{x}_out"][0] == "kept"),
                  "kept_in_fineweb": sum(1 for o in oc.values() if o[f"{x}_out"][0] == "kept" and o["id"] in fw)}
    D["per_extractor"] = per
    # agreement between extractors on the final verdict
    agree = Counter((o["traf_out"][0] == "kept", o["res_out"][0] == "kept", o["wet_out"][0] == "kept") for o in oc.values())
    D["kept_overlap"] = {f"t{int(a)}r{int(b)}w{int(c)}": n for (a, b, c), n in agree.items()}
    # characters entering each stage per extractor (stage order)
    order = ["1b_extract", "2_lid", "3_gopher_rep", "4_gopher_qual", "5_c4", "6_fineweb_qual", "kept"]
    chars = {}
    for x in ("traf", "res", "wet"):
        c = Counter()
        for i, o in oc.items():
            t = ext[i][x] if not (x == "traf" and ext[i]["traf_status"] != "run0") else ""
            t = t or ""
            stop = o[f"{x}_out"][0]
            for s in order[1:]:
                if order.index(s) <= order.index(stop):
                    c["in_" + s] += len(t)
        chars[x] = dict(c)
    D["chars_into_stage"] = chars
    # variants against FineWeb's kept set
    var = {}
    for v in ("char_dup_0.1", "c4_terminal_punct", "c4_min_sentences_3"):
        extra = [i for i, o in oc.items() if o.get("var_" + v) and o["var_" + v][0] == "kept" and o["var_base"][0] != "kept"]
        lost = [i for i, o in oc.items() if o.get("var_" + v) and o["var_" + v][0] != "kept" and o["var_base"][0] == "kept"]
        var[v] = {"extra_kept": len(extra), "extra_in_fineweb": sum(1 for i in extra if i in fw),
                  "lost": len(lost), "lost_in_fineweb": sum(1 for i in lost if i in fw)}
    D["variants_vs_fineweb"] = var
    # TeX on visible text; structure on English pages
    tex = Counter()
    for i, r in ext.items():
        if r["wet"] and TEX.search(r["wet"]):
            tex["pages"] += 1
            for x in ("traf", "res"):
                t = r[x] if not (x == "traf" and r["traf_status"] != "run0") else None
                if t and TEX.search(t):
                    tex[x] += 1
    D["tex_visible"] = dict(tex)
    srows = P.read_jsonl_gz(P.scratch("struct_rows.jsonl.gz"))
    s_en = {}
    for kind in ("table", "code"):
        acc = {x: [0, 0.0] for x in ("traf", "res", "wet")}
        for s in srows:
            o = oc.get(s["id"])
            if kind in s and o and o.get("wet_lid") and o["wet_lid"]["en"] > 0.5:
                for x in acc:
                    acc[x][0] += 1
                    acc[x][1] += s[kind][x]
        s_en[kind] = {x: {"pages": a[0], "mean_recall": round(a[1] / max(1, a[0]), 3)} for x, a in acc.items()}
    D["struct_english"] = s_en
    # language ID on trafilatura text (run0's extracted documents)
    lid = [o["traf_lid"] for o in oc.values() if o["traf_status"] == "run0" and o["traf_lid"]]
    bins = [0] * 50
    for l in lid:
        bins[min(49, int(l["en"] * 50))] += 1
    thr = {f"{t / 100:.2f}": sum(1 for l in lid if l["en"] > t / 100) for t in range(5, 100, 5)}
    top = Counter(l["top"] for l in lid)
    D["lid"] = {"n": len(lid), "hist50": bins, "kept_by_threshold": thr, "top_langs": top.most_common(14),
                "boundary_055_075": sum(1 for l in lid if 0.55 <= l["en"] <= 0.75),
                "en_top_but_below_065": sum(1 for l in lid if l["top"] == "en" and l["en"] <= 0.65),
                "wet_english": sum(1 for o in oc.values() if o.get("wet_lid") and o["wet_lid"]["en"] > 0.65)}
    # GPT-2 tokens at FineWeb's reporting points
    import glob
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(glob.glob(os.path.join(os.environ["HF_HOME"], "hub", "models--openai-community--gpt2",
                                                     "snapshots", "*", "tokenizer.json"))[0])
    def ntok(docs):
        return sum(len(e.ids) for e in tok.encode_batch([d["text"] for d in docs]))
    after_gopher = [d for s in ("5_c4", "6_fineweb_qual") for d in L.run0_removed(s)]  # texts edited by C4 for 6_*
    ext_by = {d["id"]: d for d in L.run0("extracted")}
    after_gopher_ids = [d["id"] for d in after_gopher] + [d["id"] for d in L.run0("filtered")]
    D["gpt2_tokens"] = {"after_gopher (FineWeb 'base filtered')": ntok([ext_by[i] for i in after_gopher_ids]),
                        "after_c4_and_fineweb_rules": ntok(L.run0("filtered")),
                        "after_minhash": ntok(L.run0("deduped")),
                        "docs": [len(after_gopher_ids), len(L.run0("filtered")), len(L.run0("deduped"))]}
    P.save_out("derived.json", D)
    print(json.dumps(D, indent=0)[:4000])


if __name__ == "__main__":
    main()
