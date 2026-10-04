"""A tiny chat API for the page "Building a backend API" (the running example: an LLM chat product).

Run (from this folder):
  uv run --no-project --with fastapi --with uvicorn uvicorn app:app --port 8765
Everything is in one file on purpose so the page can walk through it line by line.
Storage is SQLite (Python's standard library) so it runs anywhere; a production service would use
Postgres with the same tables and the same SQL.
"""
import hashlib, hmac, json, os, sqlite3, time, uuid, asyncio
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, Request, Query
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, ConfigDict

app = FastAPI(title="Chat API (demo)", version="1.0.0")
DB = sqlite3.connect(os.environ.get("CHAT_DB", ":memory:"), check_same_thread=False, isolation_level=None)
DB.executescript("""
create table if not exists chats(id text primary key, owner text, title text, created_at integer);
create table if not exists messages(id text primary key, chat_id text, role text, content text, created_at integer);
create table if not exists credits(owner text primary key, balance integer);
create table if not exists idempotency_keys(
  owner text, key text, request_hash text, status text,         -- status: 'started' or 'done'
  response_code integer, response_body text, created_at integer,
  primary key(owner, key));
""")
API_KEYS = {hashlib.sha256(b"sk_test_alice").hexdigest(): "alice"}   # store a hash of the key, never the key
DB.execute("insert or ignore into credits values('alice', 1000)")
PROBLEM_JSON = os.environ.get("PROBLEM_JSON", "1") == "1"            # 0 shows FastAPI's default error shape


# ---------- errors: RFC 9457 problem details ----------
def problem(status: int, type_: str, title: str, detail: str, **extra) -> JSONResponse:
    body = {"type": f"https://chat.example.com/problems/{type_}", "title": title,
            "status": status, "detail": detail, **extra}
    return JSONResponse(body, status_code=status, media_type="application/problem+json")

class ProblemError(Exception):
    """A failure the client should see as an RFC 9457 problem."""
    def __init__(self, status: int, type_: str, title: str, detail: str,
                 headers: dict[str, str] | None = None):
        super().__init__(detail)
        self.status, self.type_, self.title, self.detail = status, type_, title, detail
        self.headers = headers or {}

@app.exception_handler(ProblemError)
async def on_problem(request: Request, exc: ProblemError):
    r = problem(exc.status, exc.type_, exc.title, exc.detail)
    r.headers.update(exc.headers)
    return r

if PROBLEM_JSON:
    @app.exception_handler(RequestValidationError)
    async def on_invalid(request: Request, exc: RequestValidationError):
        errors = []
        for e in exc.errors():
            where, *path = e["loc"]
            if e["type"] == "json_invalid":        # the body is not JSON at all: say where it broke
                errors.append({"pointer": "#", "detail": f"Invalid JSON at character {path[0]}"})
            elif where == "body":                  # a JSON Pointer (RFC 6901) into the request body
                errors.append({"pointer": "#/" + "/".join(str(p) for p in path), "detail": e["msg"]})
            else:                                  # a query parameter or header
                errors.append({"parameter": str(path[0]), "detail": e["msg"]})
        return problem(422, "validation-error", "Your request is not valid.",
                       f"{len(errors)} field(s) failed validation.", errors=errors)


