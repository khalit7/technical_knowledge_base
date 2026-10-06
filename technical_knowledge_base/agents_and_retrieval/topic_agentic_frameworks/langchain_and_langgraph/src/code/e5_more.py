"""E5: streaming modes, subgraphs (namespaces, interrupts, Command.PARENT), the store, and the functional API.
No model; plain functions over the running example."""
import operator
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.config import get_stream_writer
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.store.memory import InMemoryStore
from langgraph.func import entrypoint, task
from common import save, short, VERSIONS

COUNT = {}


def bump(k):
    COUNT[k] = COUNT.get(k, 0) + 1


# ---------- a) streaming modes ----------
class F(TypedDict, total=False):
    test_output: str
    findings: Annotated[list, operator.add]
    report: str


def fan():
    def read_and_test(s):
        get_stream_writer()({"progress": "running 3 tests"})
        return {"test_output": "2 failed"}

    def check_tokenize(s):
        get_stream_writer()({"progress": "tokenize checked"})
        return {"findings": ["tokenize drops apostrophes"]}

    b = StateGraph(F)
    b.add_node("read_and_test", read_and_test)
    b.add_node("check_tokenize", check_tokenize)
    b.add_node("check_top_words", lambda s: {"findings": ["top_words ties unsorted"]})
    b.add_node("merge", lambda s: {"report": f"{len(s['findings'])} findings"})
    b.add_edge(START, "read_and_test")
    b.add_edge("read_and_test", "check_tokenize"); b.add_edge("read_and_test", "check_top_words")
    b.add_edge(["check_tokenize", "check_top_words"], "merge"); b.add_edge("merge", END)
    return b.compile(checkpointer=InMemorySaver())


def streams():
    res = {}
    for mode in ("values", "updates", "custom", "checkpoints", "tasks", "debug"):
        g = fan()
        evs = list(g.stream({}, {"configurable": {"thread_id": mode}}, stream_mode=mode))
        res[mode] = dict(count=len(evs), events=[short(e, 90) for e in evs])
    g = fan()
    evs = list(g.stream({}, {"configurable": {"thread_id": "multi"}}, stream_mode=["updates", "custom"]))
    res["updates+custom"] = dict(count=len(evs), events=[short(list(e), 90) for e in evs])
    g = fan()
    evs = list(g.stream({}, {"configurable": {"thread_id": "v2"}}, stream_mode=["updates", "custom"], version="v2"))
    res["v2"] = dict(count=len(evs), events=[short(e, 90) for e in evs])
    return res


# ---------- b) subgraphs ----------
class Sub(TypedDict, total=False):
    bug: str
    location: str
    patch: str


class Par(TypedDict, total=False):
    bug: str
    patch: str
    applied: bool


def subgraph(with_interrupt):
    def locate(s):
        bump("sub.locate"); return {"location": "core.py:tokenize"}

    def patch(s):
        bump("sub.patch")
        ok = interrupt(f"apply patch at {s['location']}?") if with_interrupt else "yes"
        return {"patch": f"fix at {s['location']} ({ok})"}
    b = StateGraph(Sub)
    b.add_node("locate", locate); b.add_node("patch", patch)
    b.add_edge(START, "locate"); b.add_edge("locate", "patch"); b.add_edge("patch", END)
    return b


def parent(style, with_interrupt=True):
    sub = subgraph(with_interrupt).compile()
    b = StateGraph(Par)
    b.add_node("triage", lambda s: (bump("triage"), {"bug": "apostrophes"})[1])
    if style == "as_node":
        b.add_node("fix_bug", sub)
    else:
        def fix_bug(s):
            bump("parent.fix_bug wrapper")
            r = sub.invoke({"bug": s["bug"]})
            return {"patch": r["patch"]}
        b.add_node("fix_bug", fix_bug)
    b.add_node("apply", lambda s: (bump("apply"), {"applied": True})[1])
    b.add_edge(START, "triage"); b.add_edge("triage", "fix_bug"); b.add_edge("fix_bug", "apply"); b.add_edge("apply", END)
    return b


