"""The lab's OAuth 2.1 authorization server (stdlib http.server + PyJWT). python as_server.py
Implements, minimally but by the specs: RFC 8414 metadata; authorization code with PKCE S256 only (OAuth 2.1 draft-16
s4.1, plain removed) and the RFC 9207 iss parameter; Client ID Metadata Documents (URL client_ids, fetched over HTTPS);
refresh-token rotation with reuse detection (draft-16 s4.3.1); client credentials with private_key_jwt (RFC 7523) or
client_secret_basic; the device grant (RFC 8628); token exchange (RFC 8693); DPoP-bound tokens (RFC 9449); introspection
(RFC 7662) and revocation (RFC 7009). Access tokens are RFC 9068 JWTs (typ at+jwt) bound to one audience (RFC 8707).

Simulated: the user. /authorize skips the login and consent pages and answers as if user "alice" approved, and /device
approves a user code as if she typed it on her phone. The device polling interval is 1 s (the RFC default is 5 s) so
the lab runs quickly. The client metadata host uses a throwaway CA the AS is told to trust."""
import hashlib, json, os, secrets, ssl, sys, threading, time, urllib.parse, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import jwt
from cryptography.hazmat.primitives import serialization
from common import AS_PUBLIC, MCP_PUBLIC, UP_AUD, MCP_CLIENT_ID, kp, now, s256, jwk_thumbprint, b64u

KEY = serialization.load_pem_private_key(open(kp("as_rsa.pem"), "rb").read(), None)
JWKS = json.load(open(kp("as_jwks.json")))
MCP_PUB = jwt.algorithms.ECAlgorithm.from_jwk(json.dumps(json.load(open(kp("mcp_jwk.json")))))
CTX = ssl.create_default_context(cafile=kp("ca.pem"))
ISS = AS_PUBLIC
AT_LIFE = 300
INTERVAL = 1
BASE20 = "BCDFGHJKLMNPQRSTVWXZ"   # RFC 8628 s6.1: consonants only, no vowels, no look-alikes
# confidential clients: secrets stored only as SHA-256 hashes
CLIENTS = {
    "batch-job": {"secret_sha256": hashlib.sha256(b"lab-secret-not-real").hexdigest(), "grants": ["client_credentials"], "scope": "files:read"},
    MCP_CLIENT_ID: {"jwk_pub": MCP_PUB, "grants": ["urn:ietf:params:oauth:grant-type:token-exchange"]},
    "tv-cli": {"public": True, "grants": ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"]},
}
CODES, RTS, FAMILIES, DEVICES, JTIS, REVOKED = {}, {}, {}, {}, set(), set()
LOCK = threading.Lock()
META = {
    "issuer": ISS,
    "authorization_endpoint": ISS + "/authorize", "token_endpoint": ISS + "/token",
    "device_authorization_endpoint": ISS + "/device_authorization",
    "introspection_endpoint": ISS + "/introspect", "revocation_endpoint": ISS + "/revoke",
    "jwks_uri": ISS + "/jwks",
    "response_types_supported": ["code"],
    "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials",
                              "urn:ietf:params:oauth:grant-type:device_code",
                              "urn:ietf:params:oauth:grant-type:token-exchange"],
    "code_challenge_methods_supported": ["S256"],
    "token_endpoint_auth_methods_supported": ["none", "client_secret_basic", "private_key_jwt"],
    "token_endpoint_auth_signing_alg_values_supported": ["ES256"],
    "scopes_supported": ["files:read", "files:write", "mail:read"],
    "client_id_metadata_document_supported": True,
    "authorization_response_iss_parameter_supported": True,
    "dpop_signing_alg_values_supported": ["ES256"],
}


def mint(sub, aud, scope, client_id, extra=None, life=AT_LIFE):
    t = now()
    c = {"iss": ISS, "sub": sub, "aud": aud, "client_id": client_id, "scope": scope,
         "iat": t, "exp": t + life, "jti": secrets.token_urlsafe(12)}
    c.update(extra or {})
    return jwt.encode(c, KEY, algorithm="RS256", headers={"kid": "as-2026-10", "typ": "at+jwt"})


