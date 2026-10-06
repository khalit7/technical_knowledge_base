"""E7: LangChain 1.x create_agent on the running example, with the local model (Qwen3-4B-Instruct-2507 4-bit on
mlx-lm, Apple M1 Pro), a SQLite checkpointer and middleware: HumanInTheLoopMiddleware on write_file and
ModelCallLimitMiddleware. Every HTTP request to the shared server holds the shared lock (one request at a time
across all agents). Records: the compiled graph (with and without middleware), every request body sent,
the stream (updates + messages), the interrupt payload, the resume, and the final test result."""
import fcntl, json, os, shutil, sqlite3, subprocess, sys, time
import httpx
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware, ModelCallLimitMiddleware
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.types import Command
from common import save, short, VERSIONS

HERE = os.path.dirname(os.path.abspath(__file__)); FLG = os.path.dirname(HERE)
AG = os.path.dirname(FLG); TASK = os.path.join(AG, "task_repo"); LOCK = os.path.join(AG, "mlx_request.lock")
W = os.path.join(FLG, "work", "e7")
MODEL = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
REQS = []
POLICY = sys.argv[1] if len(sys.argv) > 1 else "approve_all"


class LockedStream(httpx.SyncByteStream):
    def __init__(self, inner, fd, rec):
        self.inner, self.fd, self.rec = inner, fd, rec

    def __iter__(self):
        n = 0
        for chunk in self.inner:
            n += 1
            yield chunk
        self.rec["chunks"] = n

    def close(self):
        try:
            self.inner.close()
        finally:
            if self.fd is not None:
                self.rec["t1"] = round(time.time(), 3)
                fcntl.flock(self.fd, fcntl.LOCK_UN); os.close(self.fd); self.fd = None


class LockedTransport(httpx.HTTPTransport):
    """Hold the shared lock from sending the request until the (possibly streamed) response is closed."""
    def handle_request(self, request):
        fd = os.open(LOCK, os.O_CREAT | os.O_RDWR, 0o644)
        fcntl.flock(fd, fcntl.LOCK_EX)
        rec = dict(t0=round(time.time(), 3), body=json.loads(request.content or b"{}"))
        REQS.append(rec)
        try:
            resp = super().handle_request(request)
        except Exception:
            fcntl.flock(fd, fcntl.LOCK_UN); os.close(fd); raise
        resp.stream = LockedStream(resp.stream, fd, rec)
        return resp


@tool
def read_file(path: str) -> str:
    """Read a text file of the repository. path is relative to the repository root, e.g. textstats/core.py."""
    p = os.path.normpath(os.path.join(W, path))
    if not p.startswith(W) or not os.path.isfile(p):
        return f"error: no such file {path}"
    return open(p).read()


@tool
def run_tests() -> str:
    """Run the test suite (python3 tests/test_core.py) and return its output."""
    p = subprocess.run(["python3", "tests/test_core.py"], cwd=W, capture_output=True, text=True, timeout=60)
    return ((p.stdout + p.stderr).strip() or "(no output)") + f"\nexit code {p.returncode}"


@tool
def write_file(path: str, content: str) -> str:
    """Replace the whole content of a file of the repository. Never edit files under tests/."""
    if path.startswith("tests"):
        return "error: tests are read-only"
    p = os.path.normpath(os.path.join(W, path))
    if not p.startswith(W):
        return "error: outside the repository"
    open(p, "w").write(content)
    return f"wrote {len(content)} characters to {path}"


SYSTEM = ("You fix bugs in a small Python repository using the tools. Read the code and the tests, run the tests, "
          "then write the corrected file and run the tests again. Do not edit tests. Be brief.")
TASKMSG = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."


def graph_shape(agent):
    g = agent.get_graph()
    return dict(nodes=list(g.nodes), edges=[dict(s=e.source, t=e.target, cond=bool(e.conditional)) for e in g.edges])


