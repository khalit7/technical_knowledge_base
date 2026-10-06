"""E6: the running example with real model calls (Claude Haiku 4.5 through `claude -p`, every tool off),
as a LangGraph StateGraph with a SQLite checkpointer. Two diagnoses run in PARALLEL in one super-step.
The process is SIGKILLed as soon as the first diagnosis returns (the second still in flight), then resumed.
Scenario A uses durability="sync"; scenario B the same with durability="exit" (nothing saved before the end).
Then a fix is proposed, a human approves at an interrupt, and the patch is applied and tested.
Usage: e6_real.py child <scenario> <dur> start|resume|approve     e6_real.py drive"""
import difflib, json, os, re, shutil, signal, sqlite3, subprocess, sys, time
import operator
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.sqlite import SqliteSaver
from common import VERSIONS, save

HERE = os.path.dirname(os.path.abspath(__file__))
FLG = os.path.dirname(HERE)
TASK = os.path.join(os.path.dirname(FLG), "task_repo")
REC = os.path.join(os.path.dirname(FLG), "recordings", "flg", "e6")
EMPTY = os.path.join(FLG, "empty_cwd")
SYS = "You are a careful Python engineer. Follow the requested output format exactly. Never use the em-dash character."
os.makedirs(REC, exist_ok=True); os.makedirs(EMPTY, exist_ok=True)


def paths(sc):
    return dict(db=os.path.join(FLG, "out", f"e6_{sc}.db"), ev=os.path.join(REC, f"{sc}_events.jsonl"), work=os.path.join(FLG, "work", sc))


def log(sc, **kw):
    kw["t"] = round(time.time(), 3); kw["pid"] = os.getpid()
    with open(paths(sc)["ev"], "a") as f:
        f.write(json.dumps(kw) + "\n")


def llm(sc, label, prompt):
    stamp = f"{label}_{int(time.time()*1000)}"
    log(sc, node=label, what="llm_start", call=stamp)
    cmd = ["claude", "-p", prompt, "--output-format", "stream-json", "--verbose", "--no-session-persistence",
           "--setting-sources", "project", "--strict-mcp-config", "--model", "haiku", "--tools", "", "--system-prompt", SYS]
    p = subprocess.run(cmd, cwd=EMPTY, capture_output=True, text=True, timeout=600)
    with open(os.path.join(REC, f"{sc}_{stamp}.jsonl"), "w") as f:
        f.write(p.stdout)
    res = [json.loads(l) for l in p.stdout.splitlines() if l.startswith("{") and '"type":"result"' in l.replace(" ", "")]
    if not res:
        raise RuntimeError("no result record: " + p.stderr[:300])
    r = res[-1]; u = r.get("usage", {})
    log(sc, node=label, what="llm_done", call=stamp, input=u.get("input_tokens", 0), cache_write=u.get("cache_creation_input_tokens", 0),
        cache_read=u.get("cache_read_input_tokens", 0), output=u.get("output_tokens", 0), cost=r.get("total_cost_usd", 0))
    return r.get("result", "")


def rd(d, rel):
    return open(os.path.join(d, rel)).read()


def tests(d):
    p = subprocess.run(["python3", "tests/test_core.py"], cwd=d, capture_output=True, text=True, timeout=60)
    return p.returncode == 0, (p.stdout + p.stderr).strip()


class S(TypedDict, total=False):
    core: str
    tests: str
    test_output: str
    diagnoses: Annotated[list, operator.add]
    patch: str
    decision: str
    passed: bool


