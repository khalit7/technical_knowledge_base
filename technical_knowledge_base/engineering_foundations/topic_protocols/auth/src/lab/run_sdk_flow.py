"""The MCP authorization flow, driven by the official Python SDK's client (mcp 2.3.0, OAuthClientProvider), recorded
byte for byte by the taps. python run_sdk_flow.py WIRELOG OUT.json
The browser and the user are simulated: redirect_handler GETs the authorization URL as a browser would (User-Agent
"lab-browser"), the AS answers as if alice approved, and callback_handler hands the redirect's code, state and iss back.
Phases (marked in the wire log): A connect and authorize; B call read_file; C token passthrough to a strict and to a naive
upstream; D token exchange; E a mix-up attempt (the redirect carries another issuer: the SDK must refuse)."""
import asyncio, json, sys, time, urllib.parse, urllib.request
import httpx2
from mcp import Client
from mcp.client.auth import OAuthClientProvider, TokenStorage, AuthorizationCodeResult
from mcp.client.streamable_http import streamable_http_client
from mcp.shared.auth import OAuthClientMetadata
from common import MCP_PUBLIC, CIMD_URL

WIRE, OUT = sys.argv[1], sys.argv[2]
result = {"sdk": "mcp (Python) 2.3.0", "phases": {}}


def mark(p):
    with open(WIRE, "a") as f:
        f.write(json.dumps({"mark": p, "t_wall": time.time()}) + "\n")


class Mem(TokenStorage):
    def __init__(self):
        self.t = None; self.c = None

    async def get_tokens(self):
        return self.t

    async def set_tokens(self, t):
        self.t = t

    async def get_client_info(self):
        return self.c

    async def set_client_info(self, c):
        self.c = c


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def make_provider(tamper_iss=None):
    box = {}

    async def redirect_handler(url):
        box["authorize_url"] = url
        req = urllib.request.Request(url, headers={"user-agent": "lab-browser (simulated user alice)"})
        try:
            urllib.request.build_opener(NoRedirect).open(req)
        except urllib.error.HTTPError as e:
            box["location"] = e.headers["location"]

    async def callback_handler():
        q = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(box["location"]).query))
        iss = tamper_iss or q.get("iss")
        return AuthorizationCodeResult(code=q["code"], state=q.get("state"), iss=iss)

    md = OAuthClientMetadata(client_name="Auth Lab Agent", redirect_uris=["http://127.0.0.1:30699/callback"],
                             grant_types=["authorization_code", "refresh_token"], response_types=["code"],
                             token_endpoint_auth_method="none")
    return OAuthClientProvider(MCP_PUBLIC, md, Mem(), redirect_handler, callback_handler, client_metadata_url=CIMD_URL), box


async def main():
    prov, box = make_provider()
    mark("A connect and authorize")
    async with httpx2.AsyncClient(auth=prov, timeout=30) as hc:
        async with Client(streamable_http_client(MCP_PUBLIC, http_client=hc)) as c:
            mark("B call read_file")
            r = await c.call_tool("read_file", {"path": "notes.txt"})
            result["phases"]["B"] = r.content[0].text
            mark("C passthrough strict")
            r = await c.call_tool("inbox_passthrough", {"check": "strict"})
            result["phases"]["C_strict"] = json.loads(r.content[0].text)
            mark("C passthrough naive")
            r = await c.call_tool("inbox_passthrough", {"check": "naive"})
            result["phases"]["C_naive"] = json.loads(r.content[0].text)
            mark("D exchange")
            r = await c.call_tool("inbox_exchange", {})
            result["phases"]["D"] = json.loads(r.content[0].text)
    result["phases"]["A_authorize_url"] = box["authorize_url"]
    result["phases"]["A_location"] = box["location"]
    mark("E mix-up")
    prov2, box2 = make_provider(tamper_iss="http://127.0.0.1:30666")
    try:
        async with httpx2.AsyncClient(auth=prov2, timeout=30) as hc:
            async with Client(streamable_http_client(MCP_PUBLIC, http_client=hc)) as c:
                await c.call_tool("read_file", {"path": "notes.txt"})
        result["phases"]["E"] = {"refused": False}
    except BaseException as e:  # noqa
        ex = e
        while isinstance(ex, BaseExceptionGroup):
            ex = ex.exceptions[0]
        result["phases"]["E"] = {"refused": True, "error": f"{type(ex).__name__}: {ex}"}
    mark("end")
    json.dump(result, open(OUT, "w"), indent=1)
    print(json.dumps(result, indent=1)[:3000])


asyncio.run(main())
