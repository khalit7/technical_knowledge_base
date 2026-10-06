"""E4: interrupt() semantics, measured. No model. Each case records every invoke call, what came back,
and how many times each node body started (a counter incremented on the node's first line)."""
import operator
from typing import Annotated, TypedDict
from pydantic import BaseModel
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import InMemorySaver
from common import save, short, VERSIONS

COUNT = {}


def bump(k):
    COUNT[k] = COUNT.get(k, 0) + 1


class S(TypedDict, total=False):
    patch: str
    decision: str
    note: str
    emails: Annotated[list, operator.add]
    answers: Annotated[list, operator.add]


def out(r):
    if hasattr(r, "interrupts"):
        return dict(value=short(r.value), interrupts=[dict(id=i.id[-6:], value=short(i.value)) for i in r.interrupts])
    return short(r)


def lab(c):
    if isinstance(c, dict) and c.get("by_id"):
        return "resume by id " + str(c["by_id"])
    return c if isinstance(c, str) else "resume " + str(c)


def drive(name, builder, calls, checkpointer=True, note="", compile_kw=None):
    COUNT.clear()
    g = builder.compile(checkpointer=InMemorySaver() if checkpointer else None, **(compile_kw or {}))
    cfg = {"configurable": {"thread_id": name}}
    log, ids = [], []
    for c in calls:
        try:
            if c == "start":
                r = g.invoke({}, cfg, version="v2")
            elif c == "continue":
                r = g.invoke(None, cfg, version="v2")
            elif isinstance(c, dict) and c.get("by_id"):
                r = g.invoke(Command(resume={ids[k]: v for k, v in zip(range(len(c["by_id"])), c["by_id"])}), cfg, version="v2")
            else:
                r = g.invoke(Command(resume=c), cfg, version="v2")
            o = out(r)
            if hasattr(r, "interrupts"):
                ids = [i.id for i in r.interrupts]
            log.append(dict(call=lab(c), ok=True, result=o, starts=dict(COUNT)))
        except Exception as e:
            log.append(dict(call=lab(c), ok=False, error=f"{type(e).__name__}: {str(e)[:300]}", starts=dict(COUNT)))
    return dict(name=name, note=note, calls=log)


def b_side_effect(order):
    """order 'before': the email is sent before interrupt(); 'after': after it."""
    def review(s):
        bump("review")
        if order == "before":
            bump("email_sent")
        d = interrupt({"question": "Apply this patch?"})
        if order == "after" and d == "approve":
            bump("email_sent")
        return {"decision": d}
    b = StateGraph(S)
    b.add_node("propose", lambda s: (bump("propose"), {"patch": "sort by (-count, word)"})[1])
    b.add_node("review", review)
    b.add_edge(START, "propose"); b.add_edge("propose", "review"); b.add_edge("review", END)
    return b


def b_two():
    def ask(s):
        bump("ask")
        a = interrupt("Which bug first?")
        bump("between")
        c = interrupt("Run the full test suite after?")
        return {"answers": [a, c]}
    b = StateGraph(S)
    b.add_node("ask", ask); b.add_edge(START, "ask"); b.add_edge("ask", END)
    return b


def b_parallel():
    def mk(n):
        def f(s):
            bump(n)
            return {"answers": [f"{n}: {interrupt(f'approve {n}?')}"]}
        return f
    b = StateGraph(S)
    b.add_node("fix_tokenize", mk("fix_tokenize")); b.add_node("fix_top_words", mk("fix_top_words"))
    b.add_edge(START, "fix_tokenize"); b.add_edge(START, "fix_top_words")
    b.add_edge("fix_tokenize", END); b.add_edge("fix_top_words", END)
    return b


def b_swallow():
    def review(s):
        bump("review")
        try:
            d = interrupt("Apply this patch?")
        except Exception as e:
            bump("caught_" + type(e).__name__)
            d = "auto-approved by the except branch"
        return {"decision": d}
    b = StateGraph(S)
    b.add_node("review", review); b.add_edge(START, "review"); b.add_edge("review", END)
    return b


class Approval(BaseModel):
    approve: bool
    reason: str


def b_schema():
    def review(s):
        bump("review")
        a = interrupt({"question": "Apply this patch?"}, response_schema=Approval)
        return {"decision": f"{a.approve}: {a.reason}"}
    b = StateGraph(S)
    b.add_node("review", review); b.add_edge(START, "review"); b.add_edge("review", END)
    return b


def b_static():
    b = StateGraph(S)
    b.add_node("propose", lambda s: (bump("propose"), {"patch": "p"})[1])
    b.add_node("apply", lambda s: (bump("apply"), {"note": "applied"})[1])
    b.add_edge(START, "propose"); b.add_edge("propose", "apply"); b.add_edge("apply", END)
    return b


if __name__ == "__main__":
    cases = [
        drive("side_effect_before", b_side_effect("before"), ["start", "approve"], note="email sent BEFORE interrupt()"),
        drive("side_effect_after", b_side_effect("after"), ["start", "approve"], note="email sent AFTER interrupt()"),
        drive("two_in_one_node", b_two(), ["start", "tokenize", "yes"], note="two interrupt() calls in one node"),
        drive("parallel", b_parallel(), ["start", {"by_id": ["yes", "no"]}], note="interrupts in two parallel branches, resumed together by id"),
        drive("parallel_one_value", b_parallel(), ["start", "yes"], note="the same, resumed with a single value"),
        drive("try_except", b_swallow(), ["start"], note="interrupt() inside try/except Exception"),
        drive("no_checkpointer", b_side_effect("after"), ["start", "approve"], checkpointer=False, note="no checkpointer"),
        drive("schema_bad", b_schema(), ["start", {"approve": "maybe"}, {"approve": True, "reason": "tests pass"}], note="response_schema=Approval; a bad then a good resume value"),
        drive("static_before", b_static(), ["start", "continue"], note="compile(interrupt_before=['apply'])", compile_kw={"interrupt_before": ["apply"]}),
    ]
    save("e4_interrupts.json", dict(versions=VERSIONS, cases=cases))
    for c in cases:
        print(c["name"])
        for l in c["calls"]:
            print("   ", l["call"], l["ok"], l.get("result") or l.get("error"), l["starts"])
