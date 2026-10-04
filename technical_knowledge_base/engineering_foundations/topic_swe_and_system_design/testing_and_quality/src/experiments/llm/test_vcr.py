import json, os, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
import httpx, pytest
from extract import extract_ticket

class Provider(BaseHTTPRequestHandler):           # stands in for the real provider during recording
    def do_POST(self):
        self.rfile.read(int(self.headers["Content-Length"]))
        body = json.dumps({"id": "chatcmpl-1", "choices": [{"message": {"role": "assistant",
               "content": '{"category": "account", "priority": 3, "summary": "Cannot reset password"}'}}]}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
    def log_message(self, *a): pass

@pytest.fixture
def provider_url():
    if os.environ.get("PROVIDER_DOWN"):              # replay run: nothing is listening
        yield "http://127.0.0.1:8765"; return
    srv = HTTPServer(("127.0.0.1", 8765), Provider)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield "http://127.0.0.1:8765"
    srv.shutdown()

@pytest.fixture(scope="module")
def vcr_config():
    return {"filter_headers": ["authorization"]}     # never write API keys into the cassette

@pytest.mark.vcr
def test_password_reset_is_an_account_ticket(provider_url):
    with httpx.Client(base_url=provider_url, headers={"authorization": "Bearer sk-secret"}) as client:
        t = extract_ticket(client, "I can't reset my password")
    assert t.category == "account"
