"""DNS failures: NXDOMAIN, SERVFAIL, stale cache and TTL, wrong resolver, Kubernetes ndots amplification."""
import json, os, shutil, time
import lab
from lab import run, save, start

D = "dig @127.0.0.1 -p {} {} +nocmd +noall +comments +answer | grep -E 'status:|[[:space:]]IN[[:space:]]'"


def main():
    zone = os.path.join(lab.WORK, "zone.json"); shutil.copy("conf/zone.json", zone)
    qlog = os.path.join(lab.WORK, "dns_queries.log"); open(qlog, "w").close()
    start([lab.PY, "dnslab.py", "auth", "27353", zone, qlog], log="dns.log")
    start([lab.PY, "dnslab.py", "auth", "27354", "conf/zone_public.json", qlog], log="dns.log")
    start([lab.PY, "dnslab.py", "cache", "27355", "27353", qlog], log="dns.log")
    time.sleep(1)
    u = "https://api.llm-typo.invalid/v1/messages"
    save("nxdomain", [
        run(f"curl -sS {u}"),
        run(f"$PY $CL/py_requests.py {u}"),
        run(f"$PY $CL/py_httpx.py {u}"),
        run(f"node $CL/node_fetch.mjs {u}"),
        run(D.format(27353, "api.llm-typo.test")),
        run(D.format(27353, "api.llm.test")),
    ])
    save("servfail", [
        run(D.format(27353, "weights.broken.lab.test")),
        run("$PY -c \"import dns.resolver as r; x=r.Resolver(configure=False); x.nameservers=['127.0.0.1']; x.port=27353\n"
            "try: x.resolve('weights.broken.lab.test','A')\nexcept Exception as e: print(type(e).__module__+'.'+type(e).__name__+':', e)\""),
    ])
    recs = [run(D.format(27355, "api.llm.test"), note="ask the caching resolver: it fetches from the authoritative server and caches for the TTL (300 s)")]
    z = json.load(open(zone)); z["records"]["api.llm.test."]["A"] = ["127.0.0.2"]; json.dump(z, open(zone, "w"))
    recs.append(run("echo 'operator moves api.llm.test from 127.0.0.1 to 127.0.0.2 at the authoritative server'"))
    recs.append(run(D.format(27353, "api.llm.test"), note="the authoritative server has the new address"))
    time.sleep(3)
    recs.append(run(D.format(27355, "api.llm.test"), note="three seconds later the cache still serves the old one, TTL counting down"))
    recs.append(run("dig api.anthropic.com A +noall +answer; sleep 2; dig api.anthropic.com A +noall +answer",
                    note="public, read-only: the same countdown on a real name through this machine's resolver"))
    save("stale_ttl", recs)
    save("wrong_resolver", [
        run(D.format(27353, "llm.corp.lab.test"), note="the internal resolver (on the VPN or inside the VPC)"),
        run(D.format(27354, "llm.corp.lab.test"), note="a public resolver, which has never heard of the internal zone"),
    ])
    open(qlog, "w").close()
    recs = [
        run("cat conf/resolv_k8s.conf"),
        run("$PY ndots_stub.py conf/resolv_k8s.conf api.llm.test 27353"),
        run("$PY ndots_stub.py conf/resolv_k8s.conf api.llm.test. 27353"),
        run("$PY ndots_stub.py conf/resolv_k8s_ndots1.conf api.llm.test 27353"),
    ]
    lines = open(qlog).read().splitlines()
    recs.append({"cmd": "the DNS server's own query log for the first lookup (time, server, name, type, answer)",
                 "out": "\n".join(l.split(" ", 1)[1] for l in lines[:8]), "rc": 0, "ms": 0})
    save("ndots", recs)
