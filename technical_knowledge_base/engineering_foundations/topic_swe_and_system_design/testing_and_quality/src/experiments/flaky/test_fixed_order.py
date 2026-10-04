import settings_mod
from settings_mod import build_request

def test_default_model():
    assert build_request("hi")["model"] == "small"

def test_large_model_override(monkeypatch):
    monkeypatch.setitem(settings_mod.CONFIG, "model", "large")   # undone automatically after the test
    assert build_request("hi")["model"] == "large"
