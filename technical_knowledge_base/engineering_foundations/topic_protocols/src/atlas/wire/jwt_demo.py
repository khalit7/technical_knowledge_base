"""Make one HS256 JWT with a made-up secret and show its three parts decoded (RFC 7519 / 7515).
Shows that the payload is only base64url-encoded, not encrypted."""
import base64, hmac, hashlib, json
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
hdr = {"alg": "HS256", "typ": "JWT"}
pl = {"iss": "https://auth.example.com", "sub": "user_42", "aud": "https://api.example.com", "exp": 1791158400, "scope": "messages:write"}
h, p = b64(json.dumps(hdr, separators=(",", ":")).encode()), b64(json.dumps(pl, separators=(",", ":")).encode())
sig = b64(hmac.new(b"demo-secret-not-real", f"{h}.{p}".encode(), hashlib.sha256).digest())
tok = f"{h}.{p}.{sig}"
print(tok)
for name, part in zip(["header", "payload"], tok.split(".")[:2]):
    print(name + ":", base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)).decode())
print("signature: 32 bytes of HMAC-SHA256 over header.payload")
