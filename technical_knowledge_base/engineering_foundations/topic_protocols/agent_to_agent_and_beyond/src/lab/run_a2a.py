"""Two agents talking A2A 1.0, recorded byte for byte. Usage: python run_a2a.py out/a2a.json
Team A's orchestrator (A2A client, official SDK a2a-sdk 1.2.2) delegates "evaluate this checkpoint" to team B's
eval agent (eval_agent.py, official SDK server). Both are scripted: no model is called anywhere. A raw TCP tap
between them keeps every byte; raw httpx requests are used only where a scenario needs a malformed or hostile request.
Ports (127.0.0.1): 30811 agent, 30801 tap in front of it; 30812 a second agent that screens push URLs;
30821 team A's webhook receiver."""
import asyncio, json, sys, time, uuid
import httpx, uvicorn
from starlette.applications import Starlette
from starlette.responses import Response
from starlette.routing import Route
from google.protobuf.json_format import MessageToDict
from a2a.client import A2ACardResolver, ClientConfig, create_client
from a2a.helpers import new_text_message
from a2a.types import Role, SendMessageRequest, GetTaskRequest, SendMessageConfiguration, TaskPushNotificationConfig, AuthenticationInfo
import eval_agent as EA
from tcp_tap import Tap

TOK_A, TOK_C = "lab-token-team-a", "lab-token-team-c"
OUT = {}
HOOK = []


def d(m):
    return MessageToDict(m) if hasattr(m, "DESCRIPTOR") else m


async def serve(app, port):
    s = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning", lifespan="off"))
    asyncio.create_task(s.serve())
    for _ in range(100):
        if s.started:
            return s
        await asyncio.sleep(0.05)
    raise RuntimeError("server did not start")


async def hook(request):
    body = await request.body()
    HOOK.append({"t": time.perf_counter(), "headers": {k: v for k, v in request.headers.items() if k in
                 ("content-type", "authorization", "x-a2a-notification-token", "content-length", "user-agent")}, "body": json.loads(body)})
    return Response(status_code=204)


def rec(tap, name, extra):
    w = tap.ordered(); up, down, conns = tap.totals()
    OUT[name] = {"wire": w, "reads": tap.raw(), "bytes_up": up, "bytes_down": down, "connections": conns, **extra}
    tap.reset(); tap.conns.clear()
    print(name, "up", up, "down", down, "conns", conns)


def msg(text, task=None, ctx=None):
    m = new_text_message(text, role=Role.ROLE_USER)
    if task: m.task_id = task
    if ctx: m.context_id = ctx
    return m


async def sdk_client(token, bindings=("JSONRPC",), streaming=True, port=30801, push=None):
    """Discovery with an unauthenticated client (the card is public: no credential goes to it), then a client
    whose every request carries the caller's bearer token."""
    async with httpx.AsyncClient() as anon:
        card = await A2ACardResolver(httpx_client=anon, base_url=f"http://127.0.0.1:{port}").get_agent_card()
    hc = httpx.AsyncClient(headers={"Authorization": f"Bearer {token}"} if token else {}, timeout=30)
    c = await create_client(card, client_config=ClientConfig(streaming=streaming, httpx_client=hc,
                            supported_protocol_bindings=list(bindings), push_notification_config=push))
    return c, hc


async def collect(client, req):
    ev = []
    async for ch in client.send_message(req):
        ev.append(d(ch))
    return ev


def rpc(method, params, rid=1):
    return {"jsonrpc": "2.0", "id": rid, "method": method, "params": params}


async def raw(path, body=None, token=TOK_A, headers=None, method="POST", port=30801, stream_events=None):
    """One raw HTTP request through the tap (used for hostile or malformed requests only)."""
    h = {"Authorization": f"Bearer {token}"} if token else {}
    h.update({"A2A-Version": "1.0", **(headers or {})})
    async with httpx.AsyncClient(timeout=30) as hc:
        if isinstance(body, (bytes, str)):
            r = await hc.request(method, f"http://127.0.0.1:{port}{path}", content=body, headers={**h, "Content-Type": "application/json"})
        else:
            r = await hc.request(method, f"http://127.0.0.1:{port}{path}", json=body, headers=h)
    try:
        j = r.json()
    except Exception:
        j = r.text
    return {"status": r.status_code, "body": j}


