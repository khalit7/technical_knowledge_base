"""The lab's OAuth authorization server for the MCP auth recording (Starlette + PyJWT), plus a CIMD host.
python auth_as.py AS_PORT ISSUER CIMD_PORT PKI_DIR KEY_DIR [mixup]
  AS on http://127.0.0.1:AS_PORT, answering as ISSUER (the tapped address clients use).
  CIMD host on https://localhost:CIMD_PORT/oauth/client.json (lab CA), the client's identity document.
  The user's consent is scripted: every valid authorization request is approved (labelled on the page).
  mixup: the authorization response carries a different iss, as an attacker's server in a mix-up would."""
import base64, hashlib, json, os, secrets, sys, time, threading, urllib.parse
import httpx, jwt, uvicorn
from starlette.applications import Starlette
from starlette.responses import JSONResponse, RedirectResponse, PlainTextResponse
from starlette.routing import Route

AS_PORT, ISS, CIMD_PORT, PKI, KEYS = int(sys.argv[1]), sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]
MIXUP = "mixup" in sys.argv[6:]
PRIV = open(os.path.join(KEYS, "as_key.pem"), "rb").read()
CIMD_URL = f"https://localhost:{CIMD_PORT}/oauth/client.json"
CODES, LOG = {}, []


def meta(request):
    return JSONResponse({"issuer": ISS, "authorization_endpoint": f"{ISS}/authorize", "token_endpoint": f"{ISS}/token",
                         "response_types_supported": ["code"], "grant_types_supported": ["authorization_code"],
                         "code_challenge_methods_supported": ["S256"], "token_endpoint_auth_methods_supported": ["none"],
                         "scopes_supported": ["ckpt:read", "ckpt:write"],
                         "client_id_metadata_document_supported": True,
                         "authorization_response_iss_parameter_supported": True})


async def authorize(request):
    q = dict(request.query_params)
    # Client ID Metadata Document: the client_id is a URL; fetch it and check it describes itself
    doc = httpx.get(q["client_id"], verify=os.path.join(PKI, "ca.pem"), timeout=5).json()
    LOG.append({"as_fetched_cimd": q["client_id"], "doc": doc})
    if doc.get("client_id") != q["client_id"]:
        return PlainTextResponse("client_id mismatch", 400)
    if q.get("redirect_uri") not in doc.get("redirect_uris", []):
        return PlainTextResponse("redirect_uri not registered for this client; not redirecting", 400)
    if q.get("code_challenge_method") != "S256" or not q.get("code_challenge"):
        return PlainTextResponse("PKCE S256 required", 400)
    code = secrets.token_urlsafe(24)
    CODES[code] = {**q, "t": time.time()}
    iss = "http://127.0.0.1:1/evil-as" if MIXUP else ISS
    loc = q["redirect_uri"] + "?" + urllib.parse.urlencode({"code": code, "state": q.get("state", ""), "iss": iss})
    return RedirectResponse(loc, 302)


async def token(request):
    f = dict(await request.form())
    c = CODES.pop(f.get("code", ""), None)
    if not c or f.get("client_id") != c["client_id"] or f.get("redirect_uri") != c["redirect_uri"]:
        return JSONResponse({"error": "invalid_grant"}, 400)
    chal = base64.urlsafe_b64encode(hashlib.sha256(f["code_verifier"].encode()).digest()).rstrip(b"=").decode()
    if chal != c["code_challenge"]:
        return JSONResponse({"error": "invalid_grant", "error_description": "PKCE verifier does not match"}, 400)
    res = f.get("resource") or c.get("resource")
    now = int(time.time())
    at = jwt.encode({"iss": ISS, "sub": "user-1", "aud": res, "client_id": c["client_id"], "scope": c.get("scope", "ckpt:read"),
                     "iat": now, "exp": now + 600}, PRIV, algorithm="RS256", headers={"kid": "lab-1"})
    return JSONResponse({"access_token": at, "token_type": "Bearer", "expires_in": 600, "scope": c.get("scope", "ckpt:read")})


def log(request):
    out = list(LOG); LOG.clear(); return JSONResponse(out)


app = Starlette(routes=[Route("/.well-known/oauth-authorization-server", meta), Route("/authorize", authorize),
                        Route("/token", token, methods=["POST"]), Route("/__log", log)])
cimd = Starlette(routes=[Route("/oauth/client.json", lambda r: JSONResponse({
    "client_id": CIMD_URL, "client_name": "ckpt-agent (lab)", "redirect_uris": ["http://127.0.0.1:30745/callback"],
    "grant_types": ["authorization_code"], "response_types": ["code"], "token_endpoint_auth_method": "none"}))])
threading.Thread(target=lambda: uvicorn.run(cimd, host="127.0.0.1", port=CIMD_PORT, log_level="warning",
                 ssl_certfile=os.path.join(PKI, "server.pem"), ssl_keyfile=os.path.join(PKI, "server.key")), daemon=True).start()
uvicorn.run(app, host="127.0.0.1", port=AS_PORT, log_level="warning")
