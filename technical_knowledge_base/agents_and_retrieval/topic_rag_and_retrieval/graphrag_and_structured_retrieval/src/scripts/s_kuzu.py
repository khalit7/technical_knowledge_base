"""The same database as a property graph: Spider's concert_singer (4 tables) loaded into Kuzu 0.11.3 (an embedded graph
database that speaks Cypher, in process like SQLite). Rows of stadium, singer, concert become nodes; the foreign keys
become relationships (concert -[HELD_AT]-> stadium, singer -[PERFORMED_IN]-> concert, from singer_in_concert).
Four dev questions are answered by hand-written Cypher and checked against the gold SQL's result on SQLite.
The graph schema text written here is the one the pending text-to-Cypher run puts in its prompt.
Run with the graph env: $RAG_SCRATCH/gr/venv/bin/python -I -B s_kuzu.py
"""
import json
import os
import shutil
import sqlite3
import sys
from collections import Counter

import kuzu

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, save, work  # noqa: E402

DB = L.path("gr", "dl", "spider", "x", "spider_data", "database", "concert_singer", "concert_singer.sqlite")
SCHEMA = """Node tables:
  Stadium(stadium_id INT64 primary key, location STRING, name STRING, capacity INT64, highest INT64, lowest INT64, average INT64)
  Singer(singer_id INT64 primary key, name STRING, country STRING, song_name STRING, song_release_year STRING, age INT64, is_male BOOLEAN)
  Concert(concert_id INT64 primary key, concert_name STRING, theme STRING, year STRING)
Relationship tables:
  (:Concert)-[:HELD_AT]->(:Stadium)
  (:Singer)-[:PERFORMED_IN]->(:Concert)"""

HAND = [
    ("How many singers do we have?", "SELECT count(*) FROM singer", "MATCH (s:Singer) RETURN count(s)"),
    ("What are the names of the stadiums without any concerts?",
     "SELECT name FROM stadium WHERE stadium_id NOT IN (SELECT stadium_id FROM concert)",
     "MATCH (st:Stadium) WHERE NOT EXISTS { MATCH (:Concert)-[:HELD_AT]->(st) } RETURN st.name"),
    ("Show the stadium name and the number of concerts in each stadium.",
     "SELECT T2.name, count(*) FROM concert AS T1 JOIN stadium AS T2 ON T1.stadium_id = T2.stadium_id GROUP BY T1.stadium_id",
     "MATCH (c:Concert)-[:HELD_AT]->(st:Stadium) RETURN st.name, count(c)"),
    ("List singer names and number of concerts for each singer.",
     "SELECT T2.name, count(*) FROM singer_in_concert AS T1 JOIN singer AS T2 ON T1.singer_id = T2.singer_id GROUP BY T2.singer_id",
     "MATCH (s:Singer)-[:PERFORMED_IN]->(c:Concert) RETURN s.name, count(c)"),
]


def norm(rows):
    return Counter(tuple(str(x) for x in r) for r in rows)


def main():
    path = work("kuzu_concert.kuzu")
    for f in (path, path + ".wal"):
        shutil.rmtree(f, ignore_errors=True) if os.path.isdir(f) else (os.remove(f) if os.path.exists(f) else None)
    con = kuzu.Connection(kuzu.Database(path))
    con.execute("CREATE NODE TABLE Stadium(stadium_id INT64, location STRING, name STRING, capacity INT64, highest INT64, lowest INT64, average INT64, PRIMARY KEY(stadium_id))")
    con.execute("CREATE NODE TABLE Singer(singer_id INT64, name STRING, country STRING, song_name STRING, song_release_year STRING, age INT64, is_male BOOLEAN, PRIMARY KEY(singer_id))")
    con.execute("CREATE NODE TABLE Concert(concert_id INT64, concert_name STRING, theme STRING, year STRING, PRIMARY KEY(concert_id))")
    con.execute("CREATE REL TABLE HELD_AT(FROM Concert TO Stadium)")
    con.execute("CREATE REL TABLE PERFORMED_IN(FROM Singer TO Concert)")
    sq = sqlite3.connect(DB)
    n = {}
    for r in sq.execute("select * from stadium"):
        con.execute("CREATE (:Stadium {stadium_id:$a, location:$b, name:$c, capacity:$d, highest:$e, lowest:$f, average:$g})", dict(zip("abcdefg", r)))
    for r in sq.execute("select * from singer"):
        con.execute("CREATE (:Singer {singer_id:$a, name:$b, country:$c, song_name:$d, song_release_year:$e, age:$f, is_male:$g})",
                    dict(zip("abcdefg", (r[0], r[1], r[2], r[3], r[4], r[5], r[6] in ("T", 1, "1", True)))))
    for r in sq.execute("select concert_id, concert_name, theme, stadium_id, year from concert"):
        con.execute("CREATE (:Concert {concert_id:$a, concert_name:$b, theme:$c, year:$d})", {"a": r[0], "b": r[1], "c": r[2], "d": r[4]})
        con.execute("MATCH (c:Concert {concert_id:$a}), (s:Stadium {stadium_id:$b}) CREATE (c)-[:HELD_AT]->(s)", {"a": r[0], "b": int(r[3])})
    for r in sq.execute("select concert_id, singer_id from singer_in_concert"):
        con.execute("MATCH (s:Singer {singer_id:$b}), (c:Concert {concert_id:$a}) CREATE (s)-[:PERFORMED_IN]->(c)", {"a": r[0], "b": int(r[1])})
    for t in ("Stadium", "Singer", "Concert"):
        n[t] = con.execute("MATCH (x:%s) RETURN count(x)" % t).get_next()[0]
    n["HELD_AT"] = con.execute("MATCH ()-[r:HELD_AT]->() RETURN count(r)").get_next()[0]
    n["PERFORMED_IN"] = con.execute("MATCH ()-[r:PERFORMED_IN]->() RETURN count(r)").get_next()[0]
    ex = []
    for q, sql, cy in HAND:
        a = sq.execute(sql).fetchall()
        res = con.execute(cy)
        b = []
        while res.has_next():
            b.append(res.get_next())
        ex.append({"q": q, "sql": sql, "cypher": cy, "sql_rows": [list(map(str, r)) for r in a][:6], "cypher_rows": [list(map(str, r)) for r in b][:6],
                   "equal": norm(a) == norm(b)})
        print(q, norm(a) == norm(b), a[:3], b[:3])
    save("kuzu.json", {"counts": n, "schema": SCHEMA, "examples": ex, "kuzu": kuzu.__version__})


if __name__ == "__main__":
    main()