def build(sc):
    W = paths(sc)["work"]

    def ctx(s):
        return (f"--- textstats/core.py ---\n{s['core']}\n--- tests/test_core.py ---\n{s['tests']}\n--- test output ---\n{s['test_output']}\n")

    def read_and_test(s):
        log(sc, node="read_and_test", what="start")
        ok, out = tests(W)
        return dict(core=rd(W, "textstats/core.py"), tests=rd(W, "tests/test_core.py"), test_output=out)

    def diag(name, test):
        def f(s):
            log(sc, node=name, what="start")
            t = llm(sc, name, "The tests of this small repository fail.\n\n" + ctx(s) +
                    f"\nLook only at the failure of {test}. In at most three lines: the function at fault, what it does wrong, the one-line fix. No code block.")
            return {"diagnoses": [f"{test}: {t.strip()}"]}
        return f

    def propose_fix(s):
        log(sc, node="propose_fix", what="start")
        t = llm(sc, "propose_fix", "The tests of this small repository fail.\n\n" + ctx(s) + "\nDiagnoses from two colleagues:\n" +
                "\n".join(sorted(s["diagnoses"])) + "\n\nReturn the complete corrected textstats/core.py in one ```python block and nothing else. Do not edit the tests.")
        m = re.findall(r"```(?:python|py)?\s*\n(.*?)```", t, re.S)
        return {"patch": max(m, key=len) if m else ""}

    def human_review(s):
        log(sc, node="human_review", what="start")
        diff = "".join(difflib.unified_diff(s["core"].splitlines(True), s["patch"].splitlines(True), "core.py", "core.py (proposed)"))
        d = interrupt({"question": "Apply this patch?", "diff": diff})
        log(sc, node="human_review", what="resumed", decision=d)
        return {"decision": d}

    def apply_and_test(s):
        log(sc, node="apply_and_test", what="start")
        if s.get("decision") != "approve":
            return {"passed": False}
        open(os.path.join(W, "textstats/core.py"), "w").write(s["patch"])
        ok, out = tests(W)
        open(os.path.join(W, "textstats/core.py"), "w").write(s["core"])
        log(sc, node="apply_and_test", what="tested", passed=ok, output=out[-300:])
        return {"passed": ok, "test_output": out}

    b = StateGraph(S)
    b.add_node("read_and_test", read_and_test)
    b.add_node("diagnose_word_count", diag("diagnose_word_count", "test_word_count"))
    b.add_node("diagnose_top_words", diag("diagnose_top_words", "test_top_words"))
    b.add_node("propose_fix", propose_fix); b.add_node("human_review", human_review); b.add_node("apply_and_test", apply_and_test)
    b.add_edge(START, "read_and_test")
    b.add_edge("read_and_test", "diagnose_word_count"); b.add_edge("read_and_test", "diagnose_top_words")
    b.add_edge(["diagnose_word_count", "diagnose_top_words"], "propose_fix")
    b.add_edge("propose_fix", "human_review"); b.add_edge("human_review", "apply_and_test"); b.add_edge("apply_and_test", END)
    return b


def child(sc, dur, what):
    P = paths(sc)
    conn = sqlite3.connect(P["db"], check_same_thread=False)
    g = build(sc).compile(checkpointer=SqliteSaver(conn))
    cfg = {"configurable": {"thread_id": sc}}
    log(sc, node="-", what="process_start", cmd=what, durability=dur)
    if what == "start":
        r = g.invoke({}, cfg, durability=dur, version="v2")
    elif what == "resume":
        has = g.get_state(cfg).values
        log(sc, node="-", what="checkpoint_found" if has else "no_checkpoint")
        r = g.invoke(None if has else {}, cfg, durability=dur, version="v2")
    else:
        r = g.invoke(Command(resume="approve"), cfg, durability=dur, version="v2")
    st = g.get_state(cfg)
    log(sc, node="-", what="process_end", next=list(st.next), interrupt=bool(r.interrupts), passed=r.value.get("passed"))


def drive(sc, dur):
    P = paths(sc)
    for p in (P["db"], P["ev"]):
        if os.path.exists(p):
            os.remove(p)
    if os.path.exists(P["work"]):
        shutil.rmtree(P["work"])
    shutil.copytree(TASK, P["work"])
    py = [sys.executable, __file__, "child", sc, dur]
    p = subprocess.Popen(py + ["start"], cwd=HERE, start_new_session=True, stdout=subprocess.DEVNULL, stderr=open(os.path.join(FLG, "out", f"e6_{sc}.err"), "w"))
    while True:
        time.sleep(0.05)
        evs = [json.loads(l) for l in open(P["ev"])] if os.path.exists(P["ev"]) else []
        if any(e["what"] == "llm_done" for e in evs):
            break
        if p.poll() is not None:
            raise SystemExit("start exited early")
    os.killpg(p.pid, signal.SIGKILL); p.wait()
    log(sc, node="-", what="SIGKILL")
    for what in ("resume", "approve"):
        subprocess.run(py + [what], cwd=HERE, stdout=subprocess.DEVNULL, stderr=open(os.path.join(FLG, "out", f"e6_{sc}_{what}.err"), "w"))
    conn = sqlite3.connect(P["db"])
    n = conn.execute("select count(*) from checkpoints").fetchone()[0]; w = conn.execute("select count(*) from writes").fetchone()[0]
    log(sc, node="-", what="db_rows", checkpoints=n, writes=w)


if __name__ == "__main__":
    if sys.argv[1] == "child":
        child(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        which = sys.argv[2:] or ["A", "B"]
        for sc, dur in (("A", "sync"), ("B", "exit")):
            if sc in which:
                drive(sc, dur)
                print(sc, "done")
