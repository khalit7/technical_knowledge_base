"""Write steps/step1.py ... steps/stepN.py from steps/step0.py (the real send_message handler of the
backend API page's demo service), one small refactoring per step.

Each step is a list of exact text replacements applied to the previous step; every `old` must occur
exactly once (or `count` times), so a step can never silently do nothing. run_steps.py then runs the
characterization tests and the metrics on every step.
"""
import json, pathlib

HERE = pathlib.Path(__file__).parent
S = HERE / "steps"

AUTH3 = "    owner = who(authorization)\n    if not owner:\n        return unauthorized()\n"

STEPS = [
    {"title": "Pin the behaviour with tests",
     "why": "14 characterization tests record what the handler does today, good or bad. Nothing in the code changes.",
     "edits": []},

    {"title": "Errors become exceptions",
     "why": "A ProblemError exception and one handler that turns it into an RFC 9457 response. The handler raises instead of building responses, so a helper can fail without returning a special value.",
     "edits": [
        ("def problem(status: int, type_: str, title: str, detail: str, **extra) -> JSONResponse:\n"
         "    body = {\"type\": f\"https://chat.example.com/problems/{type_}\", \"title\": title,\n"
         "            \"status\": status, \"detail\": detail, **extra}\n"
         "    return JSONResponse(body, status_code=status, media_type=\"application/problem+json\")\n",
         "def problem(status: int, type_: str, title: str, detail: str, **extra) -> JSONResponse:\n"
         "    body = {\"type\": f\"https://chat.example.com/problems/{type_}\", \"title\": title,\n"
         "            \"status\": status, \"detail\": detail, **extra}\n"
         "    return JSONResponse(body, status_code=status, media_type=\"application/problem+json\")\n\n"
         "class ProblemError(Exception):\n"
         "    \"\"\"A failure the client should see as an RFC 9457 problem.\"\"\"\n"
         "    def __init__(self, status: int, type_: str, title: str, detail: str,\n"
         "                 headers: dict[str, str] | None = None):\n"
         "        super().__init__(detail)\n"
         "        self.status, self.type_, self.title, self.detail = status, type_, title, detail\n"
         "        self.headers = headers or {}\n\n"
         "@app.exception_handler(ProblemError)\n"
         "async def on_problem(request: Request, exc: ProblemError):\n"
         "    r = problem(exc.status, exc.type_, exc.title, exc.detail)\n"
         "    r.headers.update(exc.headers)\n"
         "    return r\n"),
        ("        r = problem(429, \"rate-limited\", \"Too many requests.\", f\"Retry in {reset} s.\")\n"
         "        r.headers.update({\"Retry-After\": str(reset), **rate_headers(remaining, reset)})\n"
         "        return r\n",
         "        raise ProblemError(429, \"rate-limited\", \"Too many requests.\", f\"Retry in {reset} s.\",\n"
         "                           {\"Retry-After\": str(reset), **rate_headers(remaining, reset)})\n"),
        ("        return problem(400, \"idempotency-key-missing\"", "        raise ProblemError(400, \"idempotency-key-missing\""),
        ("            return problem(422, \"idempotency-key-reused\"", "            raise ProblemError(422, \"idempotency-key-reused\""),
        ("            return problem(409, \"idempotency-key-in-use\"", "            raise ProblemError(409, \"idempotency-key-in-use\""),
        ("        DB.execute(\"delete from idempotency_keys where owner=? and key=?\", (owner, idempotency_key))\n"
         "        return problem(404,",
         "        DB.execute(\"delete from idempotency_keys where owner=? and key=?\", (owner, idempotency_key))\n"
         "        raise ProblemError(404,"),
     ]},

    {"title": "Extract enforce_rate_limit()",
     "why": "Five lines about tokens become one call with a name. The helper raises 429 itself and returns the headers the success response needs.",
     "edits": [
        ("# ---------- the data shapes (pydantic models) ----------\n",
         "def enforce_rate_limit(owner: str) -> dict[str, str]:\n"
         "    \"\"\"Take one token for this owner or raise 429. Returns the RateLimit headers.\"\"\"\n"
         "    ok, remaining, reset = take_token(owner)\n"
         "    if not ok:\n"
         "        raise ProblemError(429, \"rate-limited\", \"Too many requests.\", f\"Retry in {reset} s.\",\n"
         "                           {\"Retry-After\": str(reset), **rate_headers(remaining, reset)})\n"
         "    return rate_headers(remaining, reset)\n\n\n"
         "# ---------- the data shapes (pydantic models) ----------\n"),
        ("    ok, remaining, reset = take_token(owner)\n"
         "    if not ok:\n"
         "        raise ProblemError(429, \"rate-limited\", \"Too many requests.\", f\"Retry in {reset} s.\",\n"
         "                           {\"Retry-After\": str(reset), **rate_headers(remaining, reset)})\n"
         "    if not idempotency_key:",
         "    limit_headers = enforce_rate_limit(owner)\n"
         "    if not idempotency_key:"),
        ("headers=rate_headers(remaining, reset))\n\n\nasync def fake_stream",
         "headers=limit_headers)\n\n\nasync def fake_stream"),
     ]},

    {"title": "Name the fingerprint: request_fingerprint()",
     "why": "A pure function: same inputs, same output, no database. The handler stops spelling out how a request is hashed.",
     "edits": [
        ("# ---------- endpoints ----------\n",
         "# ---------- idempotency keys ----------\n"
         "def request_fingerprint(chat_id: str, body: MessageIn) -> str:\n"
         "    \"\"\"Hash of everything that makes two requests 'the same request'.\"\"\"\n"
         "    return hashlib.sha256(body.model_dump_json().encode() + chat_id.encode()).hexdigest()\n\n\n"
         "# ---------- endpoints ----------\n"),
        ("    req_hash = hashlib.sha256(body.model_dump_json().encode() + chat_id.encode()).hexdigest()\n",
         "    req_hash = request_fingerprint(chat_id, body)\n"),
     ]},

    {"title": "Extract claim_key()",
     "why": "The 15-line try/except that claims a key moves behind one name. It returns a saved response to replay, or None when this request now owns the key.",
     "edits": [
        ("\n\n# ---------- endpoints ----------\n",
         "\n"
         "def claim_key(owner: str, key: str, fingerprint: str) -> JSONResponse | None:\n"
         "    \"\"\"Claim an idempotency key. None: this request owns it now. A response: replay it.\n"
         "    Raises 422 if the key was used for a different request, 409 if that one is still running.\"\"\"\n"
         "    try:\n"
         "        DB.execute(\"insert into idempotency_keys values(?,?,?,'started',null,null,?)\",\n"
         "                   (owner, key, fingerprint, int(time.time())))\n"
         "        return None\n"
         "    except sqlite3.IntegrityError:\n"
         "        status, old_hash, code, saved = DB.execute(\n"
         "            \"select status,request_hash,response_code,response_body from idempotency_keys where owner=? and key=?\",\n"
         "            (owner, key)).fetchone()\n"
         "    if old_hash != fingerprint:\n"
         "        raise ProblemError(422, \"idempotency-key-reused\", \"Idempotency-Key reused with a different request.\",\n"
         "                           \"Use a new key for a new message.\")\n"
         "    if status == \"started\":\n"
         "        raise ProblemError(409, \"idempotency-key-in-use\", \"A request with this key is still in progress.\",\n"
         "                           \"Retry after it finishes.\")\n"
         "    return JSONResponse(json.loads(saved), status_code=code, headers={\"Idempotent-Replayed\": \"true\"})\n"
         "\n\n# ---------- endpoints ----------\n"),
        ("    # 1. claim the key atomically: the primary key makes a second insert fail\n"
         "    try:\n"
         "        DB.execute(\"insert into idempotency_keys values(?,?,?,'started',null,null,?)\",\n"
         "                   (owner, idempotency_key, req_hash, int(time.time())))\n"
         "    except sqlite3.IntegrityError:\n"
         "        status, old_hash, code, saved = DB.execute(\n"
         "            \"select status,request_hash,response_code,response_body from idempotency_keys where owner=? and key=?\",\n"
         "            (owner, idempotency_key)).fetchone()\n"
         "        if old_hash != req_hash:\n"
         "            raise ProblemError(422, \"idempotency-key-reused\", \"Idempotency-Key reused with a different request.\",\n"
         "                           \"Use a new key for a new message.\")\n"
         "        if status == \"started\":\n"
         "            raise ProblemError(409, \"idempotency-key-in-use\", \"A request with this key is still in progress.\",\n"
         "                           \"Retry after it finishes.\")\n"
         "        return JSONResponse(json.loads(saved), status_code=code, headers={\"Idempotent-Replayed\": \"true\"})\n",
         "    # 1. claim the key atomically: the primary key makes a second insert fail\n"
         "    replay = claim_key(owner, idempotency_key, req_hash)\n"
         "    if replay:\n"
         "        return replay\n"),
     ]},

    {"title": "Name the duplicate: release_key()",
     "why": "The same DELETE appeared twice. A named function says why it runs (give the key back) and keeps the two copies from drifting apart.",
     "edits": [
        ("\n\n# ---------- endpoints ----------\n",
         "\n"
         "def release_key(owner: str, key: str) -> None:\n"
         "    \"\"\"Give a key back when the request ends without a stored response.\"\"\"\n"
         "    DB.execute(\"delete from idempotency_keys where owner=? and key=?\", (owner, key))\n"
         "\n\n# ---------- endpoints ----------\n"),
        ("        DB.execute(\"delete from idempotency_keys where owner=? and key=?\", (owner, idempotency_key))\n",
         "        release_key(owner, idempotency_key)\n", 2),
     ]},

    {"title": "Split core from shell: make_reply() and save_reply()",
     "why": "Deciding the reply is pure (make_reply). Writing it is I/O (save_reply: one transaction). The handler only wires them together.",
     "edits": [
        ("\n\n# ---------- endpoints ----------\n",
         "\n\n# ---------- the reply: a pure decision, then one transaction ----------\n"
         "def make_reply(content: str) -> str:\n"
         "    return \"Echo: \" + content[:40]\n\n"
         "def save_reply(owner: str, chat_id: str, key: str, reply: str) -> dict:\n"
         "    \"\"\"The message, the charge and the stored response commit together or not at all.\"\"\"\n"
         "    msg_id = \"msg_\" + uuid.uuid4().hex[:12]\n"
         "    DB.execute(\"begin\")\n"
         "    DB.execute(\"insert into messages values(?,?,?,?,?)\", (msg_id, chat_id, \"assistant\", reply, int(time.time())))\n"
         "    DB.execute(\"update credits set balance = balance - 10 where owner=?\", (owner,))\n"
         "    out = {\"id\": msg_id, \"chat_id\": chat_id, \"role\": \"assistant\", \"content\": reply,\n"
         "           \"credits_left\": DB.execute(\"select balance from credits where owner=?\", (owner,)).fetchone()[0]}\n"
         "    DB.execute(\"update idempotency_keys set status='done', response_code=201, response_body=? \"\n"
         "               \"where owner=? and key=?\", (json.dumps(out), owner, key))\n"
         "    DB.execute(\"commit\")\n"
         "    return out\n"
         "\n\n# ---------- endpoints ----------\n"),
        ("    msg_id = \"msg_\" + uuid.uuid4().hex[:12]\n"
         "    reply = \"Echo: \" + body.content[:40]\n"
         "    # 3. one transaction: the message, the charge and the stored response commit together or not at all\n"
         "    DB.execute(\"begin\")\n"
         "    DB.execute(\"insert into messages values(?,?,?,?,?)\", (msg_id, chat_id, \"assistant\", reply, int(time.time())))\n"
         "    DB.execute(\"update credits set balance = balance - 10 where owner=?\", (owner,))\n"
         "    out = {\"id\": msg_id, \"chat_id\": chat_id, \"role\": \"assistant\", \"content\": reply,\n"
         "           \"credits_left\": DB.execute(\"select balance from credits where owner=?\", (owner,)).fetchone()[0]}\n"
         "    DB.execute(\"update idempotency_keys set status='done', response_code=201, response_body=? \"\n"
         "               \"where owner=? and key=?\", (json.dumps(out), owner, idempotency_key))\n"
         "    DB.execute(\"commit\")\n",
         "    # 3. one transaction: the message, the charge and the stored response\n"
         "    out = save_reply(owner, chat_id, idempotency_key, make_reply(body.content))\n"),
     ]},

    {"title": "Auth becomes a dependency (four copies, one function)",
     "why": "Every endpoint repeated the same three auth lines. A FastAPI dependency raises 401 once for all four. One test goes red: see the next step.",
     "edits": [
        ("from fastapi import FastAPI, Header, Request, Query\n",
         "from fastapi import Depends, FastAPI, Header, Request, Query\n"),
        ("\n\n# ---------- rate limiting: a token bucket per API key ----------\n",
         "\n"
         "def current_owner(authorization: Annotated[str | None, Header()] = None) -> str:\n"
         "    \"\"\"FastAPI dependency: the owner of a valid API key, or 401.\"\"\"\n"
         "    owner = who(authorization)\n"
         "    if not owner:\n"
         "        raise ProblemError(401, \"unauthorized\", \"Missing or invalid API key.\",\n"
         "                           \"Send Authorization: Bearer <key>.\", {\"WWW-Authenticate\": 'Bearer realm=\"chat\"'})\n"
         "    return owner\n\n"
         "Owner = Annotated[str, Depends(current_owner)]\n"
         "\n\n# ---------- rate limiting: a token bucket per API key ----------\n"),
        ("def create_chat(body: ChatIn, authorization: Annotated[str | None, Header()] = None):\n" + AUTH3,
         "def create_chat(body: ChatIn, owner: Owner):\n"),
        ("def get_chat(chat_id: str, authorization: Annotated[str | None, Header()] = None):\n" + AUTH3,
         "def get_chat(chat_id: str, owner: Owner):\n"),
        ("def list_chats(authorization: Annotated[str | None, Header()] = None,\n"
         "               limit: Annotated[int, Query(ge=1, le=100)] = 20, cursor: str | None = None):\n" + AUTH3,
         "def list_chats(owner: Owner,\n"
         "               limit: Annotated[int, Query(ge=1, le=100)] = 20, cursor: str | None = None):\n"),
        ("                       authorization: Annotated[str | None, Header()] = None,\n"
         "                       idempotency_key: Annotated[str | None, Header(max_length=255)] = None):\n" + AUTH3,
         "                       owner: Owner,\n"
         "                       idempotency_key: Annotated[str | None, Header(max_length=255)] = None):\n"),
     ]},
]