async def s_discovery(tap):
    async with httpx.AsyncClient() as hc:
        r1 = await hc.get("http://127.0.0.1:30801/.well-known/agent-card.json")
        r2 = await hc.get("http://127.0.0.1:30801/.well-known/agent-card.json", headers={"If-None-Match": r1.headers["etag"]})
    rec(tap, "discovery", {"card": r1.json(), "status": [r1.status_code, r2.status_code], "card_bytes": len(r1.content)})


async def s_noauth(tap):
    c, hc = await sdk_client(None, streaming=False)
    try:
        await collect(c, SendMessageRequest(message=msg("Evaluate checkpoint step-4000 on gsm-mini.")))
        err = None
    except Exception as e:
        err = f"{type(e).__name__}: {str(e)[:200]}"
    await hc.aclose()
    rec(tap, "no_token", {"client_error": err})


async def s_main(tap):
    """The running example: discovery, a streamed task that stops at input-required, a follow-up, then GetTask."""
    c, hc = await sdk_client(TOK_A)
    t0 = time.perf_counter()
    ev1 = await collect(c, SendMessageRequest(message=msg("Evaluate checkpoint step-4000 of our 1B run.")))
    task = ev1[0]["task"]
    ev2 = await collect(c, SendMessageRequest(message=msg("gsm-mini, please.", task["id"], task["contextId"])))
    final = d(await c.get_task(GetTaskRequest(id=task["id"])))
    wall = round((time.perf_counter() - t0) * 1000)
    await hc.aclose()
    rec(tap, "main", {"turn1": ev1, "turn2": ev2, "get_task": final, "wall_ms": wall, "task_id": task["id"], "context_id": task["contextId"]})
    return task


async def s_errors(tap, task):
    """Each request breaks one rule; the agent's answers are recorded as they came."""
    tid, ctx = task["id"], task["contextId"]
    m = lambda text, **k: {"message": {"messageId": str(uuid.uuid4()), "role": "ROLE_USER", "parts": [{"text": text}], **k}}
    cases = [
        ("message_to_completed_task", "/a2a/jsonrpc", rpc("SendMessage", m("and mmlu-mini too", taskId=tid, contextId=ctx)), {}),
        ("cancel_completed_task", "/a2a/jsonrpc", rpc("CancelTask", {"id": tid}), {}),
        ("unknown_task", "/a2a/jsonrpc", rpc("GetTask", {"id": "no-such-task"}), {}),
        ("other_callers_task", "/a2a/jsonrpc", rpc("GetTask", {"id": tid}), {"token": TOK_C}),
        ("context_mismatch", "/a2a/jsonrpc", rpc("SendMessage", m("hi", taskId=tid, contextId="another-context")), {}),
        ("unsupported_version", "/a2a/jsonrpc", rpc("GetTask", {"id": tid}), {"headers": {"A2A-Version": "9.9"}}),
        ("no_version_header_means_0_3", "/a2a/jsonrpc", rpc("GetTask", {"id": tid}), {"headers": {"A2A-Version": ""}}),
        ("v0_3_method_name", "/a2a/jsonrpc", rpc("message/send", {"message": {"messageId": "m1", "role": "user", "kind": "message",
                                                  "parts": [{"kind": "text", "text": "Evaluate step-4000 on gsm-mini"}]}}), {}),
        ("malformed_json", "/a2a/jsonrpc", b'{"jsonrpc":"2.0","id":1,"method":"GetTask",', {}),
        ("unknown_method", "/a2a/jsonrpc", rpc("tasks/delete", {"id": tid}), {}),
        ("rest_get_task", f"/a2a/rest/tasks/{tid}?historyLength=0", None, {"method": "GET"}),
        ("rest_unknown_task", "/a2a/rest/tasks/no-such-task", None, {"method": "GET"}),
    ]
    res = {}
    for name, path, body, kw in cases:
        res[name] = await raw(path, body, **kw)
        rec(tap, "err_" + name, {"result": res[name]})
    return res


async def s_bindings(tap):
    """The same blocking request over the two HTTP bindings the card declares."""
    for b in ("JSONRPC", "HTTP+JSON"):
        c, hc = await sdk_client(TOK_A, bindings=(b,), streaming=False)
        t0 = time.perf_counter()
        ev = await collect(c, SendMessageRequest(message=msg("Evaluate checkpoint step-4000 on gsm-mini.")))
        ms = round((time.perf_counter() - t0) * 1000)
        await hc.aclose()
        rec(tap, "binding_" + b, {"events": ev, "ms": ms})


