"""The lab's API gateway and authorization server (stdlib http.server + PyJWT): python auth_server.py PORT KEYDIR

POST /v1/messages   needs "Authorization: Bearer <JWT>": RS256 only, signed by the lab issuer's key, iss
                    https://auth.lab.test, aud https://api.llm.test, exp/nbf/iat checked with zero leeway, scope
                    must include messages:write. Failures answer as RFC 6750 section 3 says: 401 with
                    WWW-Authenticate: Bearer error="invalid_token", or 403 error="insufficient_scope".
GET /authorize      OAuth authorization endpoint for one registered public client, agent-cli, whose only
                    registered redirect URI is http://127.0.0.1:8765/callback. The URI must match exactly
                    (RFC 9700 section 2.1), except that the port of a loopback redirect may vary (RFC 8252
                    section 7.3). On a mismatch the server must not redirect (RFC 6749 section 4.1.2.1): it shows an error.
"""
import json, os, sys, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import jwt

port, keydir = int(sys.argv[1]), sys.argv[2]
PUB = open(os.path.join(keydir, "issuer_pub.pem"), "rb").read()
REDIRECTS = ["http://127.0.0.1:8765/callback"]


def loopback_match(given, registered):
    g, r = urllib.parse.urlsplit(given), urllib.parse.urlsplit(registered)
    if given == registered:
        return True
    return (g.scheme == r.scheme == "http" and g.hostname == r.hostname == "127.0.0.1"
            and g.path == r.path and g.query == r.query and not g.fragment)


class H(BaseHTTPRequestHandler):
    server_version = "lab-gateway/1"; sys_version = ""

    def log_message(self, *a):
        pass

    def reply(self, code, body, headers=()):
        b = json.dumps(body).encode() + b"\n"
        self.send_response(code)
        for k, v in headers:
            self.send_header(k, v)
        self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(b))); self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        self.rfile.read(int(self.headers.get("content-length", 0)))
        auth = self.headers.get("authorization", "")
        if not auth.startswith("Bearer "):
            return self.reply(401, {"error": "missing bearer token"}, [("www-authenticate", 'Bearer realm="api.llm.test"')])
        try:
            claims = jwt.decode(auth[7:], PUB, algorithms=["RS256"], audience="https://api.llm.test",
                                issuer="https://auth.lab.test", options={"require": ["exp", "iat", "aud", "iss"]})
        except jwt.PyJWTError as e:
            msg = f"{type(e).__name__}: {e}"
            return self.reply(401, {"error": "invalid_token", "detail": msg},
                              [("www-authenticate", f'Bearer error="invalid_token", error_description="{e}"')])
        if "messages:write" not in claims.get("scope", "").split():
            return self.reply(403, {"error": "insufficient_scope", "have": claims.get("scope", "")},
                              [("www-authenticate", 'Bearer error="insufficient_scope", scope="messages:write"')])
        self.reply(200, {"ok": True, "sub": claims["sub"]})

    def do_GET(self):
        u = urllib.parse.urlsplit(self.path); q = dict(urllib.parse.parse_qsl(u.query))
        if u.path != "/authorize":
            return self.reply(404, {"error": "not found"})
        if q.get("client_id") != "agent-cli":
            return self.reply(400, {"error": "invalid_client"})
        ru = q.get("redirect_uri", "")
        if not any(loopback_match(ru, r) for r in REDIRECTS):
            return self.reply(400, {"error": "invalid_request", "error_description": "redirect_uri does not match a registered URI",
                                    "given": ru, "registered": REDIRECTS})
        loc = ru + "?" + urllib.parse.urlencode({"code": "lab-code-123", "state": q.get("state", "")})
        self.send_response(302); self.send_header("location", loc); self.send_header("content-length", "0"); self.end_headers()


ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
