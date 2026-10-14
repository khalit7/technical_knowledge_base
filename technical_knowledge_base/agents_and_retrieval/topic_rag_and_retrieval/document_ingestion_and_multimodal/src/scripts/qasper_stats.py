"""QASPER validation: how much answer evidence lives only in tables or figures.
usage: python -I qasper_stats.py <RAG_SCRATCH> <out.json>
Counts answerable questions whose every annotator's evidence is FLOAT SELECTED (a table or figure),
whose evidence mixes text and floats, and text only. Also lists papers with float-only questions."""
import json, sys, os
import pandas as pd
RS, OUT = sys.argv[1], sys.argv[2]
q = pd.read_parquet(os.path.join(RS, "data", "raw", "qasper", "validation.parquet"))
c = dict(papers=len(q), questions=0, answerable=0, ev_text_only=0, ev_float_only=0, ev_mixed=0, ev_none=0,
         float_table=0, float_figure=0)
per_paper = {}
for _, r in q.iterrows():
    qa = r["qas"]
    for qi in range(len(qa["question"])):
        c["questions"] += 1
        anns = [a for a in qa["answers"][qi]["answer"] if not a["unanswerable"]]
        if not anns:
            continue
        c["answerable"] += 1
        ev = [e for a in anns for e in a["evidence"]]
        fl = [e for e in ev if e.startswith("FLOAT SELECTED")]
        tx = [e for e in ev if not e.startswith("FLOAT SELECTED")]
        if not ev: c["ev_none"] += 1
        elif fl and not tx:
            c["ev_float_only"] += 1
            per_paper[r["id"]] = per_paper.get(r["id"], 0) + 1
            if any("Table" in e[:30] for e in fl): c["float_table"] += 1
            else: c["float_figure"] += 1
        elif fl: c["ev_mixed"] += 1
        else: c["ev_text_only"] += 1
c["papers_with_float_only_q"] = len(per_paper)
json.dump({"counts": c, "float_only_by_paper": per_paper}, open(OUT, "w"), indent=1)
print(json.dumps(c, indent=1))
