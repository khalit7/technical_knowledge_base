import sqlite3, tempfile, time
import pytest, psycopg, pgserver

TIMES = {}

@pytest.fixture
def sqlite_conn():
    conn = sqlite3.connect(":memory:")       # what many test suites use as a stand-in for the real database
    yield conn
    conn.close()

@pytest.fixture(scope="session")
def pg_server():
    t0 = time.perf_counter()
    srv = pgserver.get_server(tempfile.mkdtemp(prefix="pgtest"), cleanup_mode="stop")  # real PostgreSQL binaries from a pip wheel
    TIMES["pg_start_s"] = time.perf_counter() - t0
    yield srv

@pytest.fixture
def pg_conn(pg_server):
    with psycopg.connect(pg_server.get_uri(), autocommit=False) as conn:
        yield conn
        conn.rollback()                      # each test's writes vanish: tests stay independent

def pytest_sessionfinish(session):
    import json; json.dump(TIMES, open("pg_times.json", "w"))