def subgraphs():
    out = {}
    for style in ("as_node", "called_in_function"):
        COUNT.clear()
        saver = InMemorySaver()
        g = parent(style).compile(checkpointer=saver)
        cfg = {"configurable": {"thread_id": style}}
        r1 = g.invoke({}, cfg, version="v2")
        starts1 = dict(COUNT)
        st = g.get_state(cfg, subgraphs=True)
        sub_states = [dict(name=t.name, ns=(t.state.config["configurable"].get("checkpoint_ns") if t.state else None),
                           sub_values=short(t.state.values) if t.state else None) for t in st.tasks]
        nss = sorted({c.config["configurable"]["checkpoint_ns"] for c in saver.list(None)})
        r2 = g.invoke(Command(resume="yes"), cfg, version="v2")
        out[style] = dict(interrupts=[short(i.value) for i in r1.interrupts], starts_after_pause=starts1,
                          starts_after_resume=dict(COUNT), final=short(r2.value), paused_tasks=sub_states,
                          namespaces=[n.split(":")[0] + (":<task id>" if ":" in n else "") for n in nss])
    return out


def handoff():
    """A subgraph node hands control to a node of the PARENT graph with Command(graph=Command.PARENT)."""
    class A(TypedDict, total=False):
        route: str
        log: Annotated[list, operator.add]

    def triage_agent(s):
        return Command(goto="billing", graph=Command.PARENT, update={"log": ["triage: refund question, handing off"]})
    sb = StateGraph(A); sb.add_node("triage_agent", triage_agent); sb.add_edge(START, "triage_agent")
    pb = StateGraph(A)
    pb.add_node("triage", sb.compile(), destinations=("billing", "tech"))
    pb.add_node("billing", lambda s: {"log": ["billing: handled"]})
    pb.add_node("tech", lambda s: {"log": ["tech: handled"]})
    pb.add_edge(START, "triage"); pb.add_edge("billing", END); pb.add_edge("tech", END)
    g = pb.compile()
    return dict(final=short(g.invoke({})), edges=[dict(s=e.source, t=e.target, cond=bool(e.conditional)) for e in g.get_graph().edges])


# ---------- d) store ----------
def store():
    st = InMemoryStore()

    class M(TypedDict, total=False):
        user: str
        q: str
        a: str

    def answer(s, *, store):
        ns = ("users", s["user"], "prefs")
        if s["q"].startswith("remember:"):
            store.put(ns, "style", {"text": s["q"][9:].strip()})
            return {"a": "saved"}
        item = store.get(ns, "style")
        return {"a": f"style = {item.value['text']}" if item else "no preference stored"}
    b = StateGraph(M); b.add_node("answer", answer); b.add_edge(START, "answer")
    g = b.compile(checkpointer=InMemorySaver(), store=st)
    log = []
    for thread, user, q in [("t1", "user_a", "remember: tests use the plain runner, not pytest"),
                            ("t2", "user_a", "how do I run the tests?"),
                            ("t3", "user_b", "how do I run the tests?")]:
        r = g.invoke({"user": user, "q": q}, {"configurable": {"thread_id": thread}})
        log.append(dict(thread=thread, user=user, q=q, a=r["a"]))
    items = st.search(("users",))
    return dict(log=log, items=[dict(ns=list(i.namespace), key=i.key, value=i.value) for i in items])


# ---------- e) functional API ----------
def functional():
    state = {"fail_once": True}

    @task
    def diagnose(bug: str) -> str:
        bump("task.diagnose:" + bug)
        return f"cause of {bug}"

    @task
    def propose(cause: str) -> str:
        bump("task.propose")
        if state["fail_once"]:
            state["fail_once"] = False
            raise RuntimeError("provider timeout (simulated)")
        return f"patch for {cause}"

    @entrypoint(checkpointer=InMemorySaver())
    def fix(bugs: list) -> list:
        futs = [diagnose(b) for b in bugs]          # run in parallel
        causes = [f.result() for f in futs]
        return [propose(c).result() for c in causes]
    COUNT.clear()
    cfg = {"configurable": {"thread_id": "f1"}}
    try:
        fix.invoke(["apostrophes", "ties"], cfg); first = "ok"
    except Exception as e:
        first = f"{type(e).__name__}: {e}"
    after1 = dict(COUNT)
    r = fix.invoke(None, cfg)
    return dict(first=first, starts_after_first=after1, result=r, starts_after_retry=dict(COUNT))


if __name__ == "__main__":
    res = dict(versions=VERSIONS, streams=streams(), subgraphs=subgraphs(), handoff=handoff(), store=store(), functional=functional())
    save("e5_more.json", res)
    for k, v in res["streams"].items():
        print(k, v["count"], str(v["events"][:2])[:200])
    for k, v in res["subgraphs"].items():
        print(k, v)
    print(res["handoff"]); print(res["store"]); print(res["functional"])
