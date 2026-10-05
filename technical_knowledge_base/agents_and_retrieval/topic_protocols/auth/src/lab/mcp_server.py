"""The lab's MCP server, built with the official Python SDK (mcp 2.3.0) as an OAuth resource server. python mcp_server.py
It validates every token itself (RS256 from the AS key, iss, aud == its own canonical URI, typ at+jwt) and also turns on
the SDK's validate_token_resource (which 2.3.0 leaves OFF by default, with a warning). Tools:
  read_file(path)            a plain tool, needs files:read
  inbox_passthrough(check)   the forbidden pattern: forwards the token it received to the upstream mail API
  inbox_exchange()           the required pattern: trades it at the AS (RFC 8693, authenticating with private_key_jwt)
                             for a token whose audience is the mail API, then calls it"""
import json, secrets, urllib.error, urllib.parse, urllib.request
import jwt
from cryptography.hazmat.primitives import serialization
from mcp.server import MCPServer
from mcp.server.auth.provider import AccessToken
from mcp.server.auth.settings import AuthSettings
from mcp.server.auth.middleware.auth_context import get_access_token
from common import AS_PUBLIC, MCP_PUBLIC, UP_AUD, UP_PUBLIC, MCP_CLIENT_ID, kp, now

PUB = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(json.load(open(kp("as_jwks.json")))["keys"][0]))
MYKEY = serialization.load_pem_private_key(open(kp("mcp_ec.pem"), "rb").read(), None)


class Verifier:
    async def verify_token(self, token):
        try:
            if jwt.get_unverified_header(token).get("typ") != "at+jwt":
                return None
            c = jwt.decode(token, PUB, algorithms=["RS256"], audience=MCP_PUBLIC, issuer=AS_PUBLIC)
        except jwt.PyJWTError:
            return None
        return AccessToken(token=token, client_id=c["client_id"], scopes=c.get("scope", "").split(), expires_at=c["exp"],
                           resource=c["aud"], subject=c["sub"], claims=c)


mcp = MCPServer("files-and-mail", token_verifier=Verifier(),
                auth=AuthSettings(issuer_url=AS_PUBLIC, resource_server_url=MCP_PUBLIC, required_scopes=["files:read"],
                                  validate_token_resource=True))


def http(url, headers=None, data=None):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


@mcp.tool()
def read_file(path: str) -> str:
    """Read a file from the user's project (a fixed lab file)."""
    return f"{path}: 3 lines, last edited by alice"


@mcp.tool()
def inbox_passthrough(check: str = "strict") -> str:
    """ANTI-PATTERN (lab only): call the mail API with the token this server received."""
    tok = get_access_token().token
    st, body = http(f"{UP_PUBLIC}/mail/inbox?check={check}", {"authorization": "Bearer " + tok})
    return json.dumps({"upstream_status": st, "upstream_body": body})


@mcp.tool()
def inbox_exchange() -> str:
    """Call the mail API with a token obtained by RFC 8693 token exchange."""
    inbound = get_access_token().token
    t = now()
    assertion = jwt.encode({"iss": MCP_CLIENT_ID, "sub": MCP_CLIENT_ID, "aud": AS_PUBLIC + "/token", "iat": t, "exp": t + 60,
                            "jti": secrets.token_urlsafe(12)}, MYKEY, algorithm="ES256", headers={"kid": "mcp-1"})
    form = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange", "subject_token": inbound,
        "subject_token_type": "urn:ietf:params:oauth:token-type:access_token", "resource": UP_AUD,
        "client_id": MCP_CLIENT_ID, "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        "client_assertion": assertion}).encode()
    st, tb = http(AS_PUBLIC + "/token", {"content-type": "application/x-www-form-urlencoded"}, form)
    if st != 200:
        return json.dumps({"exchange_status": st, "exchange_body": tb})
    st2, body = http(f"{UP_PUBLIC}/mail/inbox?check=strict", {"authorization": "Bearer " + tb["access_token"]})
    return json.dumps({"exchange_status": st, "upstream_status": st2, "upstream_body": body})


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="127.0.0.1", port=30602)
