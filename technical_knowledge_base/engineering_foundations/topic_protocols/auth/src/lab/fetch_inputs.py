"""Fetch the small public inputs this page reads (read-only GETs, no credentials) into ../inputs/: python fetch_inputs.py
- SigV4 test vectors from botocore's copy of the AWS SigV4 test suite (get-vanilla, post-x-www-form-urlencoded)
- the MCP 2026-07-28 authorization pages (markdown) the page quotes
- three real OpenID provider / OAuth discovery documents and one JWKS (Google, Microsoft common, GitHub Actions)"""
import json, os, re, urllib.request, datetime as dt

IN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "inputs")
os.makedirs(IN, exist_ok=True)
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={"user-agent": "kb-auth-page/1"}), timeout=20)
stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

B = "https://raw.githubusercontent.com/boto/botocore/develop/tests/unit/auth/aws4_testsuite/"
vec = {"source": B, "fetched": stamp, "access_key": "AKIDEXAMPLE", "secret": "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
       "secret_source": "https://raw.githubusercontent.com/boto/botocore/develop/tests/unit/auth/test_sigv4.py (SECRET_KEY)",
       "region": "us-east-1", "service": "service", "vectors": []}
for n in ("get-vanilla", "post-x-www-form-urlencoded"):
    r = {x: get(f"{B}{n}/{n}.{x}").read().decode() for x in ("req", "creq", "sts", "authz")}
    head, _, payload = r["req"].partition("\n\n")
    lines = head.split("\n"); method, path, _ = lines[0].split(" ")
    hd = dict(l.split(":", 1) for l in lines[1:] if l)
    vec["vectors"].append({"name": n, "method": method, "path": path.split("?")[0], "query": "", "headers": hd, "payload": payload,
                           "date": hd["X-Amz-Date"], "creq": r["creq"], "sts": r["sts"], "authz": r["authz"].strip()})
json.dump(vec, open(os.path.join(IN, "sigv4_vectors.json"), "w"), indent=1)

M = "https://modelcontextprotocol.io/specification/2026-07-28/basic/"
for name, path in (("mcp_authorization.md", "authorization.md"), ("mcp_as_discovery.md", "authorization/authorization-server-discovery.md"),
                   ("mcp_client_registration.md", "authorization/client-registration.md"),
                   ("mcp_auth_security.md", "authorization/security-considerations.md")):
    open(os.path.join(IN, name), "w").write(f"<!-- {M}{path} fetched {stamp} -->\n" + get(M + path).read().decode())

disc = {"fetched": stamp, "docs": {}}
for k, u in (("google", "https://accounts.google.com/.well-known/openid-configuration"),
             ("microsoft_common", "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration"),
             ("github_actions", "https://token.actions.githubusercontent.com/.well-known/openid-configuration")):
    disc["docs"][k] = {"url": u, "doc": json.load(get(u))}
r = get("https://www.googleapis.com/oauth2/v3/certs")
disc["google_jwks"] = {"url": "https://www.googleapis.com/oauth2/v3/certs", "cache_control": r.headers.get("cache-control"),
                       "keys": [{"kid": k["kid"], "alg": k["alg"], "kty": k["kty"], "n_chars": len(k["n"])} for k in json.load(r)["keys"]]}
json.dump(disc, open(os.path.join(IN, "real_discovery.json"), "w"), indent=1)
print("inputs written", stamp)
