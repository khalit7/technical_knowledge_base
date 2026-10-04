"""A change no test caught: the rewrite streams for a chat that does not exist (step 9 answers 404)."""
import importlib.util, json, pathlib
from fastapi.testclient import TestClient
out = {}
for step in ("step9", "bigbang"):
    spec = importlib.util.spec_from_file_location(step, pathlib.Path(__file__).parent / "steps" / f"{step}.py")
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    r = TestClient(m.app).post("/v1/chats/chat_nope/messages", json={"content": "hi", "stream": True},
                               headers={"Authorization": "Bearer sk_test_alice", "Idempotency-Key": "p"})
    out[step] = r.status_code
print(json.dumps(out))
(pathlib.Path(__file__).parent.parent / "inputs" / "probe_untested.json").write_text(json.dumps(out))
