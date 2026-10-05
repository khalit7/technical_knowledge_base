"""Mint the lab's tokens: python mint.py KEYDIR KIND. Prints one JWT (compact form: header.payload.signature).
Kinds: good, expired, wrong_aud, future (iat/nbf 5 minutes ahead: the issuer's clock runs fast), no_scope,
alg_none (unsigned), hs256_pubkey (HMAC-signed with the issuer's PUBLIC key: the classic algorithm-confusion forgery).
The first run creates the issuer key pair in KEYDIR (a scratch dir, never the repo)."""
import base64, hashlib, hmac, json, os, sys, time
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

d, kind = sys.argv[1], sys.argv[2]
kp = os.path.join(d, "issuer_key.pem")
if not os.path.exists(kp):
    k = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    open(kp, "wb").write(k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    open(os.path.join(d, "issuer_pub.pem"), "wb").write(k.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
key = open(kp, "rb").read(); pub = open(os.path.join(d, "issuer_pub.pem"), "rb").read()
now = int(time.time())
c = {"iss": "https://auth.lab.test", "sub": "agent:research-bot", "aud": "https://api.llm.test", "iat": now, "exp": now + 600, "scope": "messages:write"}
if kind == "expired": c.update(iat=now - 4000, exp=now - 400)
if kind == "wrong_aud": c.update(aud="https://other-api.lab.test")
if kind == "future": c.update(iat=now + 300, nbf=now + 300, exp=now + 900)
if kind == "no_scope": c.update(scope="messages:read")
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
if kind == "alg_none":
    print(b64(b'{"alg":"none","typ":"JWT"}') + "." + b64(json.dumps(c, separators=(",", ":")).encode()) + ".")
elif kind == "hs256_pubkey":  # done by hand: PyJWT itself refuses to use a PEM public key as an HMAC secret
    si = b64(b'{"alg":"HS256","typ":"JWT"}') + "." + b64(json.dumps(c, separators=(",", ":")).encode())
    print(si + "." + b64(hmac.new(pub, si.encode(), hashlib.sha256).digest()))
else:
    print(jwt.encode(c, key, algorithm="RS256", headers={"kid": "lab-1"}))
