"""Unit tests for after.py: fakes instead of the network and the database, so they run in milliseconds."""
import pytest

from after import (ChatNotFound, Message, ModelOutputError, ModelUnavailable, Summary, HttpChatModel,
                   parse_summary, render_transcript, summarize_chat)
import httpx


class FakeModel:
    def __init__(self, reply: str):
        self.reply, self.calls = reply, 0
    def complete(self, system: str, user: str) -> str:
        self.calls += 1
        return self.reply


class FakeStore:
    def __init__(self, msgs):
        self.msgs, self.saved = msgs, {}
    def messages(self, chat_id):
        return self.msgs
    def save_summary(self, chat_id, s):
        self.saved[chat_id] = s


CHAT = [Message("user", "How do I cache prompts?"), Message("assistant", "Put the static part first.")]


def test_transcript_keeps_the_end():
    full = render_transcript(CHAT)
    assert render_transcript(CHAT, max_chars=20) == full[-20:] and full.startswith("User: How")


def test_transcript_skips_system_messages():
    assert "System" not in render_transcript([Message("system", "x"), *CHAT])


def test_parse_accepts_json_wrapped_in_prose():
    assert parse_summary('Sure! {"title": "Caching", "summary": "Static first."} Hope it helps').title == "Caching"


@pytest.mark.parametrize("reply", ["I cannot help with that.", '{"title": "x"}', '{"title": "", "summary": "s"}'])
def test_parse_rejects_unusable_replies(reply):
    with pytest.raises(ModelOutputError):
        parse_summary(reply)


def test_summarize_saves_and_returns():
    store = FakeStore(CHAT)
    s = summarize_chat("c1", store=store, model=FakeModel('{"title": "Caching", "summary": "Static first."}'))
    assert store.saved["c1"] == s == Summary(title="Caching", summary="Static first.")


def test_empty_chat_is_not_found_and_never_calls_the_model():
    m = FakeModel("{}")
    with pytest.raises(ChatNotFound):
        summarize_chat("c1", store=FakeStore([]), model=m)
    assert m.calls == 0


def test_http_model_retries_only_transient_errors():
    codes = iter([429, 503, 200])
    def handler(req):
        c = next(codes)
        return httpx.Response(c, json={"choices": [{"message": {"content": "ok"}}]} if c == 200 else {})
    slept = []
    m = HttpChatModel("https://x/v1", "k", client=httpx.Client(transport=httpx.MockTransport(handler)), sleep=slept.append)
    assert m.complete("s", "u") == "ok" and slept == [1, 2]


def test_http_model_gives_up_with_a_typed_error():
    m = HttpChatModel("https://x/v1", "k", sleep=lambda s: None,
                      client=httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(503))))
    with pytest.raises(ModelUnavailable):
        m.complete("s", "u")


def test_http_model_does_not_retry_our_own_bugs():
    calls = []
    def handler(req):
        calls.append(1)
        return httpx.Response(400, json={"error": "bad model name"})
    m = HttpChatModel("https://x/v1", "k", sleep=lambda s: None, client=httpx.Client(transport=httpx.MockTransport(handler)))
    with pytest.raises(httpx.HTTPStatusError):
        m.complete("s", "u")
    assert len(calls) == 1
