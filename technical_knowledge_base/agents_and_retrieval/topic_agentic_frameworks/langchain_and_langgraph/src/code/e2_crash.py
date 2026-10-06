"""E2: crash in the middle of a parallel super-step, under each durability mode, with a SQLite checkpointer.
Graph: read_and_test -> {check_tokenize (fast, 0.5 s), check_top_words (slow, 6 s)} -> merge.
Every node appends a line to a side-effect log (ran <node> <pid> <t>), so we see which nodes ran in which process.
Driver: start in a child process, SIGKILL it 3 s after the parallel step starts (fast branch done, slow in flight),
then resume in a fresh process with invoke(None). Also: an exception instead of a kill, and the overhead of each mode.
Usage: e2_crash.py child <db> <thread> <durability> <log> [start|resume]   (internal)
       e2_crash.py drive"""
import json, operator, os, signal, sqlite3, subprocess, sys, time
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver
from common import save, VERSIONS, OUT, dump_raw

T0 = float(os.environ.get("T0", time.time()))


class S(TypedDict, total=False):
    test_output: str
    findings: Annotated[list, operator.add]
    report: str


def mk(log, fail_flag=None):
    def mark(n):
        with open(log, "a") as f:
            f.write(json.dumps(dict(node=n, pid=os.getpid(), t=round(time.time() - T0, 2))) + "\n")

    def read_and_test(s):
        mark("read_and_test"); return {"test_output": "2 failed"}

    def check_tokenize(s):
        time.sleep(0.5); mark("check_tokenize"); return {"findings": ["tokenize drops apostrophes"]}

    def check_top_words(s):
        time.sleep(6)
        if fail_flag and os.path.exists(fail_flag):
            os.remove(fail_flag); mark("check_top_words FAILED"); raise RuntimeError("provider timeout (simulated)")
        mark("check_top_words"); return {"findings": ["top_words ties unsorted"]}

    def merge(s):
        mark("merge"); return {"report": f"{len(s['findings'])} findings"}

    b = StateGraph(S)
    for f in (read_and_test, check_tokenize, check_top_words, merge):
        b.add_node(f.__name__, f)
    b.add_edge(START, "read_and_test")
    b.add_edge("read_and_test", "check_tokenize"); b.add_edge("read_and_test", "check_top_words")
    b.add_edge(["check_tokenize", "check_top_words"], "merge"); b.add_edge("merge", END)
    return b


def child(db, thread, dur, log, what, fail_flag=None):
    conn = sqlite3.connect(db, check_same_thread=False)
    g = mk(log, fail_flag).compile(checkpointer=SqliteSaver(conn))
    cfg = {"configurable": {"thread_id": thread}}
    try:
        out = g.invoke({} if what == "start" else None, cfg, durability=dur)
        print(json.dumps(dict(ok=True, out=out)))
    except Exception as e:
        print(json.dumps(dict(ok=False, err=f"{type(e).__name__}: {e}")))


def counts(db, thread):
    c = sqlite3.connect(db)
    n = c.execute("select count(*) from checkpoints where thread_id=?", (thread,)).fetchone()[0]
    w = c.execute("select count(*) from writes where thread_id=?", (thread,)).fetchone()[0]
    c.close()
    return n, w


def ran(log):
    return [json.loads(l) for l in open(log)] if os.path.exists(log) else []


def scenario(dur, kind):
    tag = f"{kind}_{dur}"
    db, log = os.path.join(OUT, f"e2_{tag}.db"), os.path.join(OUT, f"e2_{tag}.log")
    flag = os.path.join(OUT, f"e2_{tag}.flag")
    for p in (db, log, flag):
        if os.path.exists(p):
            os.remove(p)
    env = dict(os.environ, T0=str(time.time()))
    py = [sys.executable, __file__, "child", db, tag, dur, log]
    res = dict(durability=dur, kind=kind, processes=[])
    if kind == "kill":
        p = subprocess.Popen(py + ["start"], env=env, stdout=subprocess.PIPE, text=True)
        while not any(r["node"] == "read_and_test" for r in ran(log)):
            time.sleep(0.05)
        time.sleep(3.0)
        p.send_signal(signal.SIGKILL); p.wait()
        res["processes"].append(dict(cmd="start", killed_at=round(time.time() - float(env["T0"]), 2), stdout=None))
    else:
        open(flag, "w").close()
        out = subprocess.run(py + ["start", flag], env=env, capture_output=True, text=True).stdout.strip()
        res["processes"].append(dict(cmd="start", stdout=json.loads(out.splitlines()[-1])))
    res["after_first"] = dict(zip(("checkpoints", "writes"), counts(db, tag)))
    conn = sqlite3.connect(db, check_same_thread=False)
    res["raw_after_first"] = dump_raw(SqliteSaver(conn), tag); conn.close()
    out = subprocess.run(py + ["resume"], env=env, capture_output=True, text=True).stdout.strip()
    res["processes"].append(dict(cmd="resume", stdout=json.loads(out.splitlines()[-1]) if out else None))
    res["after_resume"] = dict(zip(("checkpoints", "writes"), counts(db, tag)))
    res["ran"] = ran(log)
    pids = []
    for r in res["ran"]:
        if r["pid"] not in pids:
            pids.append(r["pid"])
    for r in res["ran"]:
        r["process"] = pids.index(r["pid"]) + 1; del r["pid"]
    print(tag, [(r["node"], r["process"]) for r in res["ran"]], res["after_first"], res["after_resume"])
    return res


class L(TypedDict, total=False):
    n: int


def overhead(dur, saver_kind, steps=200):
    """A one-node loop run `steps` times: time per super-step for each durability mode."""
    b = StateGraph(L)
    b.add_node("inc", lambda s: {"n": s.get("n", 0) + 1})
    b.add_edge(START, "inc")
    b.add_conditional_edges("inc", lambda s: END if s["n"] >= steps else "inc", ["inc", END])
    if saver_kind == "sqlite":
        db = os.path.join(OUT, f"e2_over_{dur}.db")
        if os.path.exists(db):
            os.remove(db)
        conn = sqlite3.connect(db, check_same_thread=False)
        saver = SqliteSaver(conn)
    else:
        from langgraph.checkpoint.memory import InMemorySaver
        saver = InMemorySaver()
    g = b.compile(checkpointer=saver)
    best = None
    for rep in range(3):
        cfg = {"configurable": {"thread_id": f"o{rep}"}}
        t = time.perf_counter(); g.invoke({}, cfg, durability=dur, config=None) if False else g.invoke({}, cfg, durability=dur)
        el = time.perf_counter() - t
        best = el if best is None else min(best, el)
    n = len(list(saver.list({"configurable": {"thread_id": "o0"}})))
    return dict(durability=dur, saver=saver_kind, steps=steps, best_secs=round(best, 4),
                ms_per_step=round(1000 * best / steps, 3), checkpoints_kept=n)


if __name__ == "__main__":
    if sys.argv[1] == "child":
        child(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6], sys.argv[7] if len(sys.argv) > 7 else None)
    else:
        res = dict(versions=VERSIONS, scenarios=[], overhead=[])
        for dur in ("sync", "async", "exit"):
            res["scenarios"].append(scenario(dur, "kill"))
        res["scenarios"].append(scenario("sync", "error"))
        for sk in ("memory", "sqlite"):
            for dur in ("sync", "async", "exit"):
                res["overhead"].append(overhead(dur, sk)); print(res["overhead"][-1])
        save("e2_crash.json", res)
