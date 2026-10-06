"""E1b: recovering the stuck thread of fan_no_reducer with update_state, and what compile() rejects."""
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from e1_supersteps import g_fan, FanNo
from common import save, short, VERSIONS

out = {}
g = g_fan(FanNo).compile(checkpointer=InMemorySaver()); cfg = {"configurable": {"thread_id": "x"}}
try:
    g.invoke({}, cfg)
except Exception as e:
    out["run"] = f"{type(e).__name__}: {e}"[:200]
try:
    g.get_state(cfg); out["get_state"] = "ok"
except Exception as e:
    out["get_state"] = type(e).__name__
g.update_state(cfg, {"findings": ["manual merge"]}, as_node="check_tokenize")
st = g.get_state(cfg); out["after_update"] = dict(values=short(st.values), next=list(st.next))
out["invoke_none"] = short(g.invoke(None, cfg))


class S(TypedDict):
    a: int


b = StateGraph(S); b.add_node("x", lambda s: {"a": 1}); b.add_edge(START, "x"); b.add_edge("x", "nope")
try:
    b.compile(); out["unknown_edge"] = "compiled"
except Exception as e:
    out["unknown_edge"] = f"{type(e).__name__}: {e}"
b = StateGraph(S); b.add_node("x", lambda s: {"a": 1}); b.add_node("orphan", lambda s: {"a": 2}); b.add_edge(START, "x"); b.add_edge("x", END)
try:
    b.compile(); out["orphan_node"] = "compiled"
except Exception as e:
    out["orphan_node"] = f"{type(e).__name__}: {e}"
save("e1b_checks.json", dict(versions=VERSIONS, **out)); print(out)
