"""The upstream APIs the MCP server and clients call. python upstream.py
GET /mail/inbox?check=strict  a resource server done right: signature (RS256 only, keys from the AS's JWKS), iss,
                              aud == its own identifier (RFC 8707/9068), typ at+jwt, exp. It logs who it believes is calling.
GET /mail/inbox?check=naive   the common mistake: "signed by our identity provider and not expired" is enough (no aud).
GET /notes                    a DPoP-protected resource (RFC 9449 s7): Authorization: DPoP <token> plus a fresh DPoP proof
                              whose ath is the token's hash and whose key matches the token's cnf.jkt."""
import hashlib, json, threading, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import jwt
from common import AS_PUBLIC, UP_AUD, UP_PUBLIC, kp, now, jwk_thumbprint, b64u

PUB = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(json.load(open(kp("as_jwks.json")))["keys"][0]))
NOTES_AUD = UP_PUBLIC + "/notes"
SEEN = set(); LOCK = threading.Lock()


class H(BaseHTTPRequestHandler):
    server_version = "authlab-upstream/1"; sys_version = ""
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def send(self, code, body, headers=()):
        b = (json.dumps(body) + "\n").encode()
        self.send_response(code)
        for k, v in headers:
            self.send_header(k, v)
        self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        u = urllib.parse.urlsplit(self.path); q = dict(urllib.parse.parse_qsl(u.query))
        if u.path == "/mail/inbox":
            return self.inbox(q.get("check", "strict"))
        if u.path == "/notes":
            return self.notes()
        self.send(404, {"error": "not_found"})

    def inbox(self, check):
        a = self.headers.get("authorization", "")
        if not a.startswith("Bearer "):
            return self.send(401, {"error": "invalid_request"}, [("www-authenticate", 'Bearer realm="mail"')])
        tok = a[7:]
        try:
            if check == "strict":
                if jwt.get_unverified_header(tok).get("typ") != "at+jwt":
                    raise jwt.InvalidTokenError("not an access token (typ is not at+jwt)")
                c = jwt.decode(tok, PUB, algorithms=["RS256"], audience=UP_AUD, issuer=AS_PUBLIC)
            else:
                c = jwt.decode(tok, PUB, algorithms=["RS256"], options={"verify_aud": False})
        except jwt.PyJWTError as e:
            return self.send(401, {"error": "invalid_token", "error_description": str(e)},
                             [("www-authenticate", f'Bearer error="invalid_token", error_description="{e}"')])
        who = {"sub": c.get("sub"), "client_id": c.get("client_id"), "act": c.get("act"), "aud": c.get("aud"), "scope": c.get("scope")}
        self.send(200, {"check": check, "upstream_believes_caller_is": who, "messages": ["Standup moved to 10:30", "Invoice #4411"]})

    def notes(self):
        a = self.headers.get("authorization", ""); proof = self.headers.get("dpop")
        scheme, _, tok = a.partition(" ")
        try:
            c = jwt.decode(tok, PUB, algorithms=["RS256"], audience=NOTES_AUD, issuer=AS_PUBLIC)
        except jwt.PyJWTError as e:
            return self.send(401, {"error": "invalid_token", "error_description": str(e)}, [("www-authenticate", 'DPoP error="invalid_token"')])
        jkt = c.get("cnf", {}).get("jkt")
        if jkt and scheme != "DPoP":
            return self.send(401, {"error": "invalid_token", "error_description": "DPoP-bound token sent as Bearer"},
                             [("www-authenticate", 'DPoP error="invalid_token", algs="ES256"')])
        if jkt:
            if not proof:
                return self.send(401, {"error": "invalid_dpop_proof", "error_description": "missing DPoP proof"}, [("www-authenticate", 'DPoP error="invalid_dpop_proof"')])
            try:
                hd = jwt.get_unverified_header(proof)
                pc = jwt.decode(proof, jwt.algorithms.ECAlgorithm.from_jwk(json.dumps(hd["jwk"])), algorithms=["ES256"], options={"verify_aud": False})
                ok_ath = pc.get("ath") == b64u(hashlib.sha256(tok.encode()).digest())
                ok_key = jwk_thumbprint(hd["jwk"]) == jkt
                ok_req = pc.get("htm") == "GET" and pc.get("htu") == UP_PUBLIC + "/notes" and abs(pc["iat"] - now()) <= 60
                with LOCK:
                    fresh = pc["jti"] not in SEEN; SEEN.add(pc["jti"])
                why = [n for n, ok in (("proof key is not the key the token is bound to", ok_key), ("ath does not match this token", ok_ath),
                                       ("htm/htu/iat wrong", ok_req), ("proof replayed (jti seen)", fresh)) if not ok]
                if why:
                    return self.send(401, {"error": "invalid_dpop_proof", "error_description": "; ".join(why)}, [("www-authenticate", 'DPoP error="invalid_dpop_proof"')])
            except Exception as e:  # noqa
                return self.send(401, {"error": "invalid_dpop_proof", "error_description": str(e)})
        self.send(200, {"notes": ["GPU quota renewed"], "sub": c["sub"], "bound_to_key": jkt})


ThreadingHTTPServer(("127.0.0.1", 30604), H).serve_forever()