# ---------- authentication: a bearer API key ----------
def who(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return API_KEYS.get(hashlib.sha256(authorization[7:].encode()).hexdigest())

def unauthorized() -> JSONResponse:
    r = problem(401, "unauthorized", "Missing or invalid API key.", "Send Authorization: Bearer <key>.")
    r.headers["WWW-Authenticate"] = 'Bearer realm="chat"'
    return r

def current_owner(authorization: Annotated[str | None, Header()] = None) -> str:
    """FastAPI dependency: the owner of a valid API key, or 401."""
    owner = who(authorization)
    if not owner:
        raise ProblemError(401, "unauthorized", "Missing or invalid API key.",
                           "Send Authorization: Bearer <key>.", {"WWW-Authenticate": 'Bearer realm="chat"'})
    return owner

Owner = Annotated[str, Depends(current_owner)]


# ---------- rate limiting: a token bucket per API key ----------
BUCKET = {"capacity": 5, "refill_per_s": 1.0}
buckets: dict[str, tuple[float, float]] = {}           # owner -> (tokens, last time)

def take_token(owner: str) -> tuple[bool, int, int]:
    tokens, last = buckets.get(owner, (BUCKET["capacity"], time.monotonic()))
    now = time.monotonic()
    tokens = min(BUCKET["capacity"], tokens + (now - last) * BUCKET["refill_per_s"])
    ok = tokens >= 1
    if ok:
        tokens -= 1
    buckets[owner] = (tokens, now)
    reset = 0 if tokens >= 1 else int((1 - tokens) / BUCKET["refill_per_s"] + 0.999)
    return ok, int(tokens), reset

def rate_headers(remaining: int, reset: int) -> dict:
    return {"RateLimit-Policy": '"burst";q=5;w=5', "RateLimit": f'"burst";r={remaining};t={reset}'}


def enforce_rate_limit(owner: str) -> dict[str, str]:
    """Take one token for this owner or raise 429. Returns the RateLimit headers."""
    ok, remaining, reset = take_token(owner)
    if not ok:
        raise ProblemError(429, "rate-limited", "Too many requests.", f"Retry in {reset} s.",
                           {"Retry-After": str(reset), **rate_headers(remaining, reset)})
    return rate_headers(remaining, reset)


# ---------- the data shapes (pydantic models) ----------
class ChatIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=200)

class MessageIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(min_length=1, max_length=32_000)
    model: Literal["small", "large"] = "small"
    max_tokens: int = Field(default=256, ge=1, le=4096)
    stream: bool = False

class Chat(BaseModel):
    id: str
    title: str
    created_at: int


# ---------- idempotency keys ----------
def request_fingerprint(chat_id: str, body: MessageIn) -> str:
    """Hash of everything that makes two requests 'the same request'."""
    return hashlib.sha256(body.model_dump_json().encode() + chat_id.encode()).hexdigest()

def claim_key(owner: str, key: str, fingerprint: str) -> JSONResponse | None:
    """Claim an idempotency key. None: this request owns it now. A response: replay it.
    Raises 422 if the key was used for a different request, 409 if that one is still running."""
    try:
        DB.execute("insert into idempotency_keys values(?,?,?,'started',null,null,?)",
                   (owner, key, fingerprint, int(time.time())))
        return None
    except sqlite3.IntegrityError:
        status, old_hash, code, saved = DB.execute(
            "select status,request_hash,response_code,response_body from idempotency_keys where owner=? and key=?",
            (owner, key)).fetchone()
    if old_hash != fingerprint:
        raise ProblemError(422, "idempotency-key-reused", "Idempotency-Key reused with a different request.",
                           "Use a new key for a new message.")
    if status == "started":
        raise ProblemError(409, "idempotency-key-in-use", "A request with this key is still in progress.",
                           "Retry after it finishes.")
    return JSONResponse(json.loads(saved), status_code=code, headers={"Idempotent-Replayed": "true"})

def release_key(owner: str, key: str) -> None:
    """Give a key back when the request ends without a stored response."""
    DB.execute("delete from idempotency_keys where owner=? and key=?", (owner, key))

def require_key(key: str | None) -> str:
    if not key:
        raise ProblemError(400, "idempotency-key-missing", "Idempotency-Key header required.",
                           "Generate a UUID per logical message and resend it on every retry.")
    return key

def chat_exists(owner: str, chat_id: str) -> bool:
    return DB.execute("select 1 from chats where id=? and owner=?", (chat_id, owner)).fetchone() is not None


# ---------- the reply: a pure decision, then one transaction ----------
def make_reply(content: str) -> str:
    return "Echo: " + content[:40]

