"""Read-only survey of public HTTPS endpoints an ML engineer calls: one TLS handshake each with OpenSSL 3.6
(which offers X25519MLKEM768 first), recording the negotiated key-exchange group and the certificate chain, then
parsing every certificate (validity, key, signature, SANs, EKU, SCTs, revocation pointers, policy).
No HTTP request is sent. Usage: OPENSSL=... python public_chains.py <cafile> <out.json>"""
import datetime, json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../src"))
from private_patterns import alternation
from cryptography import x509
from cryptography.x509.oid import ExtendedKeyUsageOID as E, ExtensionOID as X
CAFILE, OUT = sys.argv[1], sys.argv[2]
OPENSSL = os.environ["OPENSSL"]
HOSTS = ["api.anthropic.com", "api.openai.com", "generativelanguage.googleapis.com", "bedrock-runtime.us-east-1.amazonaws.com",
         "huggingface.co", "api.mistral.ai", "api.groq.com", "api.deepseek.com", "api.together.xyz", "pypi.org", "github.com",
         "www.cloudflare.com"]
PRIV = re.compile(alternation(), re.I)
POL = {"2.23.140.1.2.1": "DV", "2.23.140.1.2.2": "OV", "2.23.140.1.1": "EV", "2.23.140.1.2.3": "IV"}


def parse(pem):
    c = x509.load_pem_x509_certificate(pem.encode())
    pk = c.public_key(); kt = type(pk).__name__.replace("_", "")
    size = getattr(pk, "key_size", None)
    kd = ("EC P-%d" % size if "Elliptic" in kt or "EC" in kt else "RSA-%d" % size if "RSA" in kt else kt)
    def ext(oid):
        try:
            return c.extensions.get_extension_for_oid(oid).value
        except x509.ExtensionNotFound:
            return None
    san = ext(X.SUBJECT_ALTERNATIVE_NAME); eku = ext(X.EXTENDED_KEY_USAGE); aia = ext(X.AUTHORITY_INFORMATION_ACCESS)
    crl = ext(X.CRL_DISTRIBUTION_POINTS); pol = ext(X.CERTIFICATE_POLICIES); scts = ext(X.PRECERT_SIGNED_CERTIFICATE_TIMESTAMPS)
    nb, na = c.not_valid_before_utc, c.not_valid_after_utc
    bc = ext(X.BASIC_CONSTRAINTS)
    return {"subject": c.subject.rfc4514_string(), "issuer": c.issuer.rfc4514_string(), "ca": bool(bc and bc.ca),
            "not_before": nb.strftime("%Y-%m-%d"), "not_after": na.strftime("%Y-%m-%d"),
            "validity_days": round((na - nb).total_seconds() / 86400, 2), "key": kd, "sig": c.signature_algorithm_oid._name,
            "san_count": len(san) if san else 0, "san_first": [str(g.value) for g in list(san)[:3]] if san else [], "san": [str(g.value) for g in list(san)[:40]] if san else [],
            "eku": [{E.SERVER_AUTH: "serverAuth", E.CLIENT_AUTH: "clientAuth"}.get(o, o.dotted_string) for o in eku] if eku else [],
            "ocsp_url": any(a.access_method._name == "OCSP" for a in aia) if aia else False,
            "ca_issuers_url": next((a.access_location.value for a in aia if a.access_method._name == "caIssuers"), None) if aia else None,
            "crl_url": next((dp.full_name[0].value for dp in crl if dp.full_name), None) if crl else None,
            "policy": [POL.get(p.policy_identifier.dotted_string) for p in pol if p.policy_identifier.dotted_string in POL] if pol else [],
            "scts": [{"log_id": s.log_id.hex(), "ts": s.timestamp.strftime("%Y-%m-%d %H:%M")} for s in scts] if scts else [],
            "der_bytes": len(c.public_bytes(__import__("cryptography.hazmat.primitives.serialization", fromlist=["Encoding"]).Encoding.DER))}


res = {"recorded": time.strftime("%Y-%m-%d %H:%M %Z"), "openssl": subprocess.run([OPENSSL, "version"], capture_output=True, text=True).stdout.strip(), "hosts": []}
for h in HOSTS:
    t = time.perf_counter()
    p = subprocess.run([OPENSSL, "s_client", "-connect", h + ":443", "-servername", h, "-showcerts", "-CAfile", CAFILE, "-brief"],
                       input=b"", capture_output=True, timeout=30)
    p2 = subprocess.run([OPENSSL, "s_client", "-connect", h + ":443", "-servername", h, "-showcerts", "-CAfile", CAFILE],
                        input=b"", capture_output=True, timeout=30)
    txt = (p2.stdout + p2.stderr).decode(errors="replace"); brief = (p.stdout + p.stderr).decode(errors="replace")
    if PRIV.search(txt):
        res["hosts"].append({"host": h, "skipped": "answered by the local network filter, not the real host"}); continue
    pems = re.findall(r"-----BEGIN CERTIFICATE-----.+?-----END CERTIFICATE-----", txt, re.S)
    g = re.search(r"(?:Negotiated TLS1.3 group|Peer Temp Key|Server Temp Key): ([^\n]+)", brief + txt)
    row = {"host": h, "protocol": (re.search(r"Protocol version: (\S+)", brief) or re.search(r"Protocol\s*: (\S+)", txt)).group(1) if (re.search(r"Protocol version: (\S+)", brief) or re.search(r"Protocol\s*: (\S+)", txt)) else None,
           "cipher": (re.search(r"Ciphersuite: (\S+)", brief) or re.search(r"Cipher is (\S+)", txt)).group(1),
           "group": g.group(1).strip() if g else None, "verify": (re.search(r"Verify return code: ([^\n]+)", txt) or re.search(r"Verification: (\S+)", brief)).group(1),
           "chain_sent": [parse(x) for x in pems]}
    res["hosts"].append(row)
    print(h, row["protocol"], row["cipher"], row["group"], row["verify"], [(c["subject"][:30], c["validity_days"], c["key"]) for c in row["chain_sent"]])
    time.sleep(0.5)
json.dump(res, open(OUT, "w"), indent=1)
