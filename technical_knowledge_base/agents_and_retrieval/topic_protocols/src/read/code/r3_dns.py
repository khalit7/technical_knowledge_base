"""DNS for the running request's real-world counterpart: what a resolver answers for an LLM API host name,
the TTL counting down in its cache, the delegation (NS) records a resolver follows, a negative answer and
the SOA that sets how long it is cached, and a check for an intercepting resolver.
Read-only, a dozen queries in total. Usage: python r3_dns.py <out.json>"""
import json, socket, sys, time
import dns.message, dns.query, dns.resolver, dns.flags, dns.rcode

out = {"when": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "resolver": "local network resolver, address redacted"}
r = dns.resolver.Resolver()


def ask(name, rtype):
    t = time.perf_counter()
    try:
        a = r.resolve(name, rtype, raise_on_no_answer=False)
        rows = [f"{rr.name} {rr.ttl} IN {dns.rdatatype.to_text(rr.rdtype)} {x}" for rr in a.response.answer for x in rr]
        auth = [str(x).split("\n")[0] for x in a.response.authority]
        return {"q": f"{name} {rtype}", "ms": round((time.perf_counter() - t) * 1000, 1), "answer": rows, "authority": auth}
    except dns.resolver.NXDOMAIN as e:
        resp = e.response(e.qnames()[0])
        return {"q": f"{name} {rtype}", "ms": round((time.perf_counter() - t) * 1000, 1), "rcode": "NXDOMAIN",
                "authority": [str(x) for x in resp.authority]}


out["a1"] = ask("api.anthropic.com", "A")
time.sleep(5)
out["a2"] = ask("api.anthropic.com", "A")           # same cache entry, 5 s later: TTL lower by about 5
out["aaaa"] = ask("api.anthropic.com", "AAAA")
out["ns_com"] = ask("com", "NS")
out["ns_dom"] = ask("anthropic.com", "NS")
out["nx"] = ask("no-such-host-for-this-page.anthropic.com", "A")
# getaddrinfo is what Python, curl and every client library call: the operating system's stub resolver
t = time.perf_counter(); ai = socket.getaddrinfo("api.anthropic.com", 443, proto=socket.IPPROTO_TCP)
out["getaddrinfo"] = {"ms": round((time.perf_counter() - t) * 1000, 1), "addrs": sorted({x[4][0] for x in ai})}
# Interception check: a root server never recurses (RFC 1034 section 4.3.1: name servers may offer recursion;
# the root servers do not), so a reply from 198.41.0.4 with RA set and a final answer means something in the
# path answered instead of the root.
q = dns.message.make_query("api.anthropic.com", "A"); q.flags &= ~dns.flags.RD
t = time.perf_counter(); resp = dns.query.udp(q, "198.41.0.4", timeout=5)
out["root_check"] = {"asked": "a.root-servers.net (198.41.0.4), recursion not requested", "ms": round((time.perf_counter() - t) * 1000, 1),
                     "flags": dns.flags.to_text(resp.flags), "answer": [str(x) for x in resp.answer], "authority": [str(x).split("\n")[0] for x in resp.authority]}
json.dump(out, open(sys.argv[1], "w"), indent=1)
print(json.dumps(out, indent=1))
