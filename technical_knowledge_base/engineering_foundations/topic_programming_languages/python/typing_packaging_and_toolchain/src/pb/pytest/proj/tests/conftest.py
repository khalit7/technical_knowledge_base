import json

import pytest


@pytest.fixture
def chat_file(tmp_path):
    """A small JSONL file in a fresh temporary folder, removed by pytest afterwards."""
    p = tmp_path / "chat.jsonl"
    rows = [{"user": "u1", "text": "x86_64 café"}, {"user": "u2", "text": "v2.1 C++"}, {"user": "u1", "text": "hi"}]
    p.write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")
    return p
