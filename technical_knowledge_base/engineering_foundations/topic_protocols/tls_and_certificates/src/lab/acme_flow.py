"""A complete ACME (RFC 8555) issuance against Pebble, Let's Encrypt's test CA, recorded message by message.
Written by hand (about 150 lines, cryptography + requests) so every step is visible: account, order, HTTP-01
challenge, validation by the CA over the network, finalize with a CSR, download, then ARI (RFC 9773) renewal
info; a DNS-01 wildcard order; a 6-day "shortlived" profile order; and a failing validation.
Pebble and pebble-challtestsrv run in Docker (run_all.sh); challtestsrv answers the CA's DNS and HTTP-01 requests.
Usage: python acme_flow.py <pebble dir url> <challtestsrv mgmt url> <pebble ca pem> <work dir> <out.json>"""
import base64, hashlib, json, sys, time
import requests
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.x509.oid import NameOID

DIR, MGMT, CA, WORK, OUT = sys.argv[1:6]
S = requests.Session(); S.verify = CA
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
log, T0 = [], time.time()
acct_key = ec.generate_private_key(ec.SECP256R1())
pub = acct_key.public_key().public_numbers()
JWK = {"crv": "P-256", "kty": "EC", "x": b64(pub.x.to_bytes(32, "big")), "y": b64(pub.y.to_bytes(32, "big"))}
THUMB = b64(hashlib.sha256(json.dumps(JWK, sort_keys=True, separators=(",", ":")).encode()).digest())  # RFC 7638
kid, nonce = None, None
d = S.get(DIR).json()
log.append({"step": "GET the directory", "method": "GET", "url": DIR, "status": 200, "body": d})


def short(u):
    return u.split("30240", 1)[-1] if u else u


def post(step, url, payload, use_jwk=False, retry=True):
    """One JWS-signed POST (RFC 8555 section 6.2): protected header {alg, nonce, url, jwk|kid}, payload, ES256 signature."""
    global nonce
    if nonce is None:
        nonce = S.head(d["newNonce"]).headers["Replay-Nonce"]
    prot = {"alg": "ES256", "nonce": nonce, "url": url}
    prot.update({"jwk": JWK} if use_jwk else {"kid": kid})
    p64 = b64(json.dumps(prot).encode()); pl64 = "" if payload is None else b64(json.dumps(payload).encode())
    r_, s_ = decode_dss_signature(acct_key.sign((p64 + "." + pl64).encode(), ec.ECDSA(hashes.SHA256())))
    body = {"protected": p64, "payload": pl64, "signature": b64(r_.to_bytes(32, "big") + s_.to_bytes(32, "big"))}
    r = S.post(url, json=body, headers={"content-type": "application/jose+json"})
    nonce = r.headers.get("Replay-Nonce")
    ct = r.headers.get("content-type", "")
    rb = r.json() if "json" in ct else r.text
    shown_prot = dict(prot); shown_prot["nonce"] = prot["nonce"][:10] + "..."
    if "jwk" in shown_prot:
        shown_prot["jwk"] = {"kty": "EC", "crv": "P-256", "x": JWK["x"][:10] + "...", "y": JWK["y"][:10] + "..."}
    if "kid" in shown_prot:
        shown_prot["kid"] = short(shown_prot["kid"])
    shown_prot["url"] = short(url)
    log.append({"step": step, "method": "POST" if payload is not None else "POST-as-GET", "url": short(url), "protected": shown_prot,
                "payload": payload, "status": r.status_code, "location": short(r.headers.get("Location")),
                "retry_after": r.headers.get("Retry-After"), "t_s": round(time.time() - T0, 2),
                "body": rb if isinstance(rb, dict) else (rb[:300] + "..." if len(rb) > 300 else rb)})
    if r.status_code == 400 and isinstance(rb, dict) and rb.get("type", "").endswith(":badNonce") and retry:
        # Pebble rejects 5% of nonces on purpose (PEBBLE_WFE_NONCEREJECT) so clients learn to retry with the fresh one
        return post(step + " (retried after badNonce)", url, payload, use_jwk, False)
    return r, rb


def poll(step, url, until):
    for _ in range(30):
        r, b = post(step, url, None)
        if b.get("status") in until:
            return b
        time.sleep(1)
    return b


