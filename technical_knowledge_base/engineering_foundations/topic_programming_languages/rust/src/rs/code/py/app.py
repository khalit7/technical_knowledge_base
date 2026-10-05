"""The same service in FastAPI, for the comparison. Same routes, same rules, same JSON.
Run: uvicorn app:app --workers N   (uvloop and httptools are used when installed)."""
import asyncio
import json
from collections import Counter

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

app = FastAPI()
STATS = {"requests": 0, "tokens_counted": 0}   # per worker process (not shared across --workers)


def tokens(text: str) -> int:
    """Number of maximal runs of ASCII letters and digits (the root page's reference function)."""
    n, inside = 0, False
    for ch in text:
        is_tok = ch.isascii() and ch.isalnum()
        if is_tok and not inside:
            n += 1
        inside = is_tok
    return n


class CountReq(BaseModel):
    text: str


@app.get("/health", response_class=PlainTextResponse)
async def health():
    return "ok"


@app.post("/count")
async def count(req: CountReq):
    STATS["requests"] += 1
    if not req.text:
        raise HTTPException(400, "text is empty")
    n = tokens(req.text)
    STATS["tokens_counted"] += n
    return {"tokens": n}


def tally(body: bytes) -> dict:
    per_user: Counter[str] = Counter()
    lines = ok = bad = first_bad = 0
    for line in body.decode().splitlines():
        lines += 1
        try:
            rec = json.loads(line)
            user, text = rec["user"], rec["text"]
            if not isinstance(user, str) or not isinstance(text, str):
                raise TypeError
        except (ValueError, KeyError, TypeError):
            bad += 1
            first_bad = first_bad or lines
            continue
        ok += 1
        per_user[user] += tokens(text)
    top = sorted(per_user.items(), key=lambda kv: (-kv[1], kv[0]))[:5]
    return {"lines": lines, "ok": ok, "malformed": bad, "first_malformed": first_bad,
            "users": len(per_user), "tokens": sum(per_user.values()),
            "top": [{"user": u, "tokens": c} for u, c in top]}


@app.post("/count_log")
async def count_log(request: Request):
    STATS["requests"] += 1
    body = await request.body()
    # CPU-bound: run it on a worker thread so the event loop keeps serving (FastAPI's advice
    # for blocking work). The GIL still lets only one thread run Python at a time.
    report = await asyncio.to_thread(tally, body)
    STATS["tokens_counted"] += report["tokens"]
    return report


@app.get("/slow", response_class=PlainTextResponse)
async def slow(ms: int):
    await asyncio.sleep(ms / 1000)
    return f"slept {ms} ms\n"


@app.get("/stats")
async def stats():
    return STATS
