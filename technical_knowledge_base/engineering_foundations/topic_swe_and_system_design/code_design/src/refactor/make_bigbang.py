"""Write steps/bigbang.py: the same end state reached in one rewrite instead of nine small steps.

Written for this page. The three bugs are planted, but each is the kind a rewrite introduces when
nobody runs the old tests: a detail of the hash forgotten, a cleanup path dropped, a header lost.
"""
import pathlib
S = pathlib.Path(__file__).parent / "steps"
src = (S / "step9.py").read_text()
a = src.index('@app.post("/v1/chats/{chat_id}/messages"')
b = src.index("async def fake_stream")
NEW = '''class MessageService:
    """Everything about sending a message, in one place (rewritten in one go)."""
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def fingerprint(self, body: MessageIn) -> str:
        return hashlib.sha256(body.model_dump_json().encode()).hexdigest()

    def claim(self, owner: str, key: str, fp: str) -> dict | None:
        row = self.db.execute("select status,request_hash,response_body from idempotency_keys "
                              "where owner=? and key=?", (owner, key)).fetchone()
        if row is None:
            self.db.execute("insert into idempotency_keys values(?,?,?,'started',null,null,?)",
                            (owner, key, fp, int(time.time())))
            return None
        status, old_fp, saved = row
        if old_fp != fp:
            raise ProblemError(422, "idempotency-key-reused", "Idempotency-Key reused with a different request.",
                               "Use a new key for a new message.")
        if status == "started":
            raise ProblemError(409, "idempotency-key-in-use", "A request with this key is still in progress.",
                               "Retry after it finishes.")
        return json.loads(saved)

    def send(self, owner: str, chat_id: str, key: str, body: MessageIn) -> dict:
        saved = self.claim(owner, key, self.fingerprint(body))
        if saved is not None:
            return saved
        if not chat_exists(owner, chat_id):
            raise ProblemError(404, "not-found", "Chat not found.", f"No chat {chat_id} for this API key.")
        return save_reply(owner, chat_id, key, make_reply(body.content))


service = MessageService(DB)


@app.post("/v1/chats/{chat_id}/messages", status_code=201)
async def send_message(chat_id: str, body: MessageIn, owner: Owner,
                       idempotency_key: Annotated[str | None, Header(max_length=255)] = None):
    limit_headers = enforce_rate_limit(owner)
    key = require_key(idempotency_key)
    if body.stream:
        return StreamingResponse(fake_stream(body.content), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache"})
    await asyncio.sleep(float(os.environ.get("SLOW_S", "0")))
    return JSONResponse(service.send(owner, chat_id, key, body), status_code=201, headers=limit_headers)


'''
(S / "bigbang.py").write_text(src[:a] + NEW + src[b:])
print("bigbang written")
