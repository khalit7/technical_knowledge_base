"""Text-to-SQL against text-to-Cypher on the same data: all 45 Spider dev questions of concert_singer, answered by the
local generator once as SQL (the SQLite schema) and once as Cypher (the property-graph schema of s_kuzu.py, the same
rows loaded into Kuzu 0.11.3). Both are executed and compared with the gold SQL's result (s_sql_run.match: multiset of
rows, ordered when the gold has ORDER BY; lenient = columns in any order).
usage (graph env): $RAG_SCRATCH/gr/venv/bin/python -I -B s_cypher_run.py run <1.7b|4b>    GENERATOR: bench lock
                   $RAG_SCRATCH/gr/venv/bin/python -I -B s_cypher_run.py summary
"""
import json
import os
import re
import sys

import kuzu

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, generator, load_data, r3, save, work  # noqa: E402
import s_sql_run as SR  # noqa: E402

P_CY = ("Graph database schema (Kuzu, Cypher):\n{schema}\n\nWrite one Cypher query that answers the question. "
        "Reply with the Cypher query only, no explanation.\nQuestion: {q}")


def main():
    a = sys.argv[1:]
    dev = json.load(open(os.path.join(SR.SP, "dev.json")))
    qs = [dict(x, i=i) for i, x in enumerate(dev) if x["db_id"] == "concert_singer"]
    S = SR.schemas()
    cyschema = load_data("kuzu.json")["schema"]
    con = kuzu.Connection(kuzu.Database(work("kuzu_concert.kuzu")))
    G, mkcache = generator()
    offline = a[0] == "summary"
    out = {}
    for model in (["1.7b", "4b"] if offline else [a[1]]):
        cache = mkcache("cypher_" + model)
        res = {"sql": [], "cypher": []}
        for x in qs:
            gold, _ = SR.execute("concert_singer", x["query"])
            row = {"question": x["question"], "db": "concert_singer"}
            r = G.chat(SR.prompt("oracle", row, S, None), cache, model, max_tokens=256, tag="sql", offline=offline)
            if r is None:
                break
            _, sql = SR.parse(r["text"], "oracle", row, S)
            pred, err = SR.execute("concert_singer", sql)
            st, le = SR.match(x["query"], gold, pred)
            res["sql"].append({"i": x["i"], "q": x["question"], "query": sql[:300], "strict": st, "lenient": le, "err": err})
            r = G.chat(P_CY.format(schema=cyschema, q=x["question"]), cache, model, max_tokens=256, tag="cypher", offline=offline)
            if r is None:
                break
            t = r["text"].strip()
            m = re.search(r"```(?:cypher)?\s*(.*?)```", t, re.S)
            cy = (m.group(1) if m else t).strip().rstrip(";")
            try:
                rr = con.execute(cy); pred = []
                while rr.has_next():
                    pred.append(tuple(rr.get_next()))
                err = None
            except Exception as e:  # noqa: BLE001
                pred, err = None, str(e)[:120]
            st, le = SR.match(x["query"], gold, pred)
            res["cypher"].append({"i": x["i"], "q": x["question"], "query": cy[:300], "strict": st, "lenient": le, "err": err})
        if len(res["cypher"]) < len(qs):
            print(model, "incomplete", len(res["cypher"])); continue
        out[model] = {k: {"ex": sum(r["strict"] for r in v), "ex_lenient": sum(r["lenient"] for r in v), "runs": sum(r["err"] is None for r in v),
                          "n": len(v), "rows": v} for k, v in res.items()}
        print(model, {k: {kk: vv for kk, vv in v.items() if kk != "rows"} for k, v in out[model].items()})
    if offline and out:
        save("cypher_runs.json", out)


if __name__ == "__main__":
    main()
