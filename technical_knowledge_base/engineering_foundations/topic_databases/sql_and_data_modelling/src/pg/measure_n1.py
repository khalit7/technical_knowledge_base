"""The N+1 query problem, measured with SQLAlchemy 2.x on the chat data in PostgreSQL 16.
Task: show the N most recent chats, each with its message count and the start of its last message.
Four ways: lazy loading (the default relationship loader: 1 query, then 1 more per chat), selectinload (2 queries),
joinedload (1 query, wide result), and one hand-written SQL query that aggregates in the database.
Each is timed (median of 30 runs, after 3 warm-ups) directly against the server and through delay_proxy.py, which adds
0.5 ms each way (about 1 ms per round trip, a same-region network), and every SQL statement sent is counted with an event hook.
Writes ../inputs/n1.json. Run from a scratch directory after the other scripts (see pgc.py)."""
import os, sys, time, statistics, subprocess, datetime, platform
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *
import sqlalchemy as sa
from sqlalchemy import select, func, text, event, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, Session, selectinload, joinedload

class Base(DeclarativeBase): pass
class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
class Chat(Base):
    __tablename__ = 'chats'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    title: Mapped[str | None]
    created_at: Mapped[datetime.datetime]
    messages: Mapped[list['Message']] = relationship(order_by='Message.id')
class Message(Base):
    __tablename__ = 'messages'
    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey('chats.id'))
    content: Mapped[str]
    tokens: Mapped[int]

def lazy(s, n):
    chats = s.scalars(select(Chat).order_by(Chat.created_at.desc(), Chat.id).limit(n)).all()
    return [(c.id, len(c.messages), c.messages[-1].content[:20] if c.messages else None) for c in chats]
def selectin(s, n):
    chats = s.scalars(select(Chat).options(selectinload(Chat.messages)).order_by(Chat.created_at.desc(), Chat.id).limit(n)).all()
    return [(c.id, len(c.messages), c.messages[-1].content[:20] if c.messages else None) for c in chats]
def joined(s, n):
    chats = s.scalars(select(Chat).options(joinedload(Chat.messages)).order_by(Chat.created_at.desc(), Chat.id).limit(n)).unique().all()
    return [(c.id, len(c.messages), c.messages[-1].content[:20] if c.messages else None) for c in chats]
RAW = text("""SELECT c.id, count(m.id) AS n,
       (SELECT left(l.content, 20) FROM messages l WHERE l.chat_id = c.id ORDER BY l.id DESC LIMIT 1) AS last
FROM (SELECT id, created_at FROM chats ORDER BY created_at DESC, id LIMIT :n) c
LEFT JOIN messages m ON m.chat_id = c.id
GROUP BY c.id, c.created_at
ORDER BY c.created_at DESC, c.id""")
def raw(s, n):
    return [tuple(r) for r in s.execute(RAW, {'n': n}).all()]
WAYS = {'lazy': lazy, 'selectinload': selectin, 'joinedload': joined, 'one_sql': raw}

def bench(port, n, reps=30):
    eng = sa.create_engine(f'postgresql+psycopg://postgres@127.0.0.1:{port}/chat', pool_size=1)
    count = {'q': 0}; stmts = []
    @event.listens_for(eng, 'before_cursor_execute')
    def _c(conn, cur, st, params, ctx, many):
        count['q'] += 1; stmts.append(st)
    out = {}; ref = None
    for name, f in WAYS.items():
        ts = []
        for i in range(reps + 3):
            with Session(eng) as s:
                count['q'] = 0; del stmts[:]
                t = time.perf_counter(); r = f(s, n); dt = time.perf_counter() - t
            if i >= 3: ts.append(dt)
        if ref is None: ref = r
        assert r == ref, name
        out[name] = {'queries': count['q'], 'median_ms': round(statistics.median(ts) * 1000, 3),
                     'p10_ms': round(sorted(ts)[len(ts) // 10] * 1000, 3), 'p90_ms': round(sorted(ts)[len(ts) * 9 // 10] * 1000, 3),
                     'first_sql': stmts[0][:600], 'second_sql': stmts[1][:600] if len(stmts) > 1 else None}
    # round trip of a trivial query on this path
    with eng.connect() as c:
        rt = []
        for i in range(50):
            t = time.perf_counter(); c.execute(text('SELECT 1')); rt.append(time.perf_counter() - t)
    eng.dispose()
    return out, round(statistics.median(rt) * 1000, 3)

if __name__ == '__main__':
    start()
    with conn('chat') as c: ver = c.execute('SHOW server_version').fetchone()[0]
    with conn('chat') as c:  # the foreign-key index section 2 recommends; without it every lazy load scans all messages
        c.execute('CREATE INDEX IF NOT EXISTS messages_chat_id ON messages (chat_id)'); c.execute('ANALYZE messages')
    px = subprocess.Popen([sys.executable, os.path.join(HERE, 'delay_proxy.py'), '54352', str(PORT), '0.5'])
    time.sleep(1.0)
    res = []
    try:
        for path, port in (('direct', PORT), ('proxy_1ms', 54352)):
            for n in (10, 50, 200):
                r, rtt = bench(port, n)
                res.append({'path': path, 'n': n, 'select1_ms': rtt, 'ways': r}); print(path, n, rtt, {k: (v['queries'], v['median_ms']) for k, v in r.items()}, flush=True)
    finally:
        px.terminate()
    save('n1.json', {'date': datetime.date.today().isoformat(), 'postgres': ver, 'sqlalchemy': sa.__version__, 'psycopg': psycopg.__version__,
                     'machine': platform.machine() + ' ' + platform.platform(), 'raw_sql': str(RAW), 'runs': res})