async def sse_events(resp, stop_after=None):
    out = []
    async for line in resp.aiter_lines():
        if line.startswith("data:"):
            out.append({"t": time.perf_counter(), "data": json.loads(line[5:])})
            if stop_after and len(out) >= stop_after:
                break
    return out


async def s_resubscribe(tap):
    """A client loses its stream mid-task; the task keeps running; SubscribeToTask picks it up again."""
    h = {"Authorization": f"Bearer {TOK_A}", "A2A-Version": "1.0", "Accept": "text/event-stream"}
    body = rpc("SendStreamingMessage", {"message": {"messageId": str(uuid.uuid4()), "role": "ROLE_USER",
               "parts": [{"text": "Evaluate checkpoint step-4000 on gsm-mini, slow mode (6 shards)."}]}})
    t0 = time.perf_counter()
    async with httpx.AsyncClient(timeout=30) as hc:
        async with hc.stream("POST", "http://127.0.0.1:30801/a2a/jsonrpc", json=body, headers=h) as r:
            first = await sse_events(r, stop_after=4)
    tid = first[0]["data"]["result"]["task"]["id"]
    await asyncio.sleep(1.2)
    mid = await raw("/a2a/jsonrpc", rpc("GetTask", {"id": tid, "historyLength": 0}))
    async with httpx.AsyncClient(timeout=30) as hc:
        async with hc.stream("POST", "http://127.0.0.1:30801/a2a/jsonrpc", json=rpc("SubscribeToTask", {"id": tid}), headers=h) as r:
            second = await sse_events(r)
    for e in first + second:
        e["t_ms"] = round((e.pop("t") - t0) * 1000)
    rec(tap, "resubscribe", {"first_stream": first, "get_task_between": mid, "second_stream": second, "task_id": tid})


async def s_push(tap):
    """Team A registers a webhook with the task; the agent POSTs every update to it."""
    HOOK.clear()
    cfg = TaskPushNotificationConfig(url="http://127.0.0.1:30821/a2a-hook", token="per-task-check-7f3a",
                                     authentication=AuthenticationInfo(scheme="Bearer", credentials="hook-secret-lab"))
    c, hc = await sdk_client(TOK_A, streaming=False)
    t0 = time.perf_counter()
    ev = await collect(c, SendMessageRequest(message=msg("Evaluate checkpoint step-4000 on gsm-mini."),
                       configuration=SendMessageConfiguration(return_immediately=True, task_push_notification_config=cfg)))
    for _ in range(60):
        if any("COMPLETED" in json.dumps(x["body"]) for x in HOOK):
            break
        await asyncio.sleep(0.1)
    await hc.aclose()
    hooks = [{**x, "t_ms": round((x.pop("t") - t0) * 1000)} for x in HOOK]
    rec(tap, "push", {"reply": ev, "webhook": hooks})
    # the same registration against an agent that screens push URLs (the SDK's validate_push_notification_url)
    c2, hc2 = await sdk_client(TOK_A, streaming=False, port=30812)
    try:
        ev2 = await collect(c2, SendMessageRequest(message=msg("Evaluate checkpoint step-4000 on gsm-mini."),
                            configuration=SendMessageConfiguration(return_immediately=True, task_push_notification_config=cfg)))
        err = None
    except Exception as e:
        ev2, err = None, f"{type(e).__name__}: {str(e)[:300]}"
    await hc2.aclose()
    OUT["push_screened"] = {"reply": ev2, "client_error": err}


async def s_inauth(tap):
    """In-task authorization: the agent needs the caller's bucket; a person grants it out of band."""
    c, hc = await sdk_client(TOK_A)
    t0 = time.perf_counter(); seen = []

    async def run():
        async for ch in c.send_message(SendMessageRequest(message=msg("Evaluate checkpoint step-4000 from gs://team-a-private/run7/ on gsm-mini."))):
            seen.append({"t_ms": round((time.perf_counter() - t0) * 1000), **d(ch)})
    job = asyncio.create_task(run())
    for _ in range(50):
        if any("AUTH_REQUIRED" in json.dumps(x) for x in seen):
            break
        await asyncio.sleep(0.05)
    tid = seen[0]["task"]["id"]
    await asyncio.sleep(1.0)  # the person reading the request, then granting
    still_open = not job.done()
    async with httpx.AsyncClient() as anon:
        g = await anon.post(f"http://127.0.0.1:30801/oob/grant?task={tid}")
    grant_ms = round((time.perf_counter() - t0) * 1000)
    try:
        await asyncio.wait_for(job, 10)
    except asyncio.TimeoutError:
        pass
    final = d(await c.get_task(GetTaskRequest(id=tid, history_length=0)))
    await hc.aclose()
    rec(tap, "in_task_auth", {"events": seen, "stream_open_while_waiting": still_open, "grant": {"status": g.status_code, "ms": grant_ms}, "final_state": final["status"]["state"]})


