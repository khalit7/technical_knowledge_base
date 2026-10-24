"""Recompute the root's key tags (RFC 4034 appendix B) and SHA-256 DS digests from the DNSKEY records in the root zone
file, and compare them with IANA's root-anchors.xml. Usage: python3 keytags.py root.zone root-anchors.xml"""
import re, sys
import dns.dnssec, dns.name, dns.rdata, dns.rdataclass, dns.rdatatype

zone, xml = open(sys.argv[1]).read(), open(sys.argv[2]).read()
anchors = {int(t): d.lower() for t, d in re.findall(r"<KeyTag>(\d+)</KeyTag>.*?<Digest>([0-9A-F]+)</Digest>", xml, re.S)}
for line in zone.splitlines():
    m = re.match(r"\.\s+\d+\s+IN\s+DNSKEY\s+(.*)$", line)
    if not m:
        continue
    rd = dns.rdata.from_text(dns.rdataclass.IN, dns.rdatatype.DNSKEY, m.group(1))
    tag = dns.dnssec.key_id(rd)
    ds = dns.dnssec.make_ds(dns.name.root, rd, "SHA256").digest.hex()
    role = "KSK" if rd.flags & 1 else "ZSK"
    match = ("matches IANA anchor" if anchors.get(tag) == ds else "IANA anchor differs") if tag in anchors else "not a trust anchor"
    print(f"{role} flags={rd.flags} alg={rd.algorithm} tag={tag} ds_sha256={ds[:16]}... {match}")
