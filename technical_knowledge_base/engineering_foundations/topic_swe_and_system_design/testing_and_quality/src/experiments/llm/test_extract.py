import json, httpx, pytest
from extract import extract_ticket, Ticket

def fake_llm(*replies):
    """A fake chat-completions server: returns the given replies in order and records requests."""
    seen = []
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(json.loads(request.content))
        content = replies[min(len(seen) - 1, len(replies) - 1)]
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})
    client = httpx.Client(base_url="http://fake-llm", transport=httpx.MockTransport(handler))
    return client, seen

def test_valid_output_becomes_a_ticket():
    client, seen = fake_llm('{"category": "billing", "priority": 2, "summary": "Charged twice"}')
    t = extract_ticket(client, "I was charged twice this month")
    assert t == Ticket(category="billing", priority=2, summary="Charged twice")
    assert seen[0]["temperature"] == 0 and seen[0]["response_format"] == {"type": "json_object"}

def test_out_of_range_priority_is_repaired_once():
    client, seen = fake_llm('{"category": "bug", "priority": 7, "summary": "App crashes"}',
                            '{"category": "bug", "priority": 4, "summary": "App crashes"}')
    assert extract_ticket(client, "the app crashes on login").priority == 4
    assert len(seen) == 2 and "invalid" in seen[1]["messages"][0]["content"]

def test_gives_up_after_one_repair():
    client, seen = fake_llm('not json at all')
    with pytest.raises(ValueError):
        extract_ticket(client, "hello")
    assert len(seen) == 2