# STEP 8 depends on what the tests say about step 7; it is written by hand below.
STEP_FINAL = {"title": "Decide, then tidy: the handler reads top to bottom",
     "why": "The red test was a real behaviour change (401 now wins over 422). Checking identity first is what we want, so the test is updated in its own reviewed commit; then the handler is tidied to one level of abstraction.",
     "edits": [
        ("    limit_headers = enforce_rate_limit(owner)\n"
         "    if not idempotency_key:\n"
         "        raise ProblemError(400, \"idempotency-key-missing\", \"Idempotency-Key header required.\",\n"
         "                       \"Generate a UUID per logical message and resend it on every retry.\")\n"
         "    req_hash = request_fingerprint(chat_id, body)\n"
         "    # 1. claim the key atomically: the primary key makes a second insert fail\n"
         "    replay = claim_key(owner, idempotency_key, req_hash)\n"
         "    if replay:\n"
         "        return replay\n"
         "    # 2. do the work once: store the message, charge credits, \"call the model\"\n"
         "    if not DB.execute(\"select 1 from chats where id=? and owner=?\", (chat_id, owner)).fetchone():\n",
         "    limit_headers = enforce_rate_limit(owner)\n"
         "    key = require_key(idempotency_key)\n"
         "    if replay := claim_key(owner, key, request_fingerprint(chat_id, body)):\n"
         "        return replay\n"
         "    if not chat_exists(owner, chat_id):\n"),
        ("        release_key(owner, idempotency_key)\n        raise ProblemError(404,",
         "        release_key(owner, key)\n        raise ProblemError(404,"),
        ("        release_key(owner, idempotency_key)\n        return StreamingResponse(",
         "        release_key(owner, key)\n        return StreamingResponse("),
        ("    await asyncio.sleep(float(os.environ.get(\"SLOW_S\", \"0\")))         # pretend the model takes a while\n"
         "    # 3. one transaction: the message, the charge and the stored response\n"
         "    out = save_reply(owner, chat_id, idempotency_key, make_reply(body.content))\n",
         "    await asyncio.sleep(float(os.environ.get(\"SLOW_S\", \"0\")))         # pretend the model takes a while\n"
         "    out = save_reply(owner, chat_id, key, make_reply(body.content))\n"),
        ("\n\n# ---------- the reply: a pure decision, then one transaction ----------\n",
         "\n"
         "def require_key(key: str | None) -> str:\n"
         "    if not key:\n"
         "        raise ProblemError(400, \"idempotency-key-missing\", \"Idempotency-Key header required.\",\n"
         "                           \"Generate a UUID per logical message and resend it on every retry.\")\n"
         "    return key\n\n"
         "def chat_exists(owner: str, chat_id: str) -> bool:\n"
         "    return DB.execute(\"select 1 from chats where id=? and owner=?\", (chat_id, owner)).fetchone() is not None\n"
         "\n\n# ---------- the reply: a pure decision, then one transaction ----------\n"),
     ]}
