"""Right to be forgotten: does DELETE remove the bytes? (pgvector 0.8.7 on PostgreSQL 17, container prd-pg; no timing)
A table of 2,000 SciFact abstracts with bge-small vectors and an HNSW index, plus one constructed row (a fake HR note
with a unique marker, short enough to be stored uncompressed). After each step we CHECKPOINT (so pages reach the
files) and count the marker's bytes in the table's heap file, in the write-ahead log (pg_wal), and the row's vector
bytes (its first 8 float32 numbers) in the HNSW index file. Output: data/purge_pg.json"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import psycopg
from common import L, save

import time
MARK = "PRDMARK-%d" % int(time.time())  # unique per run, so WAL from earlier runs does not count
corpus, _, _ = L.beir("scifact")
ids, X = L.embeddings("scifact", "bge-small"); X = np.asarray(X, dtype=np.float32)
vec = lambda v: "[" + ",".join("%.7g" % x for x in v) + "]"
c = psycopg.connect("host=127.0.0.1 port=8380 dbname=postgres user=postgres password=prdlocal", autocommit=True, prepare_threshold=None).cursor()
c.execute("DROP TABLE IF EXISTS kb")
c.execute("CREATE TABLE kb (id int PRIMARY KEY, body text, emb vector(384))")
with c.copy("COPY kb FROM STDIN") as cp:
    for i in range(2000):
        cp.write_row((i, L.doc_text(corpus[ids[i]]), vec(X[i])))
secret_vec = X[2000]
c.execute("INSERT INTO kb VALUES (99999, %s, %s::vector)",
          ("Constructed example: employee 4417 performance review, salary band E3, case " + MARK, vec(secret_vec)))
c.execute("CREATE INDEX kb_hnsw ON kb USING hnsw (emb vector_ip_ops)")
stored = np.array([np.float32(float("%.7g" % x)) for x in secret_vec[:8]])  # what the text input parses to
pattern = stored.astype("<f4").tobytes()
# pgvector stores float4 in network order? check both little- and big-endian
pattern_be = stored.astype(">f4").tobytes()


def files():
    heap = c.execute("SELECT pg_relation_filepath('kb')").fetchone()[0]
    idx = c.execute("SELECT pg_relation_filepath('kb_hnsw')").fetchone()[0]
    return heap, idx


def count_in(path, needle):
    # copy the file(s) out of the container and count occurrences of the needle bytes
    out = subprocess.run(["docker", "exec", "prd-pg", "sh", "-c", "cat " + path], capture_output=True).stdout
    return out.count(needle)


def snapshot(step):
    c.execute("CHECKPOINT")
    heap, idx = files()
    pd = "/var/lib/postgresql/data/"
    r = {"step": step, "heap_file": heap.split("/")[-1],
         "heap_marker": count_in(pd + heap + "*", MARK.encode()),
         "heap_vector": count_in(pd + heap + "*", pattern) + count_in(pd + heap + "*", pattern_be),
         "wal_marker": count_in(pd + "pg_wal/0*", MARK.encode()),
         "index_vector": count_in(pd + idx + "*", pattern) + count_in(pd + idx + "*", pattern_be),
         "visible_rows": c.execute("SELECT count(*) FROM kb WHERE body LIKE %s", ("%" + MARK + "%",)).fetchone()[0],
         "found_by_search": c.execute("SELECT count(*) FROM (SELECT id FROM kb ORDER BY emb <#> %s::vector LIMIT 10) t WHERE id = 99999",
                                      (vec(secret_vec),)).fetchone()[0]}
    print(r, flush=True)
    return r


steps = [snapshot("inserted")]
c.execute("DELETE FROM kb WHERE id = 99999"); steps.append(snapshot("after DELETE"))
c.execute("VACUUM kb"); steps.append(snapshot("after VACUUM"))
c.execute("VACUUM FULL kb"); steps.append(snapshot("after VACUUM FULL (table and index rewritten)"))
c.execute("SELECT pg_switch_wal()"); c.execute("CHECKPOINT"); c.execute("CHECKPOINT")
steps.append(snapshot("after WAL switch and two checkpoints"))
save("purge_pg.json", {"marker": MARK, "rows": 2001, "steps": steps,
                       "wal_settings": {k: c.execute("SHOW " + k).fetchone()[0] for k in ("wal_keep_size", "max_wal_size", "min_wal_size", "archive_mode")}})
c.execute("DROP TABLE kb")
