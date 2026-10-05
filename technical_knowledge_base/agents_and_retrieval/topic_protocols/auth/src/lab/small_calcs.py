"""Small reproductions, stdlib only: python small_calcs.py OUT.json
1. SigV4 implemented from AWS's published steps, checked against two vectors of the SigV4 test suite shipped in botocore
   (inputs/sigv4_vectors.json: get-vanilla and post-x-www-form-urlencoded; example credentials AKIDEXAMPLE).
2. PKCE S256 on RFC 7636 appendix B's verifier.
3. An API key in GitHub's 2021 style (prefix + 30 base62 random + 6 base62 CRC32), its entropy, and what the server stores.
4. The device grant's user-code entropy (RFC 8628 s6.1 example)."""
import base64, hashlib, hmac, json, math, os, secrets, sys, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
H = lambda b: hashlib.sha256(b).hexdigest()
mac = lambda k, m: hmac.new(k, m.encode(), hashlib.sha256).digest()


def sigv4(method, path, query, headers, payload, secret, akid, date, region, service):
    hs = sorted((k.lower(), " ".join(v.strip().split())) for k, v in headers.items())
    canon_headers = "".join(f"{k}:{v}\n" for k, v in hs)
    signed = ";".join(k for k, _ in hs)
    creq = "\n".join([method, path, query, canon_headers, signed, H(payload.encode())])
    scope = f"{date[:8]}/{region}/{service}/aws4_request"
    sts = "\n".join(["AWS4-HMAC-SHA256", date, scope, H(creq.encode())])
    k = mac(("AWS4" + secret).encode(), date[:8]); kd = k.hex()
    k = mac(k, region); k = mac(k, service); k = mac(k, "aws4_request")
    sig = hmac.new(k, sts.encode(), hashlib.sha256).hexdigest()
    return {"canonical_request": creq, "string_to_sign": sts, "k_date": kd, "signing_key": k.hex(), "signature": sig,
            "authorization": f"AWS4-HMAC-SHA256 Credential={akid}/{scope}, SignedHeaders={signed}, Signature={sig}"}


vec = json.load(open(os.path.join(HERE, "..", "inputs", "sigv4_vectors.json")))
sv = []
for v in vec["vectors"]:
    r = sigv4(v["method"], v["path"], v["query"], v["headers"], v["payload"], vec["secret"], vec["access_key"], v["date"], vec["region"], vec["service"])
    sv.append({"name": v["name"], **r, "expected_authorization": v["authz"], "match": r["authorization"] == v["authz"],
               "creq_match": r["canonical_request"] == v["creq"], "sts_match": r["string_to_sign"] == v["sts"]})

pk_v = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
pk_c = base64.urlsafe_b64encode(hashlib.sha256(pk_v.encode()).digest()).rstrip(b"=").decode()

B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def b62(n, width):
    s = ""
    while n:
        n, r = divmod(n, 62); s = B62[r] + s
    return s.rjust(width, "0")


body = "".join(secrets.choice(B62) for _ in range(30))
key = "lab_" + body + b62(zlib.crc32(body.encode()), 6)
def check(k):
    b, c = k[4:-6], k[-6:]
    return b62(zlib.crc32(b.encode()), 6) == c
typo = key[:10] + ("A" if key[10] != "A" else "B") + key[11:]
apikey = {"example": key, "entropy_bits": round(30 * math.log2(62), 1), "formula": "30 x log2(62)",
          "checksum_ok": check(key), "typo_checksum_ok": check(typo), "typo": typo,
          "stored_sha256": hashlib.sha256(key.encode()).hexdigest(), "display_hint": key[:8] + "..." + key[-4:]}

json.dump({"sigv4": sv, "pkce": {"verifier": pk_v, "challenge": pk_c, "rfc_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"},
           "apikey": apikey, "user_code_bits": round(8 * math.log2(20), 2)}, open(OUT, "w"), indent=1)
for s in sv:
    print(s["name"], "match", s["match"], s["creq_match"], s["sts_match"], s["signature"])
print("pkce", pk_c); print(apikey)
