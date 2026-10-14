"""Text-to-SQL set for the page: 100 questions from the Spider 1.0 dev split (1,034 questions over 20 SQLite databases;
CC BY-SA 4.0), 5 per database (4 for real_estate_properties, which has 4; the spare one goes to world_1), drawn with
seed 0. For each: the gold SQL, the tables it reads (sqlglot 30.22.0), its gold result executed on SQLite, and the
schema text a prompt would carry (CREATE TABLE statements from sqlite_master, as most text-to-SQL prompts do), with
Qwen3 token counts: its own database, and all 20 databases dumped together (the "no schema retrieval" setting).
Also, for aggregate questions (COUNT, SUM, AVG, MIN, MAX, GROUP BY), how many rows the answer depends on (the gold query's
FROM, JOIN and WHERE with the select list replaced by COUNT(*)): the "just use SQL" argument against retrieving rows.
Spider files: $RAG_SCRATCH/gr/dl/spider/x/spider_data (dev.json identical to xlangai/spider validation, 1,034 of 1,034).
Run with the graph env: $RAG_SCRATCH/gr/venv/bin/python -I -B s_sql_sample.py
"""
import json
import os
import random
import sqlite3
import sys
from collections import defaultdict

import sqlglot
from sqlglot import exp
from tokenizers import Tokenizer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, save, work  # noqa: E402

SP = L.path("gr", "dl", "spider", "x", "spider_data")
tok = Tokenizer.from_file(os.path.join(L.path("models", "Qwen3-Embedding-0.6B"), "tokenizer.json"))
ntok = lambda s: len(tok.encode(s, add_special_tokens=False).ids)  # noqa: E731


def db_path(db):
    return os.path.join(SP, "database", db, db + ".sqlite")


def schema(db):
    con = sqlite3.connect(db_path(db))
    rows = con.execute("select name, sql from sqlite_master where type='table' and sql is not null").fetchall()
    con.close()
    return {n: s.strip() for n, s in rows}


def execute(db, sql):
    con = sqlite3.connect(db_path(db))
    con.text_factory = lambda b: b.decode(errors="replace")
    try:
        return con.execute(sql).fetchall(), None
    except Exception as e:  # noqa: BLE001
        return None, str(e)
    finally:
        con.close()


def tables_of(sql):
    try:
        t = sqlglot.parse_one(sql, read="sqlite")
    except Exception:  # noqa: BLE001
        return None
    return sorted({x.name.lower() for x in t.find_all(exp.Table)})


AGG = (exp.Count, exp.Sum, exp.Avg, exp.Min, exp.Max)


def support_rows(db, sql):
    """rows feeding an aggregate: the outermost SELECT with its projection replaced by COUNT(*), no GROUP/HAVING/ORDER/LIMIT"""
    try:
        t = sqlglot.parse_one(sql, read="sqlite")
    except Exception:  # noqa: BLE001
        return None
    if not isinstance(t, exp.Select) or not (any(t.find_all(*AGG)) or t.args.get("group")):
        return None
    c = t.copy()
    for k in ("group", "having", "order", "limit", "distinct"):
        c.set(k, None)
    c.set("expressions", [exp.Count(this=exp.Star())])
    r, err = execute(db, c.sql(dialect="sqlite"))
    return r[0][0] if r else None


def main():
    dev = json.load(open(os.path.join(SP, "dev.json")))
    by_db = defaultdict(list)
    for i, x in enumerate(dev):
        by_db[x["db_id"]].append(i)
    rnd = random.Random(0)
    pick = []
    for db in sorted(by_db):
        idx = by_db[db][:]
        rnd.shuffle(idx)
        pick += idx[:5]
    extra = [i for i in by_db["world_1"] if i not in pick]
    rnd.shuffle(extra)
    pick += extra[:100 - len(pick)]
    pick = sorted(pick)
    schemas = {db: schema(db) for db in sorted(by_db)}
    all_dump = "\n\n".join("-- database " + db + "\n" + "\n".join(s.values()) for db, s in schemas.items())
    rows = []
    for i in pick:
        x = dev[i]
        db = x["db_id"]
        res, err = execute(db, x["query"])
        own = "\n".join(schemas[db].values())
        rows.append({"i": i, "db": db, "question": x["question"], "gold": x["query"], "tables": tables_of(x["query"]),
                     "gold_rows": len(res) if res is not None else None, "gold_err": err,
                     "gold_preview": [list(map(str, r))[:4] for r in (res or [])[:3]],
                     "support_rows": support_rows(db, x["query"]),
                     "schema_tokens_own": ntok(own)})
    meta = {"dev_questions": len(dev), "databases": len(by_db), "tables": sum(len(s) for s in schemas.values()),
            "sample": len(rows), "schema_tokens_all20": ntok(all_dump),
            "schema_tokens_own_median": sorted(r["schema_tokens_own"] for r in rows)[len(rows) // 2],
            "gold_errors": sum(1 for r in rows if r["gold_err"]),
            "aggregate_q": sum(1 for r in rows if r["support_rows"] is not None),
            "aggregate_over_10_rows": sum(1 for r in rows if (r["support_rows"] or 0) > 10),
            "aggregate_over_20_rows": sum(1 for r in rows if (r["support_rows"] or 0) > 20)}
    json.dump({"schemas": schemas}, open(work("spider_schemas.json"), "w"))
    save("spider_schema.json", schemas)  # the CREATE TABLE text the SQL lab shows
    save("sql_set.json", {"meta": meta, "rows": rows})
    print(json.dumps(meta))


if __name__ == "__main__":
    main()
