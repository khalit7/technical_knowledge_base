"""Serves the MCP client's Client ID Metadata Document over HTTPS: python cimd_host.py
https://localhost:30613/client.json (a throwaway CA from keys.py; the AS trusts it). Listens directly on 30613: TLS is not
tapped, so the AS's fetch is recorded from the AS side only (its log line)."""
import json, ssl
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from common import CIMD_URL, kp

DOC = {"client_id": CIMD_URL, "client_name": "Auth Lab Agent (MCP SDK 2.3.0 client)", "client_uri": "https://localhost:30613/",
       "redirect_uris": ["http://127.0.0.1:30699/callback"], "grant_types": ["authorization_code", "refresh_token"],
       "response_types": ["code"], "token_endpoint_auth_method": "none"}
FETCHES = []


class H(BaseHTTPRequestHandler):
    server_version = "authlab-cimd/1"; sys_version = ""

    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path != "/client.json":
            self.send_response(404); self.send_header("content-length", "0"); self.end_headers(); return
        b = json.dumps(DOC, indent=1).encode()
        self.send_response(200); self.send_header("content-type", "application/json")
        self.send_header("cache-control", "max-age=3600"); self.send_header("content-length", str(len(b))); self.end_headers()
        self.wfile.write(b)
        with open(kp("cimd_fetches.log"), "a") as f:
            f.write(json.dumps({"path": self.path, "ua": self.headers.get("user-agent")}) + "\n")


ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); ctx.load_cert_chain(kp("cimd.pem"), kp("cimd_key.pem"))
srv = ThreadingHTTPServer(("127.0.0.1", 30613), H)
srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
srv.serve_forever()
