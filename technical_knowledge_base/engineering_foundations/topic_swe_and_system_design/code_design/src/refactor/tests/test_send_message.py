"""Characterization tests for POST /v1/chats/{id}/messages (send_message).

They pin what the handler does today, good or bad, so every refactoring step can prove it changed
nothing a caller can see. The module under test is chosen by the STEP environment variable
(steps/step0.py ... steps/step8.py, or steps/bigbang.py). Each test loads a fresh copy of the module,
so the in-memory database and the rate-limit buckets start empty.
"""
import importlib.util, json, os, pathlib, uuid

import pytest
from fastapi.testclient import TestClient

STEP = os.environ.get("STEP", "step0")
PATH = pathlib.Path(__file__).parent.parent / "steps" / f"{STEP}.py"
AUTH = {"Authorization": "Bearer sk_test_alice"}


@pytest.fixture
def mod():
    spec = importlib.util.spec_from_file_location(f"app_{uuid.uuid4().hex}", PATH)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


@pytest.fixture
def client(mod):
    return TestClient(mod.app)


def new_chat(client) -> str:
    r = client.post("/v1/chats", json={"title": "t"}, headers=AUTH)
    assert r.status_code == 201
    return r.json()["id"]


def send(client, chat_id, key="k1", content="hello", **extra):
    h = dict(AUTH)
    if key is not None:
        h["Idempotency-Key"] = key
    return client.post(f"/v1/chats/{chat_id}/messages", json={"content": content, **extra}, headers=h)


def test_success_charges_credits_and_echoes(client):
    cid = new_chat(client)
    r = send(client, cid)
    assert r.status_code == 201
    body = r.json()
    assert body["content"] == "Echo: hello" and body["role"] == "assistant"
    assert body["credits_left"] == 990
    assert r.headers["RateLimit"].startswith('"burst";r=')


def test_missing_api_key_is_401_with_challenge(client):
    r = client.post("/v1/chats/x/messages", json={"content": "hi"}, headers={"Idempotency-Key": "k"})
    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == 'Bearer realm="chat"'
    assert r.headers["content-type"] == "application/problem+json"
    assert r.json()["type"].endswith("/unauthorized")


def test_missing_idempotency_key_is_400(client):
    cid = new_chat(client)
    r = send(client, cid, key=None)
    assert r.status_code == 400 and r.json()["type"].endswith("/idempotency-key-missing")


def test_retry_with_same_key_replays_without_charging_twice(client):
    cid = new_chat(client)
    first = send(client, cid, key="same")
    again = send(client, cid, key="same")
    assert again.status_code == 201
    assert again.headers["Idempotent-Replayed"] == "true"
    assert again.json() == first.json()
    assert send(client, cid, key="other").json()["credits_left"] == 980


def test_same_key_different_body_is_422(client):
    cid = new_chat(client)
    send(client, cid, key="k", content="a")
    r = send(client, cid, key="k", content="b")
    assert r.status_code == 422 and r.json()["type"].endswith("/idempotency-key-reused")


def test_same_key_different_chat_is_422(client):
    a, b = new_chat(client), new_chat(client)
    send(client, a, key="k")
    r = send(client, b, key="k")
    assert r.status_code == 422


def test_key_in_progress_is_409(client, mod):
    cid = new_chat(client)
    # simulate a first request that claimed the key and has not finished yet
    body = mod.MessageIn(content="hello")
    h = mod.hashlib.sha256(body.model_dump_json().encode() + cid.encode()).hexdigest()
    mod.DB.execute("insert into idempotency_keys values('alice','busy',?,'started',null,null,0)", (h,))
    r = send(client, cid, key="busy")
    assert r.status_code == 409 and r.json()["type"].endswith("/idempotency-key-in-use")


def test_unknown_chat_is_404_and_frees_the_key(client):
    r = send(client, "chat_nope", key="k404")
    assert r.status_code == 404
    cid = new_chat(client)
    # the key was released, so it can be used for a real message later (different chat, so new hash)
    assert send(client, cid, key="k404").status_code == 201


def test_rate_limit_after_burst_of_five(client):
    cid = new_chat(client)
    codes = [send(client, cid, key=f"r{i}").status_code for i in range(6)]
    assert codes[:5] == [201] * 5
    assert codes[5] == 429


def test_429_has_retry_after_and_ratelimit_headers(client):
    cid = new_chat(client)
    for i in range(5):
        send(client, cid, key=f"q{i}")
    r = send(client, cid, key="q5")
    assert r.status_code == 429 and int(r.headers["Retry-After"]) >= 1
    assert "RateLimit" in r.headers and "RateLimit-Policy" in r.headers


def test_stream_returns_sse_and_frees_the_key(client):
    cid = new_chat(client)
    r = send(client, cid, key="s", stream=True)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/event-stream")
    assert "event: message_stop" in r.text
    assert send(client, cid, key="s", stream=True).status_code == 200


def test_validation_error_shape_unchanged(client):
    cid = new_chat(client)
    r = send(client, cid, content="")
    assert r.status_code == 422
    assert r.json()["errors"][0]["pointer"] == "#/content"


def test_other_endpoints_still_require_auth(client):
    assert client.get("/v1/chats").status_code == 401
    assert client.get("/v1/chats/x").status_code == 401
    assert client.post("/v1/chats", json={"title": "t"}).status_code == 401
    cid = new_chat(client)
    assert client.get(f"/v1/chats/{cid}", headers=AUTH).json()["title"] == "t"
    assert client.get("/v1/chats/nope", headers=AUTH).status_code == 404


def test_invalid_body_without_api_key(client):
    # pins which check wins when two things are wrong at once. Until step 8 the body was validated
    # first (422). Step 8 made auth a dependency, which runs first (401): a real change in behaviour.
    # Step 9 accepts it on purpose (do not tell an unknown caller what is wrong with its body), so
    # from step 9 on the test expects 401. That decision is its own commit, reviewed on its own.
    r = client.post("/v1/chats/x/messages", json={"content": ""}, headers={"Idempotency-Key": "k"})
    expected = 401 if STEP in ("step9", "step10", "bigbang") else 422
    assert r.status_code == expected


@pytest.mark.skipif(STEP != "step10", reason="added with step 10; earlier steps leave the key stuck (see probe_crash.py)")
def test_crash_after_claim_frees_the_key(mod):
    client = TestClient(mod.app, raise_server_exceptions=False)
    cid = new_chat(client)
    real = mod.uuid.uuid4
    mod.uuid.uuid4 = lambda: (_ for _ in ()).throw(RuntimeError("database went away"))
    try:
        assert send(client, cid, key="crash").status_code == 500
    finally:
        mod.uuid.uuid4 = real
    assert send(client, cid, key="crash").status_code == 201
