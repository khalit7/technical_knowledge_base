"""Shared helpers for the auth lab. Every server runs on 127.0.0.1, ports 30600-30699 (this page's range).

Layout (public URL = the recording tap in front of each server; clients only ever see the tap ports):
  authorization server  as_server.py   listens 30601, public http://127.0.0.1:30611
  MCP server (SDK)      mcp_server.py  listens 30602, public http://127.0.0.1:30612/mcp
  client metadata host  cimd_host.py   listens 30603 (HTTPS), public https://localhost:30613/client.json
  upstream APIs         upstream.py    listens 30604, public http://127.0.0.1:30614
Keys live in KEYDIR (a scratch directory, never the repository)."""
import base64, hashlib, json, os, time

KEYDIR = os.environ.get("KEYDIR", "/tmp/authlab-keys")
AS_PUBLIC = "http://127.0.0.1:30611"
MCP_PUBLIC = "http://127.0.0.1:30612/mcp"
CIMD_URL = "https://localhost:30613/client.json"
UP_PUBLIC = "http://127.0.0.1:30614"
UP_AUD = UP_PUBLIC + "/mail"          # the upstream mail API's resource identifier
MCP_CLIENT_ID = "mcp-files-server"    # the MCP server's own OAuth client identity (for token exchange)


def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def b64u_dec(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def kp(name):
    return os.path.join(KEYDIR, name)


def now():
    return int(time.time())


def jwk_thumbprint(jwk: dict) -> str:
    """RFC 7638: SHA-256 over the required members, sorted, no whitespace."""
    req = {"EC": ("crv", "kty", "x", "y"), "RSA": ("e", "kty", "n"), "OKP": ("crv", "kty", "x")}[jwk["kty"]]
    s = json.dumps({k: jwk[k] for k in req}, separators=(",", ":"), sort_keys=True)
    return b64u(hashlib.sha256(s.encode()).digest())


def s256(verifier: str) -> str:
    return b64u(hashlib.sha256(verifier.encode()).digest())
