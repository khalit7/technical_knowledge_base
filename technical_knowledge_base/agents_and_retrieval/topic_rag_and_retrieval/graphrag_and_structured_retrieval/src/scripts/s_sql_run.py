"""Text-to-SQL with the local generator on the 100 Spider dev questions of sql_set.json, four ways (same questions):
  none       the question only: the model must guess table and column names (the "before")
  all20      the CREATE TABLE statements of all 20 dev databases (81 tables) dumped in the prompt; the model names the database
  retrieved  the top 5 tables by bge-small (schema_ret.json) with their database names; the model names the database
  oracle     the CREATE TABLE statements of the question's own database (the standard Spider setting)
The schema comes first and the question last, so llama-server's prompt cache reuses the schema prefix (n_in_new records it).
Execution accuracy: the predicted SQL is run on the database the model named (none and oracle: the gold database) and its
result compared with the gold SQL's result as a multiset of rows (as an ordered list when the gold query has ORDER BY),
values compared as strings with floats rounded to 4 places; a lenient variant also accepts the same rows with columns
in another order. Spider's official evaluation (test-suite-sql-eval) also permutes columns; it is not run here.
usage (graph env): $RAG_SCRATCH/gr/venv/bin/python -I -B s_sql_run.py run <1.7b|4b> [condition ...]   GENERATOR: bench lock
                   $RAG_SCRATCH/gr/venv/bin/python -I -B s_sql_run.py summary                         from the caches
"""
import json
import os
import re
import sqlite3
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, generator, load_data, r3, save, work  # noqa: E402

COND = ["none", "all20", "retrieved", "oracle"]
SP = L.path("gr", "dl", "spider", "x", "spider_data")
RULE = "Reply with the SQL query only, no explanation."
P_NONE = "Write one SQLite query that answers the question. " + RULE + "\nQuestion: {q}"
P_ORACLE = "SQLite database schema:\n{schema}\n\nWrite one SQLite query that answers the question. " + RULE + "\nQuestion: {q}"
P_MULTI = ("SQLite tables from several databases (each table is listed under its database):\n{schema}\n\n"
           "Write one SQLite query that answers the question, using tables of one database only. Reply in exactly two parts: "
           "first line 'Database: <name>', then the SQL query, no explanation.\nQuestion: {q}")


def schemas():
    return json.load(open(work("spider_schemas.json")))["schemas"]


def prompt(cond, row, S, ret):
    q = row["question"]
    if cond == "none":
        return P_NONE.format(q=q)
    if cond == "oracle":
        return P_ORACLE.format(schema="\n".join(S[row["db"]].values()), q=q)
    if cond == "all20":
        sch = "\n\n".join("-- database " + db + "\n" + "\n".join(t.values()) for db, t in sorted(S.items()))
        return P_MULTI.format(schema=sch, q=q)
    top = ret[row["i"]]
    by_db = {}
    for db, t in top:
        name = next(n for n in S[db] if n.lower() == t)
        by_db.setdefault(db, []).append(S[db][name])
    sch = "\n\n".join("-- database " + db + "\n" + "\n".join(v) for db, v in by_db.items())
    return P_MULTI.format(schema=sch, q=q)


def parse(text, cond, row, S):
    t = text.strip()
    db = row["db"]
    if cond in ("all20", "retrieved"):
        m = re.search(r"(?i)database\s*:\s*`?([A-Za-z0-9_]+)", t)
        db = m.group(1) if m and m.group(1) in S else None
        t = re.sub(r"(?im)^\s*database\s*:.*$", "", t)
    m = re.search(r"```(?:sql|sqlite)?\s*(.*?)```", t, re.S)
    sql = (m.group(1) if m else t).strip().rstrip(";").strip()
    return db, sql


def execute(db, sql):
    con = sqlite3.connect(os.path.join(SP, "database", db, db + ".sqlite"))
    con.text_factory = lambda b: b.decode(errors="replace")
    try:
        return con.execute(sql).fetchall(), None
    except Exception as e:  # noqa: BLE001
        return None, str(e)[:120]
    finally:
        con.close()


def canon(rows):
    return [tuple(("%.4f" % v) if isinstance(v, float) else str(v) for v in r) for r in rows]


def match(gold_sql, gold, pred):
    if pred is None:
        return False, False
    g, p = canon(gold), canon(pred)
    strict = (g == p) if re.search(r"(?i)order\s+by", gold_sql) else Counter(g) == Counter(p)
    lenient = strict or Counter(tuple(sorted(r)) for r in g) == Counter(tuple(sorted(r)) for r in p)
    return strict, lenient


def main():
    a = sys.argv[1:]
    S = schemas()
    rows = load_data("sql_set.json")["rows"]
    ret = {r["i"]: [tuple(x) for x in r["top5_bge"]] for r in load_data("schema_ret.json")["per_q"]}
    G, mkcache = generator()
    offline = a[0] == "summary"
    models = ["1.7b", "4b"] if offline else [a[1]]
    conds = (a[2:] if len(a) > 2 else COND) if not offline else COND
    out = {}
    for model in models:
        cache = mkcache("sql_" + model)
        for cond in conds:
            res = []
            for row in rows:
                r = G.chat(prompt(cond, row, S, ret), cache, model, max_tokens=256, tag="sql_" + cond, offline=offline)
                if r is None:
                    break
                db, sql = parse(r["text"], cond, row, S)
                gold, _ = execute(row["db"], row["gold"])
                pred, err = execute(db, sql) if db else (None, "no database named")
                st, le = match(row["gold"], gold, pred)
                res.append({"i": row["i"], "db_ok": db == row["db"], "exec_ok": err is None, "strict": st, "lenient": le,
                            "sql": sql[:400], "err": err, "tok": r["n_in"], "new": r["n_in_new"], "s": r["seconds"]})
            if len(res) < len(rows):
                print(model, cond, "incomplete", len(res)); continue
            n = len(res)
            out.setdefault(model, {})[cond] = {"ex": sum(x["strict"] for x in res), "ex_lenient": sum(x["lenient"] for x in res),
                                               "runs": sum(x["exec_ok"] for x in res), "db_ok": sum(x["db_ok"] for x in res), "n": n,
                                               "tok_in": round(sum(x["tok"] for x in res) / n), "tok_new": round(sum((x["new"] or 0) for x in res) / n),
                                               "gen_s": r3(sum(x["s"] for x in res) / n), "rows": res}
            print(model, cond, {k: v for k, v in out[model][cond].items() if k != "rows"})
    if offline and out:
        save("sql_runs.json", out)


if __name__ == "__main__":
    main()
