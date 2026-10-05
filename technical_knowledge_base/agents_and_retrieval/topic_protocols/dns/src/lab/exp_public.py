"""E15: a few read-only public lookups, all sent over DNS over TLS to 1.1.1.1 with the certificate checked
(dig +tls +tls-ca +tls-hostname=one.one.one.one), because plain DNS on this laptop is answered by a local filter.
About 25 queries in total. Also reads the root zone file and the IANA trust-anchor file (fetched with curl into
WORK) and recomputes the root key tags and DS digests from the published public keys. Output: out/public.json"""
import os, re, subprocess, time
from common import *

DOT = "dig +tls +tls-ca +tls-hostname=one.one.one.one @1.1.1.1 "


def d(q, opts="+noall +comments +answer +authority +stats"):
    p = sh(["docker", "run", *CAP, "--name", "proto-dns-pub", TOOLS, "sh", "-c", DOT + q + " " + opts + " | grep -v '^$'"], timeout=60)
    return (p.stdout + p.stderr).strip()


def main():
    res = {"when": now_iso(), "how": "dig 9.20.29 over DNS over TLS to 1.1.1.1, certificate verified"}
    res["root_dnskey"] = d(". DNSKEY +dnssec +multi", "+noall +comments +answer | grep -E 'flags:|key id|RRSIG|DNSKEY [0-9]+ [0-9]+ [0-9]+ [0-9]+ [0-9]+ [0-9]+ [0-9]+|; KSK|; ZSK'")
    res["root_rrsig"] = d(". DNSKEY +dnssec", "+noall +answer | grep RRSIG | cut -c1-90")
    res["api_a_1"] = d("api.anthropic.com A")
    time.sleep(5)
    res["api_a_2"] = d("api.anthropic.com A")
    res["api_aaaa"] = d("api.anthropic.com AAAA")
    res["api_https"] = d("api.anthropic.com HTTPS")
    res["soa"] = d("anthropic.com SOA")
    res["nx"] = d("no-such-host-for-this-page.anthropic.com A")
    res["cf_https"] = d("cloudflare.com HTTPS")
    res["example_dnssec"] = d("example.com A +dnssec")
    res["failed"] = d("dnssec-failed.org A")
    res["failed_cd"] = d("dnssec-failed.org A +cd")
    res["padding"] = d("example.com A", "+noall +comments | grep -E 'PADDING|udp:'")
    # interception check: plain UDP to a root server's address, recursion not requested (a real root refers you on)
    p = sh(["docker", "run", *CAP, "--name", "proto-dns-pub", TOOLS, "sh", "-c",
            "dig @198.41.0.4 example.com A +norecurse +noall +comments +answer +authority | grep -E 'flags|status|IN'"], timeout=60)
    res["root_intercept"] = (p.stdout + p.stderr).strip()
    # who answers: the resolver's identity over DoT, and over plain UDP (the plain answer itself is not stored:
    # on this laptop it names the local filter; only whether it looks like a public data-centre code is kept)
    dot_id = d("id.server CH TXT", "+short")
    p = sh(["docker", "run", *CAP, "--name", "proto-dns-pub", TOOLS, "sh", "-c", "dig @1.1.1.1 id.server CH TXT +short"], timeout=60)
    plain = p.stdout.strip()
    res["identity"] = {"dot": dot_id, "plain_same_as_dot": plain == dot_id,
                       "plain_looks_like_datacentre_code": bool(re.fullmatch(r'"[a-z]{3}\d{2}"', plain))}
    # root zone file and trust anchors (fetched over HTTPS from InterNIC and IANA)
    rz = open(os.path.join(WORK, "root.zone")).read()
    res["rootzone"] = {"soa": re.search(r"^\.\s+\d+\s+IN\s+SOA\s+.*$", rz, re.M).group(0),
                       "com_ns": [l for l in rz.splitlines() if re.match(r"com\.\s+\d+\s+IN\s+(NS|DS)\s", l)][:3],
                       "tld_count": len({l.split()[0] for l in rz.splitlines() if re.match(r"[^.\s;]+\.\s+\d+\s+IN\s+NS\s", l)}),
                       "dnskeys": [re.sub(r"(\S{24})\S+$", r"\1...", l) for l in rz.splitlines() if re.match(r"\.\s+\d+\s+IN\s+DNSKEY\s", l)]}
    p = sh(["docker", "run", *CAP, "--name", "proto-dns-pub", "-v", f"{WORK}:/work:ro", "-v", f"{HERE}:/lab:ro", TOOLS,
            "python3", "/lab/keytags.py", "/work/root.zone", "/work/root-anchors.xml"], timeout=60)
    res["keytags"] = p.stdout.strip().splitlines()
    save("public", res)


if __name__ == "__main__":
    main()
