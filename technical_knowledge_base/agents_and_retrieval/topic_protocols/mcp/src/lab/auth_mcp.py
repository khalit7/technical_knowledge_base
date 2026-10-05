"""The protected MCP server for the auth recording: ckpt-tools behind OAuth (SDK 2.3.0 resource-server support).
python auth_mcp.py PORT ISSUER RESOURCE KEY_DIR [SCOPE]   (SCOPE: the scope every request needs, default ckpt:read)"""
import os, sys, jwt
from mcp.server import MCPServer
from mcp.server.auth.provider import AccessToken
from mcp.server.auth.settings import AuthSettings

PORT, ISS, RESOURCE, KEYS = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
SCOPE = sys.argv[5] if len(sys.argv) > 5 else "ckpt:read"
PUB = open(os.path.join(KEYS, "as_pub.pem"), "rb").read()


class JWTVerifier:
    async def verify_token(self, token: str) -> AccessToken | None:
        try:  # signature, issuer and expiry here; the audience check is the SDK's (resource_server_url below)
            c = jwt.decode(token, PUB, algorithms=["RS256"], issuer=ISS, options={"verify_aud": False})
        except jwt.PyJWTError:
            return None
        return AccessToken(token=token, client_id=c["client_id"], scopes=c.get("scope", "").split(),
                           expires_at=c["exp"], resource=c.get("aud"), subject=c["sub"], claims={"iss": c["iss"]})


mcp = MCPServer("ckpt-tools", version="1.0.0", token_verifier=JWTVerifier(),
                auth=AuthSettings(issuer_url=ISS, resource_server_url=RESOURCE, required_scopes=[SCOPE],
                                  validate_token_resource=True))


@mcp.tool()
def list_checkpoints(run: str) -> str:
    """List the saved checkpoints of a training run."""
    return "llama-7b-step-1000, llama-7b-step-2000, llama-7b-step-3000"


if __name__ == "__main__":
    mcp.run("streamable-http", host="127.0.0.1", port=PORT)
