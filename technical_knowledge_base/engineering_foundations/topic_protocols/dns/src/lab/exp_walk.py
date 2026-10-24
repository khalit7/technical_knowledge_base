"""E1: one name resolved from a cold cache, then warm; what each authoritative server was asked, with and without
QNAME minimisation (RFC 9156). Also every record type of llm.test. through the resolver (E3) and the truncation
and TCP retry for a large answer (E4). Output: out/walk.json"""
import re, time
from common import *

DIG = "dig @10.53.0.53 {} +noall +comments +answer +authority +stats"


def parse_coredns(lines, server):
    rows = []
    for l in lines:
        m = re.search(r'^(\S+) \[INFO\] (\S+):\d+ - \d+ "(\S+) IN (\S+) (udp|tcp) (\d+) (true|false) (\d+)" (\S+) (\S+) (\d+) (\S+)', l)
        if m:
            rows.append({"t": m.group(1), "server": server, "from": m.group(2), "type": m.group(3), "name": m.group(4),
                         "proto": m.group(5), "do": m.group(7) == "true", "bufsize": int(m.group(8)), "rcode": m.group(9),
                         "flags": m.group(10), "size": int(m.group(11)), "dur": m.group(12)})
    return rows


def upstream(since):
    rows = []
    for name, server in [("proto-dns-root", "root"), ("proto-dns-tld", "test."), ("proto-dns-auth", "llm.test.")]:
        rows += parse_coredns(logs(name, since), server)
    return sorted(rows, key=lambda r: r["t"])


def one_run(qmin):
    unbound("proto-dns-unbound", "10.53.0.53", f"  qname-minimisation: {qmin}\n")
    time.sleep(2)
    since = now_iso(); time.sleep(1)
    cold = client(DIG.format("api.llm.test A"))
    time.sleep(1.5)
    up_cold = upstream(since)
    since = now_iso(); time.sleep(1)
    warm = client(DIG.format("api.llm.test A"))
    time.sleep(1.5)
    return {"qname_minimisation": qmin, "cold_dig": cold, "cold_upstream": up_cold, "warm_dig": warm, "warm_upstream": upstream(since)}


def main():
    hierarchy_up("unsigned"); time.sleep(2)
    res = {"when": now_iso(), "runs": [one_run("yes"), one_run("no")]}
    recs = {}
    for q in ["llm.test SOA", "llm.test NS", "api.llm.test A", "api.llm.test AAAA", "api.llm.test HTTPS", "www.llm.test A",
              "_llm._tcp.llm.test SRV", "llm.test CAA", "llm.test MX", "selector1._domainkey.llm.test TXT",
              "api.llm.test TXT", "nope.llm.test A"]:
        recs[q] = client(f"dig @10.53.0.53 {q} +noall +comments +answer +authority | grep -v '^$'")
    res["records"] = recs
    res["truncation"] = {
        "udp_512_ignore_tc": client("dig @10.53.0.53 pool.llm.test A +noedns +ignore +noall +comments +answer +stats | grep -E 'flags|MSG SIZE|ANSWER:|Query time' "),
        "udp_512_then_tcp": client("dig @10.53.0.53 pool.llm.test A +noedns +noall +comments +stats 2>&1 | grep -E 'Truncated|flags|MSG SIZE|SERVER'"),
        "edns_1232": client("dig @10.53.0.53 pool.llm.test A +bufsize=1232 +noall +comments +stats | grep -E 'flags|MSG SIZE|udp:'"),
    }
    save("walk", res)


if __name__ == "__main__":
    main()
