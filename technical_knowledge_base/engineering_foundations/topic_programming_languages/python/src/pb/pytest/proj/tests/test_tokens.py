import json

import pytest

from tokcount import limit, per_user, tokens


@pytest.mark.parametrize(
    ("text", "expected"),
    [("x86_64", 2), ("café", 1), ("日本語", 0), ("v2.1", 2), ("C++", 1)],
)
def test_tokens(text, expected):
    assert tokens(text) == expected


def test_per_user(chat_file):
    assert per_user(chat_file) == {"u1": 4, "u2": 3}


def test_bad_json(tmp_path):
    p = tmp_path / "bad.jsonl"
    p.write_text("not json", encoding="utf-8")
    with pytest.raises(json.JSONDecodeError):
        per_user(p)


def test_limit_from_env(monkeypatch):
    monkeypatch.setenv("TOKCOUNT_LIMIT", "3")
    assert limit() == 3


def test_every_rule(subtests):
    for text, expected in [("a-b", 2), ("__", 0)]:
        with subtests.test(text=text):
            assert tokens(text) == expected
