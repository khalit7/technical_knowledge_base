"""A latent bug in steps 0 to 9: if the handler crashes after claiming an idempotency key, the key stays
'started' and every retry gets 409 forever. Step 10's context manager releases it. Writes ../inputs/probe_crash.json."""
import importlib.util, json, pathlib
from fastapi.testclient import TestClient
H = {"Authorization": "Bearer sk_test_alice"}
out = {}
for i in range(11):
    step = f"step{i}"
    spec = importlib.util.spec_from_file_location(step, pathlib.Path(__file__).parent / "steps" / f"{step}.py")
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    c = TestClient(m.app, raise_server_exceptions=False)
    cid = c.post("/v1/chats", json={"title": "t"}, headers=H).json()["id"]
    real = m.uuid.uuid4
    m.uuid.uuid4 = lambda: (_ for _ in ()).throw(RuntimeError("database went away"))
    first = c.post(f"/v1/chats/{cid}/messages", json={"content": "hi"}, headers={**H, "Idempotency-Key": "k"}).status_code
    m.uuid.uuid4 = real
    retry = c.post(f"/v1/chats/{cid}/messages", json={"content": "hi"}, headers={**H, "Idempotency-Key": "k"}).status_code
    out[step] = {"first": first, "retry": retry}
print(json.dumps(out))
(pathlib.Path(__file__).parent.parent / "inputs" / "probe_crash.json").write_text(json.dumps(out))
