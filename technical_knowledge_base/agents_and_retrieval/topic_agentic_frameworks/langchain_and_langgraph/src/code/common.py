"""Shared helpers for the LangGraph experiments (langgraph 1.2.14, langgraph-checkpoint 4.2.0)."""
import json, os, time, importlib.metadata as md

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "out")
os.makedirs(OUT, exist_ok=True)

VERSIONS = {p: md.version(p) for p in ["langgraph", "langgraph-checkpoint", "langgraph-checkpoint-sqlite",
                                        "langgraph-checkpoint-postgres", "langgraph-prebuilt", "langchain", "langchain-core",
                                        "langchain-openai"]}


def short(v, n=120):
    """JSON-safe, short rendering of a channel value."""
    try:
        if hasattr(v, "content") and hasattr(v, "type"):
            return {"msg": v.type, "content": short(v.content, n)}
        if isinstance(v, (list, tuple)):
            return [short(x, n) for x in v]
        if isinstance(v, dict):
            return {str(k): short(x, n) for k, x in v.items()}
        if isinstance(v, (int, float, bool)) or v is None:
            return v
        s = str(v)
        return s if len(s) <= n else s[:n] + "..."
    except Exception as e:  # pragma: no cover
        return f"<{type(e).__name__}>"


def dump_raw(saver, thread, ns=""):
    """Every checkpoint of a thread, oldest first, straight from the saver (not get_state)."""
    rows = []
    for t in saver.list({"configurable": {"thread_id": thread, "checkpoint_ns": ns}}):
        cp, meta = t.checkpoint, t.metadata
        rows.append(dict(
            id=cp["id"][-8:], parent=(t.parent_config or {}).get("configurable", {}).get("checkpoint_id", "")[-8:] or None,
            step=meta.get("step"), source=meta.get("source"),
            channel_versions={k: str(v).split(".")[0].lstrip("0") or "0" for k, v in cp["channel_versions"].items()},
            versions_seen={n: {k: str(v).split(".")[0].lstrip("0") or "0" for k, v in d.items()} for n, d in cp["versions_seen"].items()},
            updated=cp.get("updated_channels"),
            values={k: short(v) for k, v in cp["channel_values"].items()},
            pending=[dict(task=w[0][-6:], channel=w[1], value=short(w[2], 80)) for w in (t.pending_writes or [])],
        ))
    rows.reverse()
    return rows


def save(name, obj):
    p = os.path.join(OUT, name)
    with open(p, "w") as f:
        json.dump(obj, f, indent=1, default=str)
    print("wrote", p)
