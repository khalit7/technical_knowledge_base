"""Build the lab's private DNS tree: a root zone ".", the TLD "test." and the zone "llm.test." (plus an unsigned
"attacker.test." delegation), each unsigned and DNSSEC-signed, with the variants the DNSSEC runs need.
Runs inside the proto-dns-tools container (dnspython 2.8.0, cryptography). Usage: python3 gen_zones.py OUTDIR
Keys are generated fresh on every run and stay in OUTDIR (the scratch work dir), never in the repository.
.test is reserved for testing (RFC 6761 s6.2), so none of these names exists in the real DNS.

OUTDIR/<set>/{root,test,llm.test}.zone for the sets:
  unsigned          plain zones (caching, ndots, timeouts, rebinding runs)
  signed            all three signed (ECDSA P-256, algorithm 13), DS records in the parents
  expired           as signed, but llm.test.'s signatures expired a day ago
  rolled            the root re-signed with a NEW key-signing key only (the old one withdrawn)
and OUTDIR/anchors/{old,new}.ds: the root trust anchor before and after the roll.
"""
import base64, datetime, os, sys
import dns.dnssec, dns.name, dns.rdata, dns.rdataclass, dns.rdatatype, dns.rrset, dns.zone
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from cryptography.hazmat.primitives import serialization

OUT = sys.argv[1]
NOW = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
ALG = dns.dnssec.Algorithm.ECDSAP256SHA256


def keypair(flags):
    k = ec.generate_private_key(ec.SECP256R1())
    return k, dns.dnssec.make_dnskey(k.public_key(), ALG, flags=flags)


KEYS = {z: (keypair(257), keypair(256)) for z in [".", "test.", "llm.test."]}
NEW_ROOT_KSK = keypair(257)

# A real 2048-bit RSA public key, formatted as a DKIM record: too long for one TXT string (255 octets max).
dkim_pub = rsa.generate_private_key(public_exponent=65537, key_size=2048).public_key().public_bytes(
    serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
dkim = "v=DKIM1; k=rsa; p=" + base64.b64encode(dkim_pub).decode()
dkim_txt = " ".join('"%s"' % dkim[i:i + 255] for i in range(0, len(dkim), 255))


def text_root(ds_test):
    return f"""$ORIGIN .
. 86400 IN SOA a.root-servers.test. nstld.nic.test. 2026100501 1800 900 604800 86400
. 518400 IN NS a.root-servers.test.
test. 172800 IN NS ns1.nic.test.
{ds_test}ns1.nic.test. 172800 IN A 10.53.0.11
a.root-servers.test. 518400 IN A 10.53.0.10
"""


def text_test(ds_llm):
    return f"""$ORIGIN test.
@ 3600 IN SOA ns1.nic.test. hostmaster.nic.test. 2026100501 1800 900 604800 3600
@ 172800 IN NS ns1.nic.test.
ns1.nic 172800 IN A 10.53.0.11
a.root-servers 518400 IN A 10.53.0.10
llm 172800 IN NS ns1.llm.test.
{ds_llm}ns1.llm 172800 IN A 10.53.0.12
attacker 172800 IN NS ns1.attacker.test.
lame 172800 IN NS ns1.llm.test.
ns1.attacker 172800 IN A 10.53.0.13
"""


def text_llm(serial=2026100501, extra=""):
    pool = "".join(f"pool 60 IN A 10.53.1.{i}\n" for i in range(1, 41))
    return f"""$ORIGIN llm.test.
@ 300 IN SOA ns1.llm.test. ops.llm.test. {serial} 3600 600 1209600 30
@ 300 IN NS ns1.llm.test.
ns1 300 IN A 10.53.0.12
api 60 IN A 10.53.0.80
api 60 IN AAAA fd53::80
api 60 IN HTTPS 1 . alpn="h2,h3" ipv4hint=10.53.0.80
www 300 IN CNAME api.llm.test.
weights 30 IN A 10.53.0.81
_llm._tcp 300 IN SRV 10 60 443 api.llm.test.
@ 300 IN CAA 0 issue "letsencrypt.org"
@ 300 IN MX 0 .
selector1._domainkey 300 IN TXT {dkim_txt}
{pool}{extra}"""


def zone_from(text, origin):
    return dns.zone.from_text(text, origin=origin, relativize=False, check_origin=True)


def sign(z, origin, ksk, zsk, inception, expiration):
    with z.writer() as txn:
        dns.dnssec.sign_zone(z, txn=txn, keys=[ksk, zsk], inception=inception, expiration=expiration)
    return z


def ds_line(owner, ksk):
    return f"{owner} 86400 IN DS {dns.dnssec.make_ds(owner, ksk[1], 'SHA256').to_text()}\n"


def write(setname, name, z):
    d = os.path.join(OUT, setname); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name + ".zone"), "w") as f:
        z.to_file(f, relativize=False, want_origin=True)


inc, exp = NOW - datetime.timedelta(hours=1), NOW + datetime.timedelta(days=30)
# unsigned set
write("unsigned", "root", zone_from(text_root(""), "."))
write("unsigned", "test", zone_from(text_test(""), "test."))
write("unsigned", "llm.test", zone_from(text_llm(), "llm.test."))
# signed set
(rk, rz), (tk, tz), (lk, lz) = KEYS["."], KEYS["test."], KEYS["llm.test."]
root_s = sign(zone_from(text_root(ds_line("test.", tk)), "."), ".", rk, rz, inc, exp)
test_s = sign(zone_from(text_test(ds_line("llm.test.", lk)), "test."), "test.", tk, tz, inc, exp)
llm_s = sign(zone_from(text_llm(), "llm.test."), "llm.test.", lk, lz, inc, exp)
for n, z in [("root", root_s), ("test", test_s), ("llm.test", llm_s)]:
    write("signed", n, z)
# expired: llm.test. signed 31 days ago for 30 days
write("expired", "root", root_s); write("expired", "test", test_s)
write("expired", "llm.test", sign(zone_from(text_llm(), "llm.test."), "llm.test.", lk, lz,
                                  NOW - datetime.timedelta(days=31), NOW - datetime.timedelta(days=1)))
# rolled: the root signed with a new KSK only (the same ZSK), as after a completed key roll
write("rolled", "root", sign(zone_from(text_root(ds_line("test.", tk)), "."), ".", NEW_ROOT_KSK, rz, inc, exp))
write("rolled", "test", test_s); write("rolled", "llm.test", llm_s)
os.makedirs(os.path.join(OUT, "anchors"), exist_ok=True)
open(os.path.join(OUT, "anchors", "old.ds"), "w").write(ds_line(".", rk))
open(os.path.join(OUT, "anchors", "new.ds"), "w").write(ds_line(".", NEW_ROOT_KSK))
meta = {"generated": NOW.isoformat(), "root_ksk_old": dns.dnssec.key_id(rk[1]), "root_ksk_new": dns.dnssec.key_id(NEW_ROOT_KSK[1]),
        "root_zsk": dns.dnssec.key_id(rz[1]), "test_ksk": dns.dnssec.key_id(tk[1]), "llm_ksk": dns.dnssec.key_id(lk[1]),
        "llm_zsk": dns.dnssec.key_id(lz[1]), "dkim_len": len(dkim)}
import json; json.dump(meta, open(os.path.join(OUT, "anchors", "meta.json"), "w"), indent=1)
print(json.dumps(meta))