async def s_reject_cancel(tap):
    c, hc = await sdk_client(TOK_A, streaming=False)
    ev = await collect(c, SendMessageRequest(message=msg("Delete checkpoint step-3000 to free space.")))
    await hc.aclose()
    rec(tap, "rejected", {"events": ev})
    c, hc = await sdk_client(TOK_A)
    seen = []; t0 = time.perf_counter()
    async def run():
        async for ch in c.send_message(SendMessageRequest(message=msg("Evaluate checkpoint step-4000 on gsm-mini, slow mode."))):
            seen.append({"t_ms": round((time.perf_counter() - t0) * 1000), **d(ch)})
    job = asyncio.create_task(run())
    while len(seen) < 4:
        await asyncio.sleep(0.05)
    from a2a.types import CancelTaskRequest
    canceled = d(await c.cancel_task(CancelTaskRequest(id=seen[0]["task"]["id"])))
    try:
        await asyncio.wait_for(job, 5)
    except asyncio.TimeoutError:
        job.cancel()
    await hc.aclose()
    rec(tap, "canceled", {"events": seen, "cancel_reply_state": canceled["status"]["state"]})


def s_signing(key_dir):
    """Sign the Agent Card (JWS over its RFC 8785 canonical form), verify it, then change one word and verify again."""
    import os
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    from a2a.utils.signing import create_agent_card_signer, create_signature_verifier
    os.makedirs(key_dir, exist_ok=True)
    kp = os.path.join(key_dir, "card_signing_key.pem")  # private key stays in the scratch directory
    if not os.path.exists(kp):
        open(kp, "wb").write(ec.generate_private_key(ec.SECP256R1()).private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    priv = serialization.load_pem_private_key(open(kp, "rb").read(), None)
    pub = priv.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    card = EA.card(30801)
    signed = create_agent_card_signer(priv, {"alg": "ES256", "kid": "team-b-card-2026", "jku": "https://example.com/team-b/jwks.json"})(card)
    verify = create_signature_verifier(lambda kid, jku: pub, ["ES256"])
    res = {"signature": d(signed.signatures[0])}
    try:
        verify(signed); res["verify_original"] = "valid"
    except Exception as e:
        res["verify_original"] = type(e).__name__
    signed.skills[0].description += " Also deletes checkpoints."
    try:
        verify(signed); res["verify_tampered"] = "valid"
    except Exception as e:
        res["verify_tampered"] = f"{type(e).__name__}: {e}"
    res["signature"]["signature"] = res["signature"]["signature"][:16] + "...(truncated)"
    OUT["signing"] = res


async def main(out, key_dir):
    s1 = await serve(EA.build_app(30801), 30811)
    s2 = await serve(EA.build_app(30812, screen_push_urls=True), 30812)
    s3 = await serve(Starlette(routes=[Route("/a2a-hook", hook, methods=["POST"])]), 30821)
    tap = Tap(30801, 30811); await tap.start()
    await s_discovery(tap)
    await s_noauth(tap)
    task = await s_main(tap)
    await s_errors(tap, task)
    await s_bindings(tap)
    await s_resubscribe(tap)
    await s_push(tap)
    await s_inauth(tap)
    await s_reject_cancel(tap)
    s_signing(key_dir)
    import importlib.metadata as md
    OUT["versions"] = {p: md.version(p) for p in ("a2a-sdk", "httpx", "starlette", "uvicorn", "sse-starlette", "protobuf")}
    OUT["recorded"] = time.strftime("%Y-%m-%d", time.gmtime())
    json.dump(OUT, open(out, "w"), indent=1)
    for s in (s1, s2, s3):
        s.should_exit = True
    await asyncio.sleep(0.5)


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[2]))