def main():
    if os.path.exists(W):
        shutil.rmtree(W)
    shutil.copytree(TASK, W)
    db = os.path.join(FLG, "out", f"e7_{POLICY}.db")
    if os.path.exists(db):
        os.remove(db)
    client = httpx.Client(transport=LockedTransport(), timeout=600)
    llm = ChatOpenAI(model=MODEL, base_url="http://127.0.0.1:8090/v1", api_key="local", temperature=0, max_tokens=1500,
                     streaming=True, http_client=client)
    tools = [read_file, run_tests, write_file]
    plain = create_agent(llm, tools, system_prompt=SYSTEM)
    agent = create_agent(llm, tools, system_prompt=SYSTEM,
                         middleware=[HumanInTheLoopMiddleware(interrupt_on={"write_file": True}), ModelCallLimitMiddleware(run_limit=12)],
                         checkpointer=SqliteSaver(sqlite3.connect(db, check_same_thread=False)))
    res = dict(versions=VERSIONS, model=MODEL, shape_plain=graph_shape(plain), shape_mw=graph_shape(agent), phases=[])
    cfg = {"configurable": {"thread_id": "e7"}}
    inp = {"messages": [{"role": "user", "content": TASKMSG}]}
    for phase in range(8):
        evs, t0 = [], time.time()
        chunks = 0
        for mode, data in agent.stream(inp, cfg, stream_mode=["updates", "messages"]):
            if mode == "messages":
                msg, meta = data
                chunks += 1
                if chunks <= 3 or getattr(msg, "tool_call_chunks", None):
                    evs.append(dict(mode=mode, t=round(time.time() - t0, 3), node=meta.get("langgraph_node"), step=meta.get("langgraph_step"),
                                    content=short(msg.content, 60), tool_call_chunks=short(getattr(msg, "tool_call_chunks", None), 80)))
            else:
                for node, upd in data.items():
                    if node == "__interrupt__":
                        evs.append(dict(mode=mode, t=round(time.time() - t0, 3), node=node, interrupt=short([i.value for i in upd], 400)))
                    else:
                        msgs = (upd or {}).get("messages", []) if isinstance(upd, dict) else []
                        evs.append(dict(mode=mode, t=round(time.time() - t0, 3), node=node, keys=list(upd.keys()) if isinstance(upd, dict) else None,
                                        messages=[dict(type=m.type, content=short(m.content, 300), tool_calls=short(getattr(m, "tool_calls", None), 300)) for m in msgs]))
        st = agent.get_state(cfg)
        res["phases"].append(dict(input=short(inp, 200), secs=round(time.time() - t0, 2), message_chunks=chunks, events=evs, next=list(st.next)))
        print("phase", phase, "chunks", chunks, "next", list(st.next), flush=True)
        if not st.interrupts:
            break
        hitl = st.interrupts[0].value
        res["phases"][-1]["hitl_request"] = short(hitl, 2000)
        decs = []
        for ar in hitl["action_requests"]:
            path = ar["args"].get("path", "")
            if POLICY == "check_path" and not path.startswith("textstats/"):
                decs.append({"type": "reject", "message": f"wrong path {path}: the module is textstats/core.py; read it before writing"})
            else:
                decs.append({"type": "approve"})
        res["phases"][-1]["decisions"] = decs
        inp = Command(resume={"decisions": decs})
    p = subprocess.run(["python3", "tests/test_core.py"], cwd=W, capture_output=True, text=True)
    res["final_tests_pass"] = p.returncode == 0
    res["final_core"] = open(os.path.join(W, "textstats/core.py")).read()
    res["requests"] = [dict(t0=r["t0"], t1=r.get("t1"), chunks=r.get("chunks"), body=r["body"]) for r in REQS]
    res["messages_final"] = [dict(type=m.type, content=short(m.content, 400), tool_calls=short(getattr(m, "tool_calls", None), 400))
                             for m in agent.get_state(cfg).values["messages"]]
    res["policy"] = POLICY
    save("e7_agent.json" if POLICY == "approve_all" else f"e7_agent_{POLICY}.json", res)


if __name__ == "__main__":
    main()