def save_reply(owner: str, chat_id: str, key: str, reply: str) -> dict:
    """The message, the charge and the stored response commit together or not at all."""
    msg_id = "msg_" + uuid.uuid4().hex[:12]
    DB.execute("begin")
    DB.execute("insert into messages values(?,?,?,?,?)", (msg_id, chat_id, "assistant", reply, int(time.time())))
    DB.execute("update credits set balance = balance - 10 where owner=?", (owner,))
    out = {"id": msg_id, "chat_id": chat_id, "role": "assistant", "content": reply,
           "credits_left": DB.execute("select balance from credits where owner=?", (owner,)).fetchone()[0]}
    DB.execute("update idempotency_keys set status='done', response_code=201, response_body=? "
               "where owner=? and key=?", (json.dumps(out), owner, key))
    DB.execute("commit")
    return out


# ---------- endpoints ----------
@app.get("/v1/health")
def health():
    return {"ok": True}

@app.post("/v1/chats", status_code=201)
def create_chat(body: ChatIn, owner: Owner):
    chat = Chat(id="chat_" + uuid.uuid4().hex[:12], title=body.title, created_at=int(time.time()))
    DB.execute("insert into chats values(?,?,?,?)", (chat.id, owner, chat.title, chat.created_at))
    return JSONResponse(chat.model_dump(), status_code=201, headers={"Location": f"/v1/chats/{chat.id}"})

@app.get("/v1/chats/{chat_id}")
def get_chat(chat_id: str, owner: Owner):
    row = DB.execute("select id,title,created_at from chats where id=? and owner=?", (chat_id, owner)).fetchone()
    if not row:
        return problem(404, "not-found", "Chat not found.", f"No chat {chat_id} for this API key.")
    return Chat(id=row[0], title=row[1], created_at=row[2])

@app.get("/v1/chats")
def list_chats(owner: Owner,
               limit: Annotated[int, Query(ge=1, le=100)] = 20, cursor: str | None = None):
    # keyset (cursor) pagination: the cursor is the (created_at, id) of the last row already seen
    after = (0, "")
    if cursor:
        after = tuple(json.loads(bytes.fromhex(cursor)))
    rows = DB.execute("select id,title,created_at from chats where owner=? and (created_at,id) > (?,?) "
                      "order by created_at,id limit ?", (owner, after[0], after[1], limit + 1)).fetchall()
    page, more = rows[:limit], len(rows) > limit
    nxt = json.dumps([page[-1][2], page[-1][0]]).encode().hex() if more else None
    return {"data": [Chat(id=r[0], title=r[1], created_at=r[2]) for r in page], "next_cursor": nxt}

@app.post("/v1/chats/{chat_id}/messages", status_code=201)
async def send_message(chat_id: str, body: MessageIn,
                       owner: Owner,
                       idempotency_key: Annotated[str | None, Header(max_length=255)] = None):
    limit_headers = enforce_rate_limit(owner)
    key = require_key(idempotency_key)
    if replay := claim_key(owner, key, request_fingerprint(chat_id, body)):
        return replay
    if not chat_exists(owner, chat_id):
        release_key(owner, key)
        raise ProblemError(404, "not-found", "Chat not found.", f"No chat {chat_id} for this API key.")
    if body.stream:
        release_key(owner, key)
        return StreamingResponse(fake_stream(body.content), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache"})
    await asyncio.sleep(float(os.environ.get("SLOW_S", "0")))         # pretend the model takes a while
    out = save_reply(owner, chat_id, key, make_reply(body.content))
    return JSONResponse(out, status_code=201, headers=limit_headers)


async def fake_stream(prompt: str):
    """Server-sent events, shaped like an LLM provider's stream (a start event, deltas, a stop event)."""
    yield 'event: message_start\ndata: {"id":"msg_demo"}\n\n'
    for i, word in enumerate(["Here", " is", " a", " short", " reply."]):
        await asyncio.sleep(0.05)
        yield f'id: {i}\nevent: delta\ndata: {json.dumps({"text": word})}\n\n'
    yield 'event: message_stop\ndata: {"finish_reason":"stop"}\n\n'


# ---------- webhooks: how the server signs an event it sends out (Standard Webhooks scheme) ----------
def sign_webhook(secret: bytes, msg_id: str, ts: int, payload: str) -> str:
    signed = f"{msg_id}.{ts}.{payload}".encode()
    import base64
    return "v1," + base64.b64encode(hmac.new(secret, signed, hashlib.sha256).digest()).decode()
