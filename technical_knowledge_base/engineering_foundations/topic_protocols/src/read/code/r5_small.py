"""Small, checkable computations the Reading quotes, each reproducing a worked example from its spec.
Usage: python r5_small.py <out.json>"""
import base64, hashlib, json, sys, time
from google.protobuf import wrappers_pb2, struct_pb2
import jwt

out = {}
# PKCE, RFC 7636 Appendix B: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
v = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
ch = base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).rstrip(b"=").decode()
out["pkce"] = {"code_verifier": v, "code_challenge": ch, "rfc7636_appendix_b": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
               "match": ch == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"}
# WebSocket, RFC 6455 section 1.3: Sec-WebSocket-Accept = base64(SHA-1(key + GUID))
k = "dGhlIHNhbXBsZSBub25jZQ=="
acc = base64.b64encode(hashlib.sha1((k + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
out["websocket_accept"] = {"key": k, "accept": acc, "rfc6455_1_3": "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=", "match": acc == "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="}
# Protocol Buffers encoding guide (protobuf.dev/programming-guides/encoding): field 1 = 150 encodes as 08 96 01
pb = wrappers_pb2.Int32Value(value=150).SerializeToString()
out["protobuf_150"] = {"bytes_hex": pb.hex(" "), "len": len(pb), "json_equivalent": '{"value":150}', "json_len": len('{"value":150}')}
# JWT, RFC 7519: header.payload.signature, each base64url; anyone can read the claims
key = "page-demo-hmac-secret-not-a-real-one"  # 36 bytes: RFC 7518 3.2 wants >= 32 for HS256
now = 1791201600  # 2026-10-05T12:00:00Z, fixed so the token is reproducible
tok = jwt.encode({"iss": "https://auth.llm.test", "sub": "user_42", "aud": "https://api.llm.test", "scope": "messages:write",
                  "iat": now, "exp": now + 300}, key, algorithm="HS256")
h, p, s = tok.split(".")
pad = lambda x: x + "=" * (-len(x) % 4)
out["jwt"] = {"token": tok, "header": json.loads(base64.urlsafe_b64decode(pad(h))), "payload": json.loads(base64.urlsafe_b64decode(pad(p))), "signature_b64url": s}
checks = {}
def tryv(name, **kw):
    try:
        jwt.decode(tok, key, options={"verify_exp": False}, **kw); checks[name] = "accepted"
    except Exception as e:
        checks[name] = f"rejected: {type(e).__name__}: {e}"
tryv("right audience, algorithm pinned", algorithms=["HS256"], audience="https://api.llm.test")
tryv("token replayed at another service", algorithms=["HS256"], audience="https://billing.llm.test")
none_tok = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').rstrip(b"=").decode() + "." + p + "."
try:
    jwt.decode(none_tok, key, algorithms=["HS256"], audience="https://api.llm.test", options={"verify_exp": False}); checks["alg none"] = "accepted"
except Exception as e:
    checks["alg none, forged by editing the header"] = f"rejected: {type(e).__name__}: {e}"
out["jwt"]["checks"] = checks
out["versions"] = {"pyjwt": jwt.__version__, "protobuf": __import__("google.protobuf").protobuf.__version__}
json.dump(out, open(sys.argv[1], "w"), indent=1)
print(json.dumps(out, indent=1))
