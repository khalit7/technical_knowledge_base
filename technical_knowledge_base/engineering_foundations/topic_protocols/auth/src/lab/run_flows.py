"""Scripted OAuth flows against the lab AS, every byte recorded by the taps. python run_flows.py WIRELOG OUT.json
R  refresh-token rotation and reuse detection (public client, authorization code + PKCE first)
P  PKCE and code misuse: wrong code_verifier, then the same code twice
V  device authorization grant: pending, too-fast polling (slow_down), approval, tokens
C  client credentials (client_secret_basic), a wrong secret, introspection, revocation
D  DPoP: a sender-constrained token; the same token stolen and replayed three ways
W  a token for another audience presented to the MCP server"""
import base64, hashlib, http.client, json, secrets, sys, time, urllib.parse
import jwt
from cryptography.hazmat.primitives import serialization
from common import AS_PUBLIC, MCP_PUBLIC, CIMD_URL, UP_AUD, UP_PUBLIC, kp, now, s256, b64u

WIRE, OUT = sys.argv[1], sys.argv[2]
res = {}


def mark(p):
    with open(WIRE, "a") as f:
        f.write(json.dumps({"mark": p, "t_wall": time.time()}) + "\n")


def req(method, url, form=None, headers=None, raw=None):
    u = urllib.parse.urlsplit(url)
    c = http.client.HTTPConnection(u.hostname, u.port, timeout=10)
    body = urllib.parse.urlencode(form) if form is not None else raw
    h = {"accept": "application/json"}
    if form is not None:
        h["content-type"] = "application/x-www-form-urlencoded"
    h.update(headers or {})
    c.request(method, u.path + ("?" + u.query if u.query else ""), body=body, headers=h)
    r = c.getresponse(); data = r.read(); c.close()
    try:
        j = json.loads(data) if data else None
    except ValueError:
        j = data.decode()
    return r.status, j, dict(r.getheaders())


def authorize(scope="files:read"):
    v = secrets.token_urlsafe(48)
    q = {"response_type": "code", "client_id": CIMD_URL, "redirect_uri": "http://127.0.0.1:30699/callback", "state": secrets.token_urlsafe(16),
         "code_challenge": s256(v), "code_challenge_method": "S256", "resource": MCP_PUBLIC, "scope": scope}
    st, _, h = req("GET", AS_PUBLIC + "/authorize?" + urllib.parse.urlencode(q), headers={"user-agent": "lab-browser (simulated user alice)"})
    loc = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(h["location"]).query))
    return loc["code"], v


def code_for_tokens(code, v):
    return req("POST", AS_PUBLIC + "/token", {"grant_type": "authorization_code", "code": code, "code_verifier": v,
                                               "client_id": CIMD_URL, "resource": MCP_PUBLIC})


def short(j):
    """Keep JSON readable on the page: long tokens are cut (the full ones are in the wire log)."""
    if isinstance(j, dict):
        return {k: (v[:24] + "..." if isinstance(v, str) and len(v) > 40 and k.endswith("token") else v) for k, v in j.items()}
    return j


MCPCALL = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "read_file", "arguments": {"path": "notes.txt"},
    "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientInfo": {"name": "lab-script", "version": "1"},
              "io.modelcontextprotocol/clientCapabilities": {}}}})
MCPH = {"content-type": "application/json", "accept": "application/json, text/event-stream", "mcp-protocol-version": "2026-07-28",
        "mcp-method": "tools/call", "mcp-name": "read_file"}

# ---- R: refresh rotation ----
mark("R refresh rotation")
code, v = authorize()
st, t0, _ = code_for_tokens(code, v)
rt0 = t0["refresh_token"]
st1, t1, _ = req("POST", AS_PUBLIC + "/token", {"grant_type": "refresh_token", "refresh_token": rt0, "client_id": CIMD_URL})
st2, e2, _ = req("POST", AS_PUBLIC + "/token", {"grant_type": "refresh_token", "refresh_token": rt0, "client_id": CIMD_URL})
st3, e3, _ = req("POST", AS_PUBLIC + "/token", {"grant_type": "refresh_token", "refresh_token": t1["refresh_token"], "client_id": CIMD_URL})
res["R"] = [{"step": "code + verifier for tokens", "status": st, "body": short(t0)},
            {"step": "refresh with RT1 (legitimate client)", "status": st1, "body": short(t1)},
            {"step": "replay RT1 (the thief's copy)", "status": st2, "body": e2},
            {"step": "refresh with RT2 (legitimate client, next time)", "status": st3, "body": e3}]

# ---- P: PKCE ----
mark("P pkce misuse")
code, v = authorize()
sa, ea, _ = code_for_tokens(code, secrets.token_urlsafe(48))
code, v = authorize()
sb, tb, _ = code_for_tokens(code, v)
sc, ec, _ = code_for_tokens(code, v)
res["P"] = [{"step": "redeem code with the wrong code_verifier (an interceptor without the verifier)", "status": sa, "body": ea},
            {"step": "redeem a fresh code correctly", "status": sb, "body": short(tb)},
            {"step": "redeem the same code again", "status": sc, "body": ec}]

# ---- V: device grant ----
mark("V device grant")
t_start = time.time(); dv = []
s, d, _ = req("POST", AS_PUBLIC + "/device_authorization", {"client_id": "tv-cli", "scope": "files:read"})
dv.append({"t": 0.0, "step": "device asks for codes", "status": s, "body": short(d)})
poll = lambda: req("POST", AS_PUBLIC + "/token", {"grant_type": "urn:ietf:params:oauth:grant-type:device_code", "device_code": d["device_code"], "client_id": "tv-cli"})
for i in range(2):
    time.sleep(1.05); s, b, _ = poll(); dv.append({"t": round(time.time() - t_start, 2), "step": "poll", "status": s, "body": b})
