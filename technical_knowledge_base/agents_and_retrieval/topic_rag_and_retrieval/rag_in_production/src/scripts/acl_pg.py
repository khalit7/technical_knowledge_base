"""Access control enforced at retrieval, in a real database: pgvector 0.8.7 on PostgreSQL 17 (Docker, container
prd-pg on 127.0.0.1:8380), SciFact's 5,183 abstracts with bge-small vectors (precomputed by the setup), one
constructed group per abstract (acl_groups.py), a row-level-security policy, and the 300 test claims asked as
each user. No timing (no lock needed). Output: data/acl_pg.json

Modes (per user, per query, top 10):
  unfiltered        the shared index with no access check (what a prompt-level rule would receive)
  rls_planner       RLS policy, a fresh plan for every query (the planner picks HNSW or the group index)
  rls_prepared      RLS policy on one long-lived connection with psycopg's default prepared statements: the plan made
                    for an earlier user's groups is reused for the next user
  rls_hnsw          RLS policy, HNSW forced (seqscan, bitmap scans and sorts off), ef_search 40, iterative scans off
  rls_hnsw_relaxed  same with hnsw.iterative_scan = relaxed_order (pgvector 0.8)
  rls_hnsw_strict   same with hnsw.iterative_scan = strict_order
  rls_exact         RLS with the index disabled (sequential scan + sort: exact, the pre-filter answer)
  owner             the table owner, RLS enabled but not forced: owners bypass policies
  owner_forced      the same after ALTER TABLE ... FORCE ROW LEVEL SECURITY
Recall = share of the exact top 10 among the rows that user may read.
prepare_threshold=None: psycopg otherwise prepares a repeated query after 5 runs and PostgreSQL keeps its cached plan
across SET enable_indexscan, which silently kept the index plan in the exact mode on a first run."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import psycopg
from acl_groups import GROUPS, USERS, group_of
from common import L, loadavg, save

DSN = "host=127.0.0.1 port=8380 dbname=postgres user=%s password=%s"
corpus, queries, qrels = L.beir("scifact")
ids, X = L.embeddings("scifact", "bge-small")
X = np.asarray(X, dtype=np.float32)
qids, Q = L.embeddings("scifact", "bge-small", "queries")
qpos = {q: i for i, q in enumerate(qids)}
test = sorted(qrels["test"], key=int)
grp = np.array([group_of(d) for d in ids])
vec = lambda v: "[" + ",".join("%.7g" % x for x in v) + "]"

su = psycopg.connect(DSN % ("postgres", "prdlocal"), autocommit=True, prepare_threshold=None)
c = su.cursor()
c.execute("CREATE EXTENSION IF NOT EXISTS vector")
for r in ("app_user", "app_owner"):
    c.execute("DROP OWNED BY %s CASCADE" % r) if c.execute("SELECT 1 FROM pg_roles WHERE rolname=%s", (r,)).fetchone() else None
c.execute("DROP TABLE IF EXISTS docs")
c.execute("DROP ROLE IF EXISTS app_user"); c.execute("DROP ROLE IF EXISTS app_owner")
c.execute("CREATE ROLE app_owner LOGIN PASSWORD 'owner'")
c.execute("CREATE ROLE app_user LOGIN PASSWORD 'user'")
c.execute("CREATE TABLE docs (id text PRIMARY KEY, grp text NOT NULL, body text, emb vector(384))")
with c.copy("COPY docs (id, grp, body, emb) FROM STDIN") as cp:
    for i, d in enumerate(ids):
        cp.write_row((d, grp[i], L.doc_text(corpus[d]), vec(X[i])))
c.execute("CREATE INDEX ON docs USING hnsw (emb vector_ip_ops)")
c.execute("CREATE INDEX ON docs (grp)")
c.execute("ANALYZE docs")
c.execute("ALTER TABLE docs OWNER TO app_owner")
c.execute("GRANT SELECT ON docs TO app_user")
c.execute("ALTER TABLE docs ENABLE ROW LEVEL SECURITY")
POLICY = ("CREATE POLICY read_own_groups ON docs FOR SELECT "
          "USING (grp = ANY (string_to_array(current_setting('app.groups', true), ',')))")
c.execute(POLICY)
info = {"pg": c.execute("SELECT version()").fetchone()[0].split(" on ")[0],
        "pgvector": c.execute("SELECT extversion FROM pg_extension WHERE extname='vector'").fetchone()[0],
        "policy": POLICY, "n_docs": len(ids),
        "group_share": {g: int((grp == g).sum()) for g, _ in GROUPS}}
print(info)

conn = {"app_user": psycopg.connect(DSN % ("app_user", "user"), autocommit=True, prepare_threshold=None),
        "app_user_prep": psycopg.connect(DSN % ("app_user", "user"), autocommit=True),  # psycopg default: prepare after 5 runs
        "app_owner": psycopg.connect(DSN % ("app_owner", "owner"), autocommit=True, prepare_threshold=None)}
SQL = "SELECT id FROM docs ORDER BY emb <#> %s::vector LIMIT 10"


def ask(role, groups, qv, settings=()):
    cur = conn[role].cursor()
    cur.execute("SELECT set_config('app.groups', %s, false)", (",".join(groups),))
    for s in settings:
        cur.execute(s)
    return [r[0] for r in cur.execute(SQL, (vec(qv),)).fetchall()]


def reset(role):
    cur = conn[role].cursor()
    for s in ("RESET hnsw.iterative_scan", "RESET enable_indexscan", "RESET enable_bitmapscan", "RESET enable_seqscan", "RESET enable_sort", "RESET hnsw.ef_search"):
        cur.execute(s)


FORCE_IDX = ("SET enable_seqscan = off", "SET enable_bitmapscan = off", "SET enable_sort = off")
MODES = {"unfiltered": ("su", ()),
         "rls_planner": ("app_user", ()),
         "rls_prepared": ("app_user_prep", ()),
         "rls_hnsw": ("app_user", FORCE_IDX),
         "rls_hnsw_relaxed": ("app_user", FORCE_IDX + ("SET hnsw.iterative_scan = relaxed_order",)),
         "rls_hnsw_strict": ("app_user", FORCE_IDX + ("SET hnsw.iterative_scan = strict_order",)),
         "rls_exact": ("app_user", ("SET enable_indexscan = off", "SET enable_bitmapscan = off")),
         "owner": ("app_owner", ())}
res = {"info": info, "users": {}, "loadavg_start": loadavg()}
plans = {}
for u, gs in USERS.items():
    allowed = np.isin(grp, gs)
    ur = {"groups": gs, "share": round(float(allowed.mean()), 4), "modes": {}}
    for mode, (role, sets) in MODES.items():
        rows, leaks, rec, short, empty = [], 0, [], 0, 0
        for q in test:
            qv = Q[qpos[q]]
            if role == "su":
                cur = su.cursor()
                got = [r[0] for r in cur.execute(SQL, (vec(qv),)).fetchall()]
            else:
                got = ask(role, gs, qv, sets)
                reset(role)
            s = X @ qv
            s[~allowed] = -9
            truth = set(ids[j] for j in np.argsort(-s)[:10])
            gi = [ids.index(d) for d in got]
            leaks += sum(1 for j in gi if not allowed[j])
            rec.append(len(truth & set(got)) / 10)
            rows.append(len(got)); short += len(got) < 10; empty += len(got) == 0
        ur["modes"][mode] = {"rows_mean": round(float(np.mean(rows)), 2), "queries_short": short, "queries_empty": empty,
                             "leaked_rows": leaks, "leaked_per_query": round(leaks / len(test), 2), "recall10": round(float(np.mean(rec)), 4)}
        print(u, mode, ur["modes"][mode], flush=True)
    res["users"][u] = ur
    cur = conn["app_user"].cursor()
    cur.execute("SELECT set_config('app.groups', %s, false)", (",".join(gs),))
    plans[u] = [r[0] for r in cur.execute("EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) " + SQL, (vec(Q[qpos[test[0]]]),)).fetchall()]
    pc = conn["app_user_prep"].cursor()
    pc.execute("SELECT set_config('app.groups', %s, false)", (",".join(gs),))
    pc.execute("PREPARE p1(vector) AS " + SQL.replace("%s::vector", "$1")); pc.execute("SET plan_cache_mode = force_generic_plan")
    plans[u + "_generic"] = [r[0] for r in pc.execute("EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) EXECUTE p1('%s'::vector)" % vec(Q[qpos[test[0]]])).fetchall()]
    pc.execute("DEALLOCATE p1"); pc.execute("RESET plan_cache_mode")
# FORCE: the owner is now subject to the policy
c.execute("ALTER TABLE docs FORCE ROW LEVEL SECURITY")
for u, gs in USERS.items():
    allowed = np.isin(grp, gs); leaks = 0
    for q in test:
        got = ask("app_owner", gs, Q[qpos[q]])
        leaks += sum(1 for d in got if not allowed[ids.index(d)])
    res["users"][u]["modes"]["owner_forced"] = {"leaked_rows": leaks}
    print(u, "owner_forced leaks", leaks)
# a user who can run SQL can change the setting: the policy trusts whoever sets app.groups
cur = conn["app_user"].cursor()
cur.execute("SELECT set_config('app.groups', 'hr', false)")
res["user_can_set_groups"] = cur.execute("SELECT count(*) FROM docs").fetchone()[0]
import re
res["plans"] = {k: [re.sub(r"'\[[^\]]*\]'", "'[...]'", l) for l in v] for k, v in plans.items()}
res["loadavg_end"] = loadavg()
save("acl_pg.json", res)
