import time, json, statistics, pytest
from chats_repo import create_schema, add_chat, search_chats
from test_search import seed
T = {"sqlite_conn": [], "pg_conn": []}

@pytest.mark.parametrize("i", range(50))
@pytest.mark.parametrize("db", ["sqlite_conn", "pg_conn"])
def test_timed(db, i, request):
    conn = request.getfixturevalue(db)          # server already running after the first pg test
    t0 = time.perf_counter()
    seed(conn)
    assert search_chats(conn, "ada", "trip") == [1, 2]
    T[db].append(time.perf_counter() - t0)

def test_zz_report(pg_conn):
    ver = pg_conn.execute("show server_version").fetchone()[0]
    out = {k: {"median_ms": round(statistics.median(v) * 1000, 3), "n": len(v)} for k, v in T.items()}
    out["postgres"] = ver
    json.dump(out, open("timing.json", "w"), indent=1)