def check_dpop(h, url, method="POST", ath=None):
    """RFC 9449 s4.3. Returns (jkt, None) or (None, error text)."""
    proof = h.headers.get("dpop")
    if not proof:
        return None, None
    try:
        hd = jwt.get_unverified_header(proof)
        if hd.get("typ") != "dpop+jwt" or hd.get("alg") != "ES256" or "jwk" not in hd:
            return None, "bad DPoP header"
        pub = jwt.algorithms.ECAlgorithm.from_jwk(json.dumps(hd["jwk"]))
        c = jwt.decode(proof, pub, algorithms=["ES256"], options={"verify_aud": False})
        if c.get("htm") != method or c.get("htu") != url:
            return None, "htm/htu mismatch"
        if abs(c["iat"] - now()) > 60:
            return None, "proof too old"
        with LOCK:
            if c["jti"] in JTIS:
                return None, "DPoP proof replayed (jti seen before)"
            JTIS.add(c["jti"])
        return jwk_thumbprint(hd["jwk"]), None
    except Exception as e:  # noqa
        return None, f"invalid DPoP proof: {e}"


def fetch_cimd(client_id):
    """Client ID Metadata Document: GET the URL, require client_id == URL (draft-ietf-oauth-client-id-metadata-document)."""
    u = urllib.parse.urlsplit(client_id)
    if u.scheme != "https" or u.path in ("", "/"):
        return None, "client_id URL must be https with a path"
    with urllib.request.urlopen(client_id, context=CTX, timeout=5) as r:
        doc = json.load(r)
    if doc.get("client_id") != client_id:
        return None, "metadata client_id does not match its URL"
    for f in ("client_name", "redirect_uris"):
        if f not in doc:
            return None, f"metadata lacks {f}"
    return doc, None


