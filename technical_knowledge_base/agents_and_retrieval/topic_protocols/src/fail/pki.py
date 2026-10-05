"""Certificates for the TLS failures, all signed by the Wire Lab Root CA made by ../wire/make_ca.sh.

Usage: python pki.py <pki dir>. Writes (keys stay in the scratch dir, never in the repo):
  expired.pem      leaf for api.llm.test, valid from 30 days ago to 1 day ago
  wrongname.pem    leaf whose only name (SAN) is other.llm.test
  notyet.pem       leaf valid from tomorrow: what a client whose clock is a day behind sees
  inter.pem        an intermediate CA "Wire Lab Issuing CA 1", signed by the root
  leaf_inter.pem   leaf for api.llm.test signed by the intermediate (served alone = missing intermediate)
  fullchain.pem    leaf_inter.pem + inter.pem (the fix)
  noaki.pem        leaf without the Authority Key Identifier extension (accepted by curl, rejected by Python 3.13)
  client.pem       client certificate CN=trainer-07 (clientAuth) for mTLS
  other_ca.pem     a second, unrelated root "Other Lab Root CA" (for the "unknown CA" case)
"""
import datetime as dt, ipaddress, os, sys
from cryptography import x509
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

D = sys.argv[1]
now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
ca_key = serialization.load_pem_private_key(open(os.path.join(D, "ca.key"), "rb").read(), None)
ca = x509.load_pem_x509_certificate(open(os.path.join(D, "ca.pem"), "rb").read())


def key(name):
    k = ec.generate_private_key(ec.SECP256R1())
    open(os.path.join(D, name + ".key"), "wb").write(k.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    return k


def cert(name, cn, issuer_cert, issuer_key, nb, na, sans=None, is_ca=False, client=False, aki=True):
    k = key(name)
    b = (x509.CertificateBuilder().subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)]))
         .issuer_name(issuer_cert.subject if issuer_cert is not None else x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)]))
         .public_key(k.public_key()).serial_number(x509.random_serial_number())
         .not_valid_before(nb).not_valid_after(na)
         .add_extension(x509.BasicConstraints(ca=is_ca, path_length=0 if is_ca else None), critical=True))
    if is_ca:
        b = b.add_extension(x509.KeyUsage(False, False, False, False, False, True, True, False, False), critical=True)
    else:
        b = b.add_extension(x509.KeyUsage(True, False, False, False, False, False, False, False, False), critical=True)
        b = b.add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.CLIENT_AUTH if client else ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
    b = b.add_extension(x509.SubjectKeyIdentifier.from_public_key(k.public_key()), critical=False)
    if issuer_cert is not None and aki:  # Python 3.13+ verifies strictly (VERIFY_X509_STRICT) and requires this
        b = b.add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(issuer_cert.public_key()), critical=False)
    if sans:
        b = b.add_extension(x509.SubjectAlternativeName(sans), critical=False)
    c = b.sign(issuer_key or k, hashes.SHA256())
    open(os.path.join(D, name + ".pem"), "wb").write(c.public_bytes(serialization.Encoding.PEM))
    return c, k


day = dt.timedelta(days=1)
good = [x509.DNSName("api.llm.test"), x509.DNSName("localhost"), x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]
cert("expired", "api.llm.test", ca, ca_key, now - 30 * day, now - day, good)
cert("wrongname", "other.llm.test", ca, ca_key, now - day, now + 7 * day, [x509.DNSName("other.llm.test")])
cert("notyet", "api.llm.test", ca, ca_key, now + day, now + 8 * day, good)
inter, inter_key = cert("inter", "Wire Lab Issuing CA 1", ca, ca_key, now - day, now + 30 * day, is_ca=True)
cert("leaf_inter", "api.llm.test", inter, inter_key, now - day, now + 7 * day, good)
open(os.path.join(D, "fullchain.pem"), "wb").write(open(os.path.join(D, "leaf_inter.pem"), "rb").read() + open(os.path.join(D, "inter.pem"), "rb").read())
cert("noaki", "api.llm.test", ca, ca_key, now - day, now + 7 * day, good, aki=False)
cert("client", "trainer-07", ca, ca_key, now - day, now + 7 * day, client=True)
cert("other_ca", "Other Lab Root CA", None, None, now - day, now + 30 * day, is_ca=True)
print("certificates written to", D)
