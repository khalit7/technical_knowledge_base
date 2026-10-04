import settings_mod
from settings_mod import build_request

def test_default_model():
    assert build_request("hi")["model"] == "small" # passes only if it runs before the override test

def test_large_model_override():
    settings_mod.CONFIG["model"] = "large"        # mutates shared module state and never restores it
    assert build_request("hi")["model"] == "large"