STEPS.append(STEP_FINAL)

STEP_DEEP = {"title": "Deepen: one object owns the key's lifetime",
     "why": "Steps 5 and 6 left the handler responsible for releasing the key on two paths (information leakage, in Ousterhout's terms). A context manager claims the key and releases it on every exit that did not save a response, including a crash: a latent bug in every earlier step.",
     "edits": [
        ("from typing import Annotated, Literal\n",
         "from typing import Annotated, Literal\nfrom contextlib import contextmanager\nfrom collections.abc import Iterator\n"),
        ("\n\n# ---------- the reply: a pure decision, then one transaction ----------\n",
         "\n"
         "@contextmanager\n"
         "def idempotency_claim(owner: str, key: str, fingerprint: str) -> Iterator[JSONResponse | None]:\n"
         "    \"\"\"Claim the key for the duration of the block; yields a saved response to replay, or None.\n"
         "    On any exit without a stored response (an error, a 404, a stream, a crash) the key is released.\"\"\"\n"
         "    replay = claim_key(owner, key, fingerprint)\n"
         "    try:\n"
         "        yield replay\n"
         "    finally:\n"
         "        if replay is None:\n"
         "            DB.execute(\"delete from idempotency_keys where owner=? and key=? and status='started'\", (owner, key))\n"
         "\n\n# ---------- the reply: a pure decision, then one transaction ----------\n"),
        ("    if replay := claim_key(owner, key, request_fingerprint(chat_id, body)):\n"
         "        return replay\n"
         "    if not chat_exists(owner, chat_id):\n"
         "        release_key(owner, key)\n"
         "        raise ProblemError(404, \"not-found\", \"Chat not found.\", f\"No chat {chat_id} for this API key.\")\n"
         "    if body.stream:\n"
         "        release_key(owner, key)\n"
         "        return StreamingResponse(fake_stream(body.content), media_type=\"text/event-stream\",\n"
         "                                 headers={\"Cache-Control\": \"no-cache\"})\n"
         "    await asyncio.sleep(float(os.environ.get(\"SLOW_S\", \"0\")))         # pretend the model takes a while\n"
         "    out = save_reply(owner, chat_id, key, make_reply(body.content))\n",
         "    with idempotency_claim(owner, key, request_fingerprint(chat_id, body)) as replay:\n"
         "        if replay:\n"
         "            return replay\n"
         "        if not chat_exists(owner, chat_id):\n"
         "            raise ProblemError(404, \"not-found\", \"Chat not found.\", f\"No chat {chat_id} for this API key.\")\n"
         "        if body.stream:\n"
         "            return StreamingResponse(fake_stream(body.content), media_type=\"text/event-stream\",\n"
         "                                     headers={\"Cache-Control\": \"no-cache\"})\n"
         "        await asyncio.sleep(float(os.environ.get(\"SLOW_S\", \"0\")))     # pretend the model takes a while\n"
         "        out = save_reply(owner, chat_id, key, make_reply(body.content))\n"),
     ]}
STEP_DEEP["edits"].append(
    ("def release_key(owner: str, key: str) -> None:\n"
     "    \"\"\"Give a key back when the request ends without a stored response.\"\"\"\n"
     "    DB.execute(\"delete from idempotency_keys where owner=? and key=?\", (owner, key))\n\n", ""))
STEPS.append(STEP_DEEP)


def apply(src: str, edits) -> str:
    for e in edits:
        old, new = e[0], e[1]
        n = e[2] if len(e) > 2 else 1
        c = src.count(old)
        assert c == n, f"expected {n} match(es), found {c}: {old[:80]!r}"
        src = src.replace(old, new)
    return src


if __name__ == "__main__":
    src = (S / "step0.py").read_text()
    meta = [{"step": 0, "title": "The handler as it is", "why": "The real send_message handler from the backend API page's demo service: 52 lines doing authentication, rate limiting, idempotency, storage and the model call inline."}]
    for i, st in enumerate(STEPS, start=1):
        src = apply(src, st["edits"])
        (S / f"step{i}.py").write_text(src)
        meta.append({"step": i, "title": st["title"], "why": st["why"]})
    (HERE / "steps_meta.json").write_text(json.dumps(meta, indent=1))
    print(len(meta), "steps written")
