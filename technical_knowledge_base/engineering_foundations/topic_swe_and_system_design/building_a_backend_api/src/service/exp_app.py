"""A second, tiny FastAPI app for the service-internals experiments on the page "Building a backend API".

Not the chat API (that is app.py): every route here exists to make one mechanism measurable.
run_experiments.py starts it with uvicorn, sends requests and records what happened; nothing here is
run by hand. Every event is printed to stdout as one JSON line {"t": monotonic seconds, "ev": ...} so the
runner can put server-side and client-side events on one clock (same machine, same monotonic clock).
"""
import asyncio, json, os, time
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import BackgroundTasks, Depends, FastAPI, Header, Request


def ev(what: str, **kw):
    print(json.dumps({"t": round(time.monotonic(), 4), "ev": what, **kw}), flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ev("lifespan startup (open the pool, load config)")
    yield
    ev("lifespan shutdown (close the pool)")


app = FastAPI(lifespan=lifespan)


# ---------- order of middleware, dependency and handler ----------
# Two middlewares added in this order: "added first", then "added second". The trace route shows which runs outermost.
@app.middleware("http")
async def added_first(request: Request, call_next):
    if request.url.path.startswith("/trace"):
        ev("middleware added first: enter")
    resp = await call_next(request)
    if request.url.path.startswith("/trace"):
        ev("middleware added first: exit")
    return resp


@app.middleware("http")
async def added_second(request: Request, call_next):
    if request.url.path.startswith("/trace"):
        ev("middleware added second: enter")
    resp = await call_next(request)
    if request.url.path.startswith("/trace"):
        ev("middleware added second: exit")
    return resp


def current_user(authorization: Annotated[str | None, Header()] = None):
    ev("dependency current_user: runs before the handler")
    return "alice" if authorization == "Bearer sk_test_alice" else None


SCOPE_KEYS = ["type", "asgi", "http_version", "scheme", "method", "path", "query_string", "headers", "server", "client"]


@app.get("/trace")
async def trace(request: Request, user: Annotated[str | None, Depends(current_user)]):
    ev("handler: runs last, returns the response")
    s = request.scope
    out = {}
    for k in SCOPE_KEYS:
        v = s.get(k)
        if k == "headers":
            v = [[a.decode(), b.decode()] for a, b in v]
        elif isinstance(v, bytes):
            v = v.decode()
        elif isinstance(v, tuple):
            v = list(v)
        out[k] = v
    out["client"] = ["127.0.0.1", "(client port)"]
    return {"user": user, "scope": out}


# ---------- handler styles: the same 500 ms wait written three ways ----------
WAIT = float(os.environ.get("WAIT_S", "0.5"))


@app.get("/block")
async def block():                 # async def calling a blocking function: freezes the event loop
    time.sleep(WAIT)
    return {"pid": os.getpid()}


@app.get("/await")
async def await_():                # async def awaiting: the loop serves others meanwhile
    await asyncio.sleep(WAIT)
    return {"pid": os.getpid()}


@app.get("/thread")
def thread():                      # plain def: FastAPI runs it in a worker thread (AnyIO's pool)
    time.sleep(WAIT)
    return {"pid": os.getpid()}


@app.get("/pid")
async def pid():
    return {"pid": os.getpid()}


# ---------- background work ----------
async def follow_up(name: str, seconds: float):
    ev(f"{name}: background work starts")
    try:
        await asyncio.sleep(seconds)
        ev(f"{name}: background work done")
    except asyncio.CancelledError:
        ev(f"{name}: background work cancelled")
        raise


@app.get("/inline")
async def inline():
    await asyncio.sleep(0.5)       # the follow-up work, done before answering
    return {"ok": True}


@app.get("/bg")
async def bg(tasks: BackgroundTasks, seconds: float = 0.5, name: str = "bg"):
    tasks.add_task(follow_up, name, seconds)   # runs after the response is sent, in this same process
    return {"ok": True}


# ---------- a slow request, for the shutdown experiment ----------
@app.get("/slow")
async def slow(seconds: float = 3.0):
    ev("slow request: handler starts")
    try:
        await asyncio.sleep(seconds)
    except asyncio.CancelledError:
        ev("slow request: handler cancelled")
        raise
    ev("slow request: handler returns")
    return {"ok": True}
