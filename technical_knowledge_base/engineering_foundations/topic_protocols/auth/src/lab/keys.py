"""Create the lab's keys in KEYDIR (scratch only): python keys.py
  as_rsa.pem        the authorization server's RS256 signing key (kid as-2026-10)
  mcp_ec.pem        the MCP server's own client key (private_key_jwt for token exchange)
  dpop_ec.pem       a client's DPoP key; thief_ec.pem a second key the thief holds
  ca.pem/ca_key.pem a throwaway CA; cimd.pem/cimd_key.pem a localhost certificate for the client metadata host
Public JWKs are written next to them (as_jwks.json, mcp_jwk.json)."""
import datetime as dt, json, os
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from jwt.algorithms import RSAAlgorithm, ECAlgorithm
from common import KEYDIR, kp

os.makedirs(KEYDIR, exist_ok=True)


def save(k, name):
    open(kp(name), "wb").write(k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                               serialization.NoEncryption()))


def load(name):
    return serialization.load_pem_private_key(open(kp(name), "rb").read(), None)


if not os.path.exists(kp("as_rsa.pem")):
    save(rsa.generate_private_key(public_exponent=65537, key_size=2048), "as_rsa.pem")
    for n in ("mcp_ec.pem", "dpop_ec.pem", "thief_ec.pem"):
        save(ec.generate_private_key(ec.SECP256R1()), n)
    # CA and a localhost leaf for the HTTPS client metadata host
    ca = ec.generate_private_key(ec.SECP256R1()); save(ca, "ca_key.pem")
    nb = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=5); na = nb + dt.timedelta(days=7)
    cn = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Auth Lab Root CA")])
    cac = (x509.CertificateBuilder().subject_name(cn).issuer_name(cn).public_key(ca.public_key())
           .serial_number(x509.random_serial_number()).not_valid_before(nb).not_valid_after(na)
           .add_extension(x509.BasicConstraints(ca=True, path_length=0), True)
           .add_extension(x509.KeyUsage(False, False, False, False, False, True, True, False, False), True)
           .add_extension(x509.SubjectKeyIdentifier.from_public_key(ca.public_key()), False)
           .sign(ca, hashes.SHA256()))
    open(kp("ca.pem"), "wb").write(cac.public_bytes(serialization.Encoding.PEM))
    lk = ec.generate_private_key(ec.SECP256R1()); save(lk, "cimd_key.pem")
    leaf = (x509.CertificateBuilder().subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")]))
            .issuer_name(cn).public_key(lk.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(nb).not_valid_after(na)
            .add_extension(x509.SubjectAlternativeName([x509.DNSName("localhost")]), False)
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), True)
            .add_extension(x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.SERVER_AUTH]), False)
            .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca.public_key()), False)
            .sign(ca, hashes.SHA256()))
    open(kp("cimd.pem"), "wb").write(leaf.public_bytes(serialization.Encoding.PEM))

asj = json.loads(RSAAlgorithm.to_jwk(load("as_rsa.pem").public_key()))
asj.update(kid="as-2026-10", use="sig", alg="RS256")
json.dump({"keys": [asj]}, open(kp("as_jwks.json"), "w"))
mj = json.loads(ECAlgorithm.to_jwk(load("mcp_ec.pem").public_key()))
mj.update(kid="mcp-1", use="sig", alg="ES256")
json.dump(mj, open(kp("mcp_jwk.json"), "w"))
print("keys in", KEYDIR)
