"""Durable execution with LangGraph: the chaining workflow as a StateGraph with a SQLite
checkpointer, a human approval interrupt, and time travel.
Usage (venv python):
  lg_durable.py start T      run from the beginning on thread T
  lg_durable.py resume T     continue thread T from its last checkpoint
  lg_durable.py approve T    answer the interrupt with approve and finish
  lg_durable.py fork T CKPT  go back to checkpoint CKPT, edit the diagnosis, run again
  lg_durable.py dump T       write every checkpoint of T to checkpoints_T.json"""
import sys, os, json, time, sqlite3, subprocess, difflib
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.sqlite import SqliteSaver

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib  # noqa: E402

WORK = os.path.join(HERE, "work", "lg")
EVENTS = os.path.join(lib.REC, "langgraph", os.environ.get("EV", "events.jsonl"))
os.makedirs(os.path.dirname(EVENTS), exist_ok=True)
SYS = "You are a careful Python engineer. Follow the requested output format exactly."
TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."


def log(**kw):
    kw["t"] = round(time.time(), 3)
    kw["pid"] = os.getpid()
    with open(EVENTS, "a") as f:
        f.write(json.dumps(kw) + "\n")


class S(TypedDict, total=False):
    core: str
    tests: str
    test_output: str
    diagnosis: str
    patch: str
    decision: str
    passed: bool
    hidden: list


_clock = lib.Clock()


def llm(label, prompt):
    if os.environ.get("FAKE"):
        time.sleep(float(os.environ.get("FAKE")))
        return "1. fake\n```python\n" + lib.read(WORK, "textstats/core.py") + "```"
    text, ev = lib.call_model("langgraph", label, SYS, prompt, _clock)
    log(node=label, what="llm_done", input=ev["input"], output=ev["output"], cost=ev["cost"], secs=round(ev["t1"] - ev["t0"], 2))
    return text


def read_and_test(s: S):
    log(node="read_and_test", what="start")
    ok, out = lib.run_tests(WORK)
    return dict(core=lib.read(WORK, "textstats/core.py"), tests=lib.read(WORK, "tests/test_core.py"), test_output=out)


def ctx(s):
    return f"{TASK}\n\n--- textstats/core.py ---\n{s['core']}\n--- tests/test_core.py ---\n{s['tests']}\n--- test output ---\n{s['test_output']}\n"


def diagnose(s: S):
    log(node="diagnose", what="start")
    return dict(diagnosis=llm(f"diagnose_{int(time.time())}", ctx(s) + "\nDo not write code yet. List each root cause as a numbered line: the function, what it does wrong, and the failing test it explains."))


def propose_fix(s: S):
    log(node="propose_fix", what="start")
    t = llm(f"propose_{int(time.time())}", ctx(s) + "\nA colleague diagnosed the failures:\n" + s["diagnosis"] +
            "\n\nReturn the complete corrected textstats/core.py in one ```python block and nothing else.")
    return dict(patch=lib.code_block(t) or "")


def human_review(s: S):
    log(node="human_review", what="start")
    diff = "".join(difflib.unified_diff(s["core"].splitlines(True), s["patch"].splitlines(True), "core.py", "core.py (proposed)"))
    decision = interrupt({"question": "Apply this patch?", "diff": diff})
    log(node="human_review", what="resumed", decision=decision)
    return dict(decision=decision)


def apply_and_test(s: S):
    log(node="apply_and_test", what="start")
    if s.get("decision") != "approve":
        return dict(passed=False)
    lib.write(WORK, "textstats/core.py", s["patch"])
    ok, out = lib.run_tests(WORK)
    hid = lib.hidden_checks(WORK)
    lib.write(WORK, "textstats/core.py", s["core"])  # restore, so a fork starts from the same files
    return dict(passed=ok, test_output=out, hidden=hid)


def build(conn):
    g = StateGraph(S)
    for f in (read_and_test, diagnose, propose_fix, human_review, apply_and_test):
        g.add_node(f.__name__, f)
    g.add_edge(START, "read_and_test")
    g.add_edge("read_and_test", "diagnose")
    g.add_edge("diagnose", "propose_fix")
    g.add_edge("propose_fix", "human_review")
    g.add_edge("human_review", "apply_and_test")
    g.add_edge("apply_and_test", END)
    return g.compile(checkpointer=SqliteSaver(conn))


def main():
    cmd, thread = sys.argv[1], sys.argv[2]
    conn = sqlite3.connect(os.path.join(HERE, os.environ.get("DB", "lg_ckpt.db")), check_same_thread=False)
    app = build(conn)
    cfg = {"configurable": {"thread_id": thread}}
    log(node="-", what="process_start", cmd=cmd, thread=thread)
    if cmd == "start":
        if not os.path.exists(WORK):
            import shutil
            shutil.copytree(lib.TASK, WORK)
        out = app.invoke({}, cfg, durability="sync")
    elif cmd == "resume":
        out = app.invoke(None, cfg, durability="sync")
    elif cmd == "approve":
        out = app.invoke(Command(resume="approve"), cfg, durability="sync")
    elif cmd == "fork":
        ck = sys.argv[3]
        past = {"configurable": {"thread_id": thread, "checkpoint_ns": "", "checkpoint_id": ck}}
        snap = app.get_state(past)
        extra = ("\n3. Requirement from the reviewer: an apostrophe counts only INSIDE a word. "
                 "Quotes around a word are not part of it: tokenize(\"'quoted' words\") must be [\"quoted\", \"words\"].")
        new_cfg = app.update_state(snap.config, {"diagnosis": snap.values["diagnosis"] + extra}, as_node="diagnose")
        log(node="-", what="forked", from_checkpoint=ck, new_checkpoint=new_cfg["configurable"]["checkpoint_id"])
        out = app.invoke(None, new_cfg, durability="sync")
    elif cmd == "dump":
        rows = []
        for st in app.get_state_history(cfg):
            c = st.config["configurable"]
            rows.append(dict(checkpoint_id=c["checkpoint_id"], parent=(st.parent_config or {}).get("configurable", {}).get("checkpoint_id"),
                             step=st.metadata.get("step"), source=st.metadata.get("source"), next=list(st.next),
                             created_at=st.created_at, keys=sorted(st.values.keys()),
                             interrupts=[str(i.value)[:80] for t in st.tasks for i in t.interrupts],
                             values={k: (v if k in ("decision", "passed", "hidden") else (v[:400] if isinstance(v, str) else v)) for k, v in st.values.items() if k != "tests"}))
        with open(os.path.join(lib.REC, "langgraph", f"checkpoints_{thread}.json"), "w") as f:
            json.dump(rows, f, indent=1)
        n = conn.execute("select count(*) from checkpoints where thread_id=?", (thread,)).fetchone()[0]
        w = conn.execute("select count(*) from writes where thread_id=?", (thread,)).fetchone()[0]
        print(f"{len(rows)} checkpoints in history, {n} rows in checkpoints table, {w} rows in writes table")
        return
    st = app.get_state(cfg)
    log(node="-", what="process_end", next=list(st.next), interrupt=bool(st.interrupts))
    print(json.dumps(dict(next=list(st.next), passed=out.get("passed"), interrupts=[str(i.value)[:300] for i in st.interrupts]), indent=1))


if __name__ == "__main__":
    main()