s, b, _ = poll(); dv.append({"t": round(time.time() - t_start, 2), "step": "poll again at once (too fast)", "status": s, "body": b})
time.sleep(0.5)
s, b, _ = req("POST", AS_PUBLIC + "/device", {"user_code": d["user_code"]})
dv.append({"t": round(time.time() - t_start, 2), "step": "user types the code on her phone and approves", "status": s, "body": b})
time.sleep(6.1)
s, b, _ = poll(); dv.append({"t": round(time.time() - t_start, 2), "step": "poll after the new 6 s interval", "status": s, "body": short(b)})
res["V"] = dv

# ---- C: client credentials, introspection, revocation ----
mark("C client credentials")
basic = lambda sec: {"authorization": "Basic " + base64.b64encode(f"batch-job:{sec}".encode()).decode()}
s1, b1, _ = req("POST", AS_PUBLIC + "/token", {"grant_type": "client_credentials", "resource": MCP_PUBLIC}, basic("lab-secret-not-real"))
s2, b2, h2 = req("POST", AS_PUBLIC + "/token", {"grant_type": "client_credentials"}, basic("wrong"))
s3, b3, _ = req("POST", AS_PUBLIC + "/introspect", {"token": b1["access_token"]}, basic("lab-secret-not-real"))
s4, b4, _ = req("POST", AS_PUBLIC + "/revoke", {"token": b1["access_token"]}, basic("lab-secret-not-real"))
s5, b5, _ = req("POST", AS_PUBLIC + "/introspect", {"token": b1["access_token"]}, basic("lab-secret-not-real"))
s6, b6, h6 = req("POST", MCP_PUBLIC, None, {"authorization": "Bearer " + b1["access_token"], **MCPH}, MCPCALL)
res["C"] = [{"step": "client credentials with the right secret", "status": s1, "body": short(b1)},
            {"step": "the same with a wrong secret", "status": s2, "body": b2, "www-authenticate": h2.get("www-authenticate")},
            {"step": "introspect the token (RFC 7662)", "status": s3, "body": b3},
            {"step": "revoke it (RFC 7009)", "status": s4, "body": b4},
            {"step": "introspect again", "status": s5, "body": b5},
            {"step": "the revoked JWT at the MCP server, which checks offline only", "status": s6, "body": b6, "note": "not 401: a self-contained token stays valid until exp unless the server introspects"}]

# ---- D: DPoP ----
mark("D dpop")
dk = serialization.load_pem_private_key(open(kp("dpop_ec.pem"), "rb").read(), None)
tk = serialization.load_pem_private_key(open(kp("thief_ec.pem"), "rb").read(), None)


def proof(key, htm, htu, ath=None):
    jwk = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(key.public_key()))
    c = {"htm": htm, "htu": htu, "iat": now(), "jti": secrets.token_urlsafe(12)}
    if ath:
        c["ath"] = ath
    return jwt.encode(c, key, algorithm="ES256", headers={"typ": "dpop+jwt", "jwk": jwk})


NOTES = UP_PUBLIC + "/notes"
s1, b1, _ = req("POST", AS_PUBLIC + "/token", {"grant_type": "client_credentials", "resource": NOTES}, {**basic("lab-secret-not-real"), "dpop": proof(dk, "POST", AS_PUBLIC + "/token")})
at = b1["access_token"]; ath = b64u(hashlib.sha256(at.encode()).digest())
good = proof(dk, "GET", NOTES, ath)
s2, b2, _ = req("GET", NOTES, None, {"authorization": "DPoP " + at, "dpop": good})
s3, b3, _ = req("GET", NOTES, None, {"authorization": "Bearer " + at})
s4, b4, _ = req("GET", NOTES, None, {"authorization": "DPoP " + at, "dpop": proof(tk, "GET", NOTES, ath)})
s5, b5, _ = req("GET", NOTES, None, {"authorization": "DPoP " + at, "dpop": good})
claims = jwt.decode(at, options={"verify_signature": False})
res["D"] = [{"step": "token request with a DPoP proof (client's key)", "status": s1, "body": short(b1), "cnf": claims.get("cnf")},
            {"step": "call with the token and a fresh proof", "status": s2, "body": b2},
            {"step": "thief replays the token as a plain Bearer token", "status": s3, "body": b3},
            {"step": "thief signs a proof with their own key", "status": s4, "body": b4},
            {"step": "thief replays the client's captured proof", "status": s5, "body": b5}]

# ---- W: wrong audience at the MCP server ----
mark("W wrong audience")
s1, b1, _ = req("POST", AS_PUBLIC + "/token", {"grant_type": "client_credentials", "resource": UP_AUD}, basic("lab-secret-not-real"))
s2, b2, h2 = req("POST", MCP_PUBLIC, None, {"authorization": "Bearer " + b1["access_token"], **MCPH}, MCPCALL)
res["W"] = [{"step": "a token minted for the mail API", "status": s1, "aud": jwt.decode(b1["access_token"], options={"verify_signature": False})["aud"]},
            {"step": "presented to the MCP server", "status": s2, "body": b2, "www-authenticate": h2.get("www-authenticate")}]
mark("end")
json.dump(res, open(OUT, "w"), indent=1)
print(json.dumps(res, indent=1)[:6000])
