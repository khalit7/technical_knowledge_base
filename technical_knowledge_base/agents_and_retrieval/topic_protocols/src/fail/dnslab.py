"""Local DNS servers for the failure lab (dnspython, UDP on 127.0.0.1 only).

python dnslab.py auth  PORT ZONE.json LOG   authoritative: answers from ZONE.json (re-read on every query, so
                                            editing the file changes the record at once); names it does not
                                            hold get NXDOMAIN; names listed under "servfail" get SERVFAIL
python dnslab.py cache PORT UPSTREAM LOG    a caching resolver: asks 127.0.0.1:UPSTREAM, keeps each answer
                                            for its TTL and counts the TTL down, like any recursive resolver
Every query is appended to LOG as one line: time, server, name, type, answer code.
"""
import json, socket, sys, time
import dns.flags, dns.message, dns.query, dns.rcode, dns.rdatatype, dns.rrset

role, port, arg, logf = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.bind(("127.0.0.1", port))
cache = {}  # (name, type) -> (expires_at, response wire)


def log(name, typ, rc):
    with open(logf, "a") as f:
        f.write(f"{time.time():.3f} {role}:{port} {name} {typ} {rc}\n")


def auth_answer(q):
    zone = json.load(open(arg))
    qn = q.question[0]; name = qn.name.to_text().lower(); typ = dns.rdatatype.to_text(qn.rdtype)
    r = dns.message.make_response(q); r.flags |= dns.flags.AA
    if name in zone.get("servfail", []):
        r.set_rcode(dns.rcode.SERVFAIL); r.flags &= ~dns.flags.AA
    elif name in zone["records"]:
        rec = zone["records"][name]
        if typ in rec:
            r.answer.append(dns.rrset.from_text_list(name, rec["ttl"], "IN", typ, rec[typ]))
        # name exists without this type: NOERROR with an empty answer ("NODATA")
    else:
        r.set_rcode(dns.rcode.NXDOMAIN)
    log(name, typ, dns.rcode.to_text(r.rcode()))
    return r.to_wire()


def cache_answer(q):
    qn = q.question[0]; key = (qn.name.to_text().lower(), qn.rdtype); now = time.time()
    hit = cache.get(key)
    if hit and hit[0] > now:
        r = dns.message.from_wire(hit[1]); r.id = q.id
        for rr in r.answer:
            rr.ttl = int(hit[0] - now)
        log(key[0], dns.rdatatype.to_text(qn.rdtype), "cached:" + dns.rcode.to_text(r.rcode()))
        return r.to_wire()
    up = dns.query.udp(q, "127.0.0.1", port=int(arg), timeout=2)
    ttl = min([rr.ttl for rr in up.answer] or [30])
    cache[key] = (now + ttl, up.to_wire())
    log(key[0], dns.rdatatype.to_text(qn.rdtype), "fetched:" + dns.rcode.to_text(up.rcode()))
    return up.to_wire()


while True:
    data, addr = s.recvfrom(4096)
    try:
        q = dns.message.from_wire(data)
        s.sendto(auth_answer(q) if role == "auth" else cache_answer(q), addr)
    except Exception as e:  # keep serving
        log("?", "?", "error:" + repr(e))