class H(BaseHTTPRequestHandler):
    server_version = "authlab-as/1"; sys_version = ""
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def send(self, code, body=None, headers=()):
        b = (json.dumps(body, indent=None) + "\n").encode() if body is not None else b""
        self.send_response(code)
        for k, v in headers:
            self.send_header(k, v)
        if body is not None:
            self.send_header("content-type", "application/json")
        self.send_header("cache-control", "no-store")
        self.send_header("content-length", str(len(b))); self.end_headers(); self.wfile.write(b)

    def err(self, code, error, desc, headers=()):
        self.send(code, {"error": error, "error_description": desc}, headers)

    # ---------- GET ----------
    def do_GET(self):
        u = urllib.parse.urlsplit(self.path); q = dict(urllib.parse.parse_qsl(u.query))
        if u.path == "/.well-known/oauth-authorization-server":
            return self.send(200, META)
        if u.path == "/jwks":
            return self.send(200, JWKS)
        if u.path == "/authorize":
            return self.authorize(q)
        self.send(404, {"error": "not_found"})

    def authorize(self, q):
        cid, ru = q.get("client_id", ""), q.get("redirect_uri", "")
        if cid.startswith("https://"):
            doc, e = fetch_cimd(cid)
            if e:
                return self.err(400, "invalid_client", e)
            if ru not in doc["redirect_uris"]:   # exact string match; never redirect to an unregistered URI
                return self.err(400, "invalid_request", "redirect_uri not in the client's metadata document")
        else:
            return self.err(400, "invalid_client", "unknown client")
        back = lambda p: self.send(302, None, [("location", ru + "?" + urllib.parse.urlencode({**p, "state": q.get("state", ""), "iss": ISS}))])
        if q.get("response_type") != "code":
            return back({"error": "unsupported_response_type"})
        if not q.get("code_challenge") or q.get("code_challenge_method") != "S256":
            return back({"error": "invalid_request", "error_description": "PKCE S256 required"})
        code = secrets.token_urlsafe(24)
        with LOCK:
            CODES[code] = {"client_id": cid, "challenge": q["code_challenge"], "scope": q.get("scope", ""),
                           "resource": q.get("resource"), "sub": "alice", "exp": now() + 60, "used": False}
        back({"code": code})

    # ---------- POST ----------
    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get("content-length", 0))).decode()
        f = dict(urllib.parse.parse_qsl(raw)); p = urllib.parse.urlsplit(self.path).path
        try:
            if p == "/token":
                return self.token(f)
            if p == "/device_authorization":
                return self.device_auth(f)
            if p == "/device":
                return self.device_approve(f)
            if p == "/introspect":
                return self.introspect(f)
            if p == "/revoke":
                return self.revoke(f)
        except Exception as e:  # noqa
            return self.err(500, "server_error", repr(e))
        self.send(404, {"error": "not_found"})

    def client_auth(self, f):
        """Returns the authenticated client_id, or None. Basic (RFC 6749 s2.3.1) or private_key_jwt (RFC 7523 s2.2)."""
        a = self.headers.get("authorization", "")
        if a.startswith("Basic "):
            import base64
            cid, _, sec = base64.b64decode(a[6:]).decode().partition(":")
            c = CLIENTS.get(cid, {})
            if c.get("secret_sha256") and secrets.compare_digest(c["secret_sha256"], hashlib.sha256(sec.encode()).hexdigest()):
                return cid
            return None
        if f.get("client_assertion_type") == "urn:ietf:params:oauth:client-assertion-type:jwt-bearer":
            cid = f.get("client_id") or jwt.decode(f["client_assertion"], options={"verify_signature": False})["iss"]
            c = CLIENTS.get(cid, {})
            if "jwk_pub" not in c:
                return None
            cl = jwt.decode(f["client_assertion"], c["jwk_pub"], algorithms=["ES256"], audience=ISS + "/token",
                            options={"require": ["exp", "iss", "sub", "aud", "jti"]})
            if cl["iss"] != cid or cl["sub"] != cid:
                return None
            with LOCK:
                if cl["jti"] in JTIS:
                    return None
                JTIS.add(cl["jti"])
            return cid
        return None

    def issue(self, sub, aud, scope, cid, family=None, extra=None, jkt=None):
        ex = dict(extra or {})
        if jkt:
            ex["cnf"] = {"jkt": jkt}
        body = {"access_token": mint(sub, aud, scope, cid, ex), "token_type": "DPoP" if jkt else "Bearer",
                "expires_in": AT_LIFE, "scope": scope}
        if family is not None:
            rt = secrets.token_urlsafe(24)
            with LOCK:
                RTS[rt] = {"family": family, "used": False, "sub": sub, "aud": aud, "scope": scope, "cid": cid, "jkt": jkt}
                FAMILIES.setdefault(family, {"revoked": False})
            body["refresh_token"] = rt
        return body

    def token(self, f):
        g = f.get("grant_type"); jkt, derr = check_dpop(self, ISS + "/token")
        if derr:
            return self.err(400, "invalid_dpop_proof", derr)
        if g == "authorization_code":
            with LOCK:
                c = CODES.get(f.get("code", ""))
                if not c:
                    return self.err(400, "invalid_grant", "unknown authorization code")
                if c["used"]:
                    return self.err(400, "invalid_grant", "authorization code already used")
                c["used"] = True
            if c["exp"] < now():
                return self.err(400, "invalid_grant", "authorization code expired")
            if f.get("client_id") != c["client_id"]:
                return self.err(400, "invalid_grant", "code was issued to another client")
            if s256(f.get("code_verifier", "")) != c["challenge"]:
                return self.err(400, "invalid_grant", "PKCE verification failed: S256(code_verifier) != code_challenge")
            res = f.get("resource") or c["resource"]
            if c["resource"] and res != c["resource"]:
                return self.err(400, "invalid_target", "resource differs from the authorization request")
            return self.send(200, self.issue(c["sub"], res, c["scope"], c["client_id"], family=secrets.token_hex(6), jkt=jkt))
        if g == "refresh_token":
            with LOCK:
                r = RTS.get(f.get("refresh_token", ""))
                if not r or FAMILIES[r["family"]]["revoked"]:
                    return self.err(400, "invalid_grant", "refresh token invalid or revoked")
                if r["used"]:   # replay of a rotated token: someone else has a copy. Kill the whole grant.
                    FAMILIES[r["family"]]["revoked"] = True
                    return self.err(400, "invalid_grant", "refresh token reuse detected; grant revoked")
                r["used"] = True
            if r["jkt"] and jkt != r["jkt"]:
                return self.err(400, "invalid_grant", "refresh token is bound to another DPoP key")
            return self.send(200, self.issue(r["sub"], r["aud"], r["scope"], r["cid"], family=r["family"], jkt=r["jkt"]))
        if g == "client_credentials":
            cid = self.client_auth(f)
            if not cid or g not in CLIENTS[cid]["grants"]:
                return self.err(401, "invalid_client", "client authentication failed", [("www-authenticate", 'Basic realm="authlab"')])
            return self.send(200, self.issue(cid, f.get("resource", MCP_PUBLIC), CLIENTS[cid]["scope"], cid, jkt=jkt))
        if g == "urn:ietf:params:oauth:grant-type:device_code":
            return self.device_poll(f)
        if g == "urn:ietf:params:oauth:grant-type:token-exchange":
            return self.exchange(f)
        return self.err(400, "unsupported_grant_type", str(g))

    def exchange(self, f):
        """RFC 8693: the MCP server trades the token it RECEIVED (audience = itself) for a new one to call the upstream.
        Policy: only the MCP server may exchange, only tokens issued for it, only to the mail API, scope narrowed."""
        cid = self.client_auth(f)
        if cid != MCP_CLIENT_ID:
            return self.err(401, "invalid_client", "client authentication failed")
        try:
            st = jwt.decode(f.get("subject_token", ""), KEY.public_key(), algorithms=["RS256"], audience=MCP_PUBLIC, issuer=ISS)
        except jwt.PyJWTError as e:
            return self.err(400, "invalid_grant", f"subject_token rejected: {e}")
        if f.get("subject_token_type") != "urn:ietf:params:oauth:token-type:access_token":
            return self.err(400, "invalid_request", "subject_token_type")
        if f.get("resource") != UP_AUD:
            return self.err(400, "invalid_target", "this client may only exchange for " + UP_AUD)
        body = self.issue(st["sub"], UP_AUD, "mail:read", cid, extra={"act": {"sub": cid}})
        body["issued_token_type"] = "urn:ietf:params:oauth:token-type:access_token"
        self.send(200, body)

    def device_auth(self, f):
        if f.get("client_id") != "tv-cli":
            return self.err(400, "invalid_client", "unknown client")
        dc = secrets.token_urlsafe(24); uc = "".join(secrets.choice(BASE20) for _ in range(8))
        with LOCK:
            DEVICES[dc] = {"user_code": uc, "approved": False, "interval": INTERVAL, "last": 0, "exp": now() + 600, "scope": f.get("scope", "")}
        self.send(200, {"device_code": dc, "user_code": uc[:4] + "-" + uc[4:], "verification_uri": ISS + "/device",
                        "verification_uri_complete": ISS + "/device?user_code=" + uc, "expires_in": 600, "interval": INTERVAL})

    def device_approve(self, f):
        uc = f.get("user_code", "").replace("-", "").upper()
        with LOCK:
            for d in DEVICES.values():
                if d["user_code"] == uc:
                    d["approved"] = True
                    return self.send(200, {"approved": True})
        self.err(400, "invalid_request", "unknown user code")

    def device_poll(self, f):
        with LOCK:
            d = DEVICES.get(f.get("device_code", ""))
            if not d:
                return self.err(400, "invalid_grant", "unknown device code")
            t = time.time()
            if d["exp"] < t:
                return self.err(400, "expired_token", "device code expired")
            too_fast = t - d["last"] < d["interval"]
            d["last"] = t
            if too_fast:
                d["interval"] += 5   # RFC 8628 s3.5: slow_down adds 5 s for this and all later requests
                return self.err(400, "slow_down", f"polling too fast; interval is now {d['interval']} s")
            if not d["approved"]:
                return self.err(400, "authorization_pending", "the user has not approved yet")
            del DEVICES[f["device_code"]]
        self.send(200, self.issue("alice", MCP_PUBLIC, d["scope"], "tv-cli", family=secrets.token_hex(6)))

    def introspect(self, f):
        if not self.client_auth(f):
            return self.err(401, "invalid_client", "introspection requires client authentication")
        tok = f.get("token", "")
        try:
            c = jwt.decode(tok, KEY.public_key(), algorithms=["RS256"], options={"verify_aud": False})
            if c["jti"] in REVOKED:
                raise jwt.InvalidTokenError("revoked")
            return self.send(200, {"active": True, **c})
        except jwt.PyJWTError:
            return self.send(200, {"active": False})

    def revoke(self, f):
        tok = f.get("token", "")
        try:
            REVOKED.add(jwt.decode(tok, KEY.public_key(), algorithms=["RS256"], options={"verify_aud": False})["jti"])
        except jwt.PyJWTError:
            with LOCK:
                if tok in RTS:
                    FAMILIES[RTS[tok]["family"]]["revoked"] = True
        self.send(200, None)


ThreadingHTTPServer(("127.0.0.1", 30601), H).serve_forever()
