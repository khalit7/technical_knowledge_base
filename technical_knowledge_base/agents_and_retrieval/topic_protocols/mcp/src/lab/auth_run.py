"""Record MCP authorization end to end on loopback: python auth_run.py PKI_DIR KEY_DIR OUT.json
An SDK 2.3.0 client with OAuthClientProvider meets a protected ckpt-tools server, discovers its authorization
server, identifies itself with a Client ID Metadata Document, runs authorization code + PKCE with the RFC 8707
resource parameter, and calls the tool. Then the failures: no token, a token for another audience, a token
without the scope, an expired token, and an authorization response whose iss does not match (mix-up).
Ports: AS 30741 (tap 30751), MCP 30742 (tap 30752), second MCP needing ckpt:write 30746 (tap 30756), CIMD 30744."""
import asyncio, json, os, subprocess, sys, time, urllib.parse
import httpx, httpx2, jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from mcp import Client
from mcp.client.auth import OAuthClientProvider
from mcp.client.streamable_http import streamable_http_client
from mcp.shared.auth import AuthorizationCodeResult, OAuthClientMetadata
from tcp_tap import Tap

PKI, KEYS, OUT = sys.argv[1:4]
H = os.path.dirname(os.path.abspath(__file__)); PY = sys.executable
ISS, RES, RES_W = "http://127.0.0.1:30751", "http://127.0.0.1:30752/mcp", "http://127.0.0.1:30756/mcp"
CIMD = "https://localhost:30744/oauth/client.json"
os.makedirs(KEYS, exist_ok=True)
k = rsa.generate_private_key(public_exponent=65537, key_size=2048)
open(os.path.join(KEYS, "as_key.pem"), "wb").write(k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
open(os.path.join(KEYS, "as_pub.pem"), "wb").write(k.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
PRIV = open(os.path.join(KEYS, "as_key.pem"), "rb").read()


def wait(url):
    for _ in range(100):
        try:
            httpx.get(url, timeout=0.3, verify=False); return
        except Exception:
            time.sleep(0.1)


class Mem:
    def __init__(self): self.t = None; self.c = None
    async def get_tokens(self): return self.t
    async def set_tokens(self, t): self.t = t
    async def get_client_info(self): return self.c
    async def set_client_info(self, c): self.c = c


async def full_flow():
    box = {}

    async def user_agent(url):  # scripted browser + user: follow the authorization URL, approve, read the redirect
        box["authorize_url"] = url
        async with httpx.AsyncClient() as ac:
            r = await ac.get(url, follow_redirects=False, timeout=10)
        box["authorize_status"] = r.status_code
        loc = r.headers.get("location", ""); box["redirect"] = loc
        box["q"] = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(loc).query))

    async def callback():
        q = box["q"]; return AuthorizationCodeResult(code=q["code"], state=q.get("state"), iss=q.get("iss"))

    prov = OAuthClientProvider(server_url=RES, storage=Mem(), redirect_handler=user_agent, callback_handler=callback,
                               client_metadata=OAuthClientMetadata(redirect_uris=["http://127.0.0.1:30745/callback"],
                                                                   client_name="ckpt-agent (lab)", scope="ckpt:read"),
                               client_metadata_url=CIMD)
    try:
        async with httpx2.AsyncClient(auth=prov, timeout=10) as hc:
            async with Client(streamable_http_client(RES, http_client=hc), mode="2026-07-28", cache=None) as c:
                r = await c.call_tool("list_checkpoints", {"run": "llama-7b-sft"})
                box["result"] = r.content[0].text
    except BaseException as e:
        while isinstance(e, BaseExceptionGroup) and len(e.exceptions) == 1:
            e = e.exceptions[0]
        box["error"] = f"{type(e).__name__}: {e}"[:400]
    return box


def mint(aud=RES, scope="ckpt:read", exp_in=600):
    now = int(time.time())
    return jwt.encode({"iss": ISS, "sub": "user-1", "aud": aud, "client_id": CIMD, "scope": scope, "iat": now - 5,
                       "exp": now + exp_in}, PRIV, algorithm="RS256", headers={"kid": "lab-1"})


BODY = {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list_checkpoints", "arguments": {"run": "llama-7b-sft"},
        "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}}}}
HDR = {"accept": "application/json, text/event-stream", "content-type": "application/json", "mcp-protocol-version": "2026-07-28",
       "mcp-method": "tools/call", "mcp-name": "list_checkpoints"}


async def probe(url, token):
    h = dict(HDR)
    if token:
        h["authorization"] = "Bearer " + token
    async with httpx.AsyncClient() as ac:
        r = await ac.post(url, headers=h, json=BODY, timeout=5)
    return {"status": r.status_code, "www_authenticate": r.headers.get("www-authenticate"), "body": r.text[:300]}


async def main():
    out = {}
    procs = []
    def start_as(extra=()):
        p = subprocess.Popen([PY, os.path.join(H, "auth_as.py"), "30741", ISS, "30744", PKI, KEYS, *extra], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        wait("http://127.0.0.1:30741/.well-known/oauth-authorization-server"); wait("https://localhost:30744/oauth/client.json")
        return p
    asp = start_as()
    procs += [subprocess.Popen([PY, os.path.join(H, "auth_mcp.py"), "30742", ISS, RES, KEYS], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
              subprocess.Popen([PY, os.path.join(H, "auth_mcp.py"), "30746", ISS, RES_W, KEYS, "ckpt:write"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    wait("http://127.0.0.1:30742/mcp"); wait("http://127.0.0.1:30746/mcp")
    ta, tm, tw = Tap(30751, 30741), Tap(30752, 30742), Tap(30756, 30746)
    for t in (ta, tm, tw):
        await t.start()
    try:
        box = await full_flow()
        await asyncio.sleep(0.3)
        out["flow"] = {"client_view": box, "mcp_wire": tm.ordered(), "as_wire": ta.ordered(),
                       "as_log": (await httpx.AsyncClient().get("http://127.0.0.1:30741/__log")).json()}
        print("flow:", box.get("result"), box.get("error"))
        tm.conns = []; ta.conns = []; tm.events = []; ta.events = []
        out["failures"] = {
            "no_token": await probe(RES, None),
            "wrong_audience": await probe(RES, mint(aud="https://api.other-service.example/")),
            "expired": await probe(RES, mint(exp_in=-60)),
            "missing_scope": await probe(RES_W, mint(aud=RES_W, scope="ckpt:read")),
            "good_token": await probe(RES, mint()),
        }
        for k2, v in out["failures"].items():
            print(k2, v["status"], v["www_authenticate"])
        asp.terminate(); asp.wait()
        asp = start_as(("mixup",))
        box = await full_flow()
        out["mixup"] = {"client_view": box}
        print("mixup:", box.get("result"), box.get("error"))
    finally:
        asp.terminate()
        for p in procs: p.terminate()
    json.dump(out, open(OUT, "w"), indent=1)

asyncio.run(main())
