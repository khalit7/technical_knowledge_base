"""Step 3 of the Pipeline lab: language ID on every extraction, then the same filter chain (datatrove 0.10.1 objects,
run0's settings) on each extractor's text, plus chain variants on trafilatura's text.

Inputs: $DC_SCRATCH/data/pipe/extract_all.jsonl.gz (pip_extract.py).
Outputs:
  $DC_SCRATCH/data/pipe/outcomes.jsonl.gz  per document: lid per extractor, chain outcome per extractor and variant
  src/pipe/out/funnel_extractors.json      counts per stage and reason, per extractor and per variant
"""
import copy
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P  # noqa: E402
L = P.L
from datatrove.data import Document  # noqa: E402

EXTRACTORS = ["traf", "res", "wet"]
VARIANTS = {  # name: (chain kwargs) applied to trafilatura text (run0's documents only)
    "base": {},
    "char_dup_0.1": {"char_dup": 0.1},
    "c4_terminal_punct": {"c4_kwargs": {"filter_no_terminal_punct": True}},
    "c4_min_sentences_3": {"c4_kwargs": {"min_num_sentences": 3}},
    "no_list_ratio": {"fw_kwargs": {"new_line_ratio": 1e9}},
}


def lid_scores(model, text):
    labels, scores = model.predict(text.replace("\n", " "), k=-1)
    d = {lab.replace("__label__", ""): float(s) for lab, s in zip(labels, scores)}
    top = max(d, key=d.get)
    return {"top": top, "top_score": round(d[top], 4), "en": round(d.get("en", 0.0), 4)}


def main():
    import fasttext
    model = fasttext.load_model(L.model_path("lid176"))
    rows = P.read_jsonl_gz(P.scratch("extract_all.jsonl.gz"))
    print("rows", len(rows), flush=True)
    chains = {k: P.chain(**v) for k, v in VARIANTS.items()}
    out, summary = [], {}
    cnt = {f"{x}": Counter() for x in EXTRACTORS + ["traf_rerun"] + ["var_" + v for v in VARIANTS]}
    chars = {f"{x}": Counter() for x in cnt}
    for i, r in enumerate(rows):
        o = {"id": r["id"], "traf_status": r["traf_status"]}
        for x in EXTRACTORS:
            t = r.get(x) or ""
            o[f"{x}_chars"] = len(t)
            if not t.strip():
                o[f"{x}_lid"] = None
            else:
                o[f"{x}_lid"] = lid_scores(model, t)
        for x in EXTRACTORS + ["traf_rerun"]:
            src = "traf" if x == "traf_rerun" else x
            t = r.get(src) or ""
            if x == "traf" and r["traf_status"] != "run0":
                t = ""  # as run0: no text for timeouts and empty extractions
            if x == "traf_rerun" and r["traf_status"] == "rerun_timeout30":
                t = ""
            if not t.strip():
                res = ("1b_extract", "no_text")
            else:
                doc = Document(text=t, id=r["id"], metadata={"url": r["url"]})
                res = P.run_chain(doc, chains["base"])
                if res == (None, None):
                    res = ("kept", None)
            o[f"{x}_out"] = list(res)
            cnt[x][res] += 1
            chars[x][res[0]] += len(t)
        if r["traf_status"] == "run0" and o["traf_lid"] and o["traf_lid"]["en"] > 0.65:
            for v in VARIANTS:
                if v == "base":
                    res = tuple(o["traf_out"])
                else:
                    doc = Document(text=r["traf"], id=r["id"], metadata={"url": r["url"]})
                    res = P.run_chain(doc, chains[v][1:])  # language already known to pass
                    if res == (None, None):
                        res = ("kept", None)
                o[f"var_{v}"] = list(res)
                cnt["var_" + v][res] += 1
        out.append(o)
        if (i + 1) % 2000 == 0:
            print(i + 1, {k: sum(1 for kk in cnt[k] if kk[0] == "kept") and cnt[k][("kept", None)] for k in cnt}, flush=True)
    P.write_jsonl_gz(P.scratch("outcomes.jsonl.gz"), out)
    for k in cnt:
        by_step = Counter()
        for (s, rsn), n in cnt[k].items():
            by_step[s] += n
        summary[k] = {"by_step": dict(by_step), "by_reason": {f"{s}|{rsn}": n for (s, rsn), n in cnt[k].items()},
                      "chars_by_outcome_step": dict(chars[k])}
    P.save_out("funnel_extractors.json", summary)
    print({k: summary[k]["by_step"].get("kept") for k in summary})


if __name__ == "__main__":
    main()