def csr_for(names):
    k = ec.generate_private_key(ec.SECP256R1())
    c = (x509.CertificateSigningRequestBuilder().subject_name(x509.Name([]))
         .add_extension(x509.SubjectAlternativeName([x509.DNSName(n) for n in names]), critical=False).sign(k, hashes.SHA256()))
    return b64(c.public_bytes(serialization.Encoding.DER))


def order(names, kind, profile=None, wrong=False):
    o = {"identifiers": [{"type": "dns", "value": n} for n in names]}
    if profile:
        o["profile"] = profile
    r, ob = post("new order for %s%s" % (", ".join(names), " (profile %s)" % profile if profile else ""), d["newOrder"], o)
    ourl = r.headers["Location"]
    for az in ob["authorizations"]:
        _, a = post("fetch the authorization (which challenges are offered)", az, None)
        ch = [c for c in a["challenges"] if c["type"] == kind][0]
        keyauth = ch["token"] + "." + THUMB
        if kind == "http-01":
            content = "wrong-content" if wrong else keyauth
            requests.post(MGMT + "/add-http01", json={"token": ch["token"], "content": content})
            log.append({"step": "publish the key authorization at http://%s/.well-known/acme-challenge/%s" % (a["identifier"]["value"], ch["token"][:12] + "..."),
                        "local": True, "body": {"content": (content[:24] + "...") if not wrong else content, "rule": "token + '.' + base64url(SHA-256 thumbprint of the account key)"}})
        else:
            txt = b64(hashlib.sha256(keyauth.encode()).digest())
            requests.post(MGMT + "/set-txt", json={"host": "_acme-challenge.%s." % a["identifier"]["value"], "value": txt})
            log.append({"step": "publish TXT _acme-challenge.%s" % a["identifier"]["value"], "local": True,
                        "body": {"value": txt, "rule": "base64url(SHA-256(key authorization))"}})
        post("tell the CA the %s challenge is ready" % kind, ch["url"], {})
        res = poll("poll the authorization", az, ("valid", "invalid"))
        if res["status"] == "invalid":
            return None
    _, fb = post("finalize: send the CSR", ob["finalize"], {"csr": csr_for(names)})
    ob = poll("poll the order", ourl, ("valid", "invalid"))
    _, pem = post("download the certificate chain", ob["certificate"], None)
    return pem


pem = None
r0, _ = post("create the account (signed with the new key, sent as jwk)", d["newAccount"], {"termsOfServiceAgreed": True}, use_jwk=True)
kid = r0.headers["Location"]
pem = order(["api.llm.test"], "http-01", profile="default")
open(WORK + "/acme_chain.pem", "w").write(pem)
leaf = x509.load_pem_x509_certificate(pem.encode())
aki = leaf.extensions.get_extension_for_class(x509.AuthorityKeyIdentifier).value.key_identifier
ser = leaf.serial_number.to_bytes((leaf.serial_number.bit_length() + 8) // 8, "big")
certid = b64(aki) + "." + b64(ser)
ri = S.get(d["renewalInfo"] + "/" + certid)
log.append({"step": "ARI: ask when to renew (RFC 9773)", "method": "GET", "url": short(d["renewalInfo"]) + "/" + certid[:16] + "...",
            "status": ri.status_code, "retry_after": ri.headers.get("Retry-After"), "body": ri.json()})
pem_w = order(["*.llm.test"], "dns-01", profile="default")
pem_s = order(["short.llm.test"], "http-01", profile="shortlived")
bad = order(["bad.llm.test"], "http-01", profile="default", wrong=True)


def summary(p):
    c = x509.load_pem_x509_certificate(p.encode())
    return {"subject": c.subject.rfc4514_string(), "issuer": c.issuer.rfc4514_string(),
            "san": [n.value for n in c.extensions.get_extension_for_class(x509.SubjectAlternativeName).value],
            "validity_days": round((c.not_valid_after_utc - c.not_valid_before_utc).total_seconds() / 86400, 2),
            "chain_certs": p.count("BEGIN CERTIFICATE")}


json.dump({"recorded": time.strftime("%Y-%m-%d"), "ca": "Pebble (ghcr.io/letsencrypt/pebble:latest) in Docker", "account_thumbprint": THUMB,
           "issued": {"http-01": summary(pem), "dns-01 wildcard": summary(pem_w), "shortlived profile": summary(pem_s)},
           "failed_validation": bad is None, "log": log}, open(OUT, "w"), indent=1)
for e in log:
    print(e.get("method", "local"), e.get("status", ""), e["step"])
print(summary(pem), summary(pem_w), summary(pem_s))
