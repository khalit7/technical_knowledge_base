import pytest
from chats_repo import create_schema, add_chat, search_chats

def seed(conn):
    create_schema(conn)
    add_chat(conn, 1, "ada", "Trip planning for Lisbon")
    add_chat(conn, 2, "ada", "trip budget spreadsheet")
    add_chat(conn, 3, "bob", "Trip ideas")

@pytest.mark.parametrize("db", ["sqlite_conn", "pg_conn"])
def test_search_ignores_case(db, request):
    conn = request.getfixturevalue(db)
    seed(conn)
    assert search_chats(conn, "ada", "trip") == [1, 2]
