"""E1: how a compiled StateGraph runs, super-step by super-step. No model: every node is a plain
function over the running example (textstats with two planted bugs), so the traces are exact and repeatable.
Records, per graph: the tasks of each super-step (stream_mode="tasks"), every raw checkpoint
(channel_versions, versions_seen, values), the final state, or the error."""
import operator, time
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send
from langgraph.checkpoint.memory import InMemorySaver
from common import dump_raw, save, short, VERSIONS


def run(name, builder, inp, note):
    saver = InMemorySaver()
    g = builder.compile(checkpointer=saver)
    cfg = {"configurable": {"thread_id": name}}
    events, err, t0 = [], None, time.time()
    try:
        for ev in g.stream(inp, cfg, stream_mode="tasks"):
            if "result" in ev or "error" in ev:
                events.append(dict(kind="end", name=ev["name"], id=ev["id"][-6:], result=short(ev.get("result")), error=short(ev.get("error"))))
            else:
                events.append(dict(kind="start", name=ev["name"], id=ev["id"][-6:], triggers=list(ev.get("triggers", [])), input=short(ev.get("input"), 80)))
    except Exception as e:
        err = f"{type(e).__name__}: {e}"
    graph = g.get_graph()
    edges = [dict(s=e.source, t=e.target, cond=bool(e.conditional)) for e in graph.edges]
    try:
        st = g.get_state(cfg); final, nxt, st_err = short(st.values), list(st.next), None
    except Exception as e:
        final, nxt, st_err = None, None, f"{type(e).__name__}: {e}"
    return dict(name=name, note=note, nodes=[n for n in graph.nodes], edges=edges, events=events,
                checkpoints=dump_raw(saver, name), final=final, next=nxt, error=err, get_state_error=st_err,
                secs=round(time.time() - t0, 3))


# ---------- the graphs ----------
class Lin(TypedDict, total=False):
    test_output: str
    diagnosis: str
    patch: str
    passed: bool


def g_linear():
    b = StateGraph(Lin)
    b.add_node("read_and_test", lambda s: {"test_output": "2 failed: test_word_count, test_top_words"})
    b.add_node("diagnose", lambda s: {"diagnosis": "tokenize drops apostrophes; top_words ties not alphabetical"})
    b.add_node("fix", lambda s: {"patch": "regex keeps inner apostrophes; sort by (-count, word)"})
    b.add_node("test", lambda s: {"passed": True})
    b.add_edge(START, "read_and_test"); b.add_edge("read_and_test", "diagnose")
    b.add_edge("diagnose", "fix"); b.add_edge("fix", "test"); b.add_edge("test", END)
    return b


class Fan(TypedDict, total=False):
    test_output: str
    findings: Annotated[list, operator.add]
    report: str


class FanNo(TypedDict, total=False):
    test_output: str
    findings: list
    report: str


def g_fan(State):
    b = StateGraph(State)
    b.add_node("read_and_test", lambda s: {"test_output": "2 failed"})
    b.add_node("check_tokenize", lambda s: {"findings": ["tokenize: regex drops apostrophes"]})
    b.add_node("check_top_words", lambda s: {"findings": ["top_words: ties not sorted by word"]})
    b.add_node("merge", lambda s: {"report": f"{len(s['findings'])} findings"})
    b.add_edge(START, "read_and_test")
    b.add_edge("read_and_test", "check_tokenize"); b.add_edge("read_and_test", "check_top_words")
    b.add_edge("check_tokenize", "merge"); b.add_edge("check_top_words", "merge"); b.add_edge("merge", END)
    return b


class Un(TypedDict, total=False):
    log: Annotated[list, operator.add]


def g_uneven(join_all):
    """Branch a is two nodes long, branch b one. Plain edges: join runs when EITHER arrives."""
    b = StateGraph(Un)
    for n in ("read", "a_search", "a_read_hits", "b_lint", "join"):
        b.add_node(n, (lambda n: lambda s: {"log": [n]})(n))
    b.add_edge(START, "read")
    b.add_edge("read", "a_search"); b.add_edge("a_search", "a_read_hits"); b.add_edge("read", "b_lint")
    if join_all:
        b.add_edge(["a_read_hits", "b_lint"], "join")
    else:
        b.add_edge("a_read_hits", "join"); b.add_edge("b_lint", "join")
    b.add_edge("join", END)
    return b


class Loop(TypedDict, total=False):
    attempts: int
    passed: bool


def g_loop():
    b = StateGraph(Loop)
    b.add_node("fix", lambda s: {"attempts": s.get("attempts", 0) + 1})
    b.add_node("test", lambda s: {"passed": s["attempts"] >= 2})  # the second patch passes
    b.add_edge(START, "fix"); b.add_edge("fix", "test")
    b.add_conditional_edges("test", lambda s: END if s["passed"] or s["attempts"] >= 3 else "fix", ["fix", END])
    return b


class MR(TypedDict, total=False):
    files: list
    reviews: Annotated[list, operator.add]
    summary: str


def g_send():
    b = StateGraph(MR)
    b.add_node("list_files", lambda s: {"files": ["core.py", "cli.py", "__init__.py"]})
    b.add_node("review", lambda s: {"reviews": [f"{s['file']}: ok" if s["file"] != "core.py" else "core.py: 2 bugs"]})
    b.add_node("summarise", lambda s: {"summary": "; ".join(sorted(s["reviews"]))})
    b.add_edge(START, "list_files")
    b.add_conditional_edges("list_files", lambda s: [Send("review", {"file": f}) for f in s["files"]], ["review"])
    b.add_edge("review", "summarise"); b.add_edge("summarise", END)
    return b


if __name__ == "__main__":
    res = dict(versions=VERSIONS, graphs=[
        run("linear", g_linear(), {}, "four nodes in a row: one task per super-step"),
        run("fan_reducer", g_fan(Fan), {}, "two checks in parallel, findings has an operator.add reducer"),
        run("fan_no_reducer", g_fan(FanNo), {}, "the same graph, findings without a reducer"),
        run("uneven_edges", g_uneven(False), {}, "branches of length 2 and 1 joined with two plain edges"),
        run("uneven_join_all", g_uneven(True), {}, "the same branches joined with add_edge([a_read_hits, b_lint], join)"),
        run("loop", g_loop(), {}, "fix and test in a cycle until tests pass (second patch passes)"),
        run("send", g_send(), {}, "map-reduce: one review task per file via Send"),
    ])
    save("e1_supersteps.json", res)
    for g in res["graphs"]:
        print(g["name"], "steps", max([c["step"] for c in g["checkpoints"]] or [None]), "err", g["error"], "final", g["final"])
