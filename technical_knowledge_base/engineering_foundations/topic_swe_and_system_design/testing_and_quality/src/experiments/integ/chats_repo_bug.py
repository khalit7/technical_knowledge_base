"""Chat storage for the chat product. Production runs PostgreSQL."""

def create_schema(conn):
    conn.execute("CREATE TABLE chats (id INTEGER PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL)")

def add_chat(conn, chat_id, owner, title):
    conn.execute(_q(conn, "INSERT INTO chats (id, owner, title) VALUES (?, ?, ?)"), (chat_id, owner, title))

def search_chats(conn, owner, text):
    """Chats of this owner whose title contains `text`, ignoring case (the product spec)."""
    rows = conn.execute(_q(conn, "SELECT id FROM chats WHERE owner = ? AND title LIKE ? ORDER BY id"),
                        (owner, f"%{text}%")).fetchall()
    return [r[0] for r in rows]

def _q(conn, sql):
    # sqlite3 uses ? placeholders, psycopg uses %s
    return sql if type(conn).__module__.startswith("sqlite3") else sql.replace("?", "%s")
