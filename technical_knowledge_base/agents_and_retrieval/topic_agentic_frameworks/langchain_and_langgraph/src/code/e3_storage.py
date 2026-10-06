"""E3: what a checkpointer stores, and how storage grows with the length of an agent run.
An agent-shaped graph with no model: each super-step appends one AI message (a tool call) and one tool
message of about 1,000 characters, like reading a file. 40 super-steps. Stored bytes are read back from the
database after every step. Two state designs: messages with add_messages (the default reducer), and
messages with DeltaChannel (beta in langgraph 1.2), which stores only each step's new messages.
Two savers: SQLite (langgraph-checkpoint-sqlite 3.1.1) and Postgres 16 in Docker (langgraph-checkpoint-postgres 3.1.2)."""
import os, sqlite3, sys, time
from typing import Annotated, TypedDict
from langchain_core.messages import AIMessage, ToolMessage, HumanMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages, _messages_delta_reducer
from langgraph.channels.delta import DeltaChannel
from langgraph.checkpoint.sqlite import SqliteSaver
from common import save, VERSIONS, OUT

N = 40
PG = "postgresql://postgres:flg@127.0.0.1:55432/postgres"
import hashlib
def filler(i):
    """About 1,000 characters of hex text, different for every step (incompressible, like real file contents)."""
    return "".join(hashlib.sha256(f"{i}-{k}".encode()).hexdigest() for k in range(16))[:1000]
FILLER = filler(0)


class Plain(TypedDict):
    messages: Annotated[list, add_messages]
    steps: int


class Delta(TypedDict):
    messages: Annotated[list, DeltaChannel(_messages_delta_reducer)]
    steps: int


def build(State):
    def act(s):
        i = s.get("steps", 0)
        call = AIMessage(content="", tool_calls=[{"name": "read_file", "args": {"path": f"f{i}.py"}, "id": f"c{i}"}])
        return {"messages": [call, ToolMessage(content=filler(i), tool_call_id=f"c{i}")], "steps": i + 1}
    b = StateGraph(State)
    b.add_node("act", act)
    b.add_edge(START, "act")
    b.add_conditional_edges("act", lambda s: END if s["steps"] >= N else "act", ["act", END])
    return b


def sqlite_bytes(conn, thread):
    a = conn.execute("select count(*), coalesce(sum(length(checkpoint)+length(metadata)),0) from checkpoints where thread_id=?", (thread,)).fetchone()
    w = conn.execute("select count(*), coalesce(sum(length(value)),0) from writes where thread_id=?", (thread,)).fetchone()
    return dict(checkpoints=a[0], ckpt_bytes=a[1], writes=w[0], write_bytes=w[1], total=a[1] + w[1])


def pg_bytes(conn, thread):
    q = lambda s: conn.execute(s, (thread,)).fetchone()
    a = q("select count(*), coalesce(sum(octet_length(checkpoint::text)+octet_length(metadata::text)),0) from checkpoints where thread_id=%s")
    b = q("select count(*), coalesce(sum(octet_length(blob)),0) from checkpoint_blobs where thread_id=%s")
    w = q("select count(*), coalesce(sum(octet_length(blob)),0) from checkpoint_writes where thread_id=%s")
    return dict(checkpoints=a[0], ckpt_bytes=a[1], blobs=b[0], blob_bytes=b[1], writes=w[0], write_bytes=w[1], total=a[1] + b[1] + w[1])


def run(kind, State, saver, measure, conn):
    g = build(State).compile(checkpointer=saver)
    thread = f"{kind}-{State.__name__}-{int(time.time()*1000)}"
    cfg = {"configurable": {"thread_id": thread}}
    series = []
    t = time.perf_counter()
    for ev in g.stream({"messages": [HumanMessage("Fix the failing tests.")], "steps": 0}, cfg, stream_mode="updates", durability="sync"):
        series.append(measure(conn, thread)["total"])
    el = time.perf_counter() - t
    final = measure(conn, thread)
    t = time.perf_counter(); st = g.get_state(cfg); load = time.perf_counter() - t
    return dict(saver=kind, state=State.__name__, steps=N, messages=len(st.values["messages"]),
                series=series, final=final, run_secs=round(el, 3), get_state_ms=round(load * 1000, 2))


if __name__ == "__main__":
    res = dict(versions=VERSIONS, n=N, filler_chars=len(FILLER), runs=[], schema={})
    db = os.path.join(OUT, "e3.db")
    if os.path.exists(db):
        os.remove(db)
    conn = sqlite3.connect(db, check_same_thread=False)
    saver = SqliteSaver(conn)
    for State in (Plain, Delta):
        r = run("sqlite", State, saver, sqlite_bytes, conn); res["runs"].append(r); print(r["saver"], r["state"], r["final"], r["get_state_ms"])
    res["schema"]["sqlite"] = [row[0] for row in conn.execute("select sql from sqlite_master where type='table'")]
    if "--pg" in sys.argv:
        import psycopg
        from psycopg.rows import tuple_row
        from langgraph.checkpoint.postgres import PostgresSaver
        with psycopg.connect(PG, autocommit=True, row_factory=tuple_row) as pc:
            from psycopg.rows import dict_row
            with psycopg.connect(PG, autocommit=True, prepare_threshold=0, row_factory=dict_row) as sc:
                ps = PostgresSaver(sc); ps.setup()
                for State in (Plain, Delta):
                    r = run("postgres", State, ps, pg_bytes, pc); res["runs"].append(r); print(r["saver"], r["state"], r["final"], r["get_state_ms"])
            res["schema"]["postgres"] = [r[0] for r in pc.execute("select table_name from information_schema.tables where table_schema='public' order by 1")]
            res["schema"]["postgres_migrations"] = pc.execute("select count(*) from checkpoint_migrations").fetchone()[0]
    save("e3_storage.json", res)
