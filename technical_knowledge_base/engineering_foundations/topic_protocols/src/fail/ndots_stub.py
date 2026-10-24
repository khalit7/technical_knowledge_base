"""What a pod's resolver library does with a name, given a resolv.conf: python ndots_stub.py RESOLV_CONF NAME PORT

The search-list rule is implemented here from resolv.conf(5) (man7.org/linux/man-pages/man5/resolv.conf.5.html):
if the name has fewer dots than ndots, each search domain is appended first and the name as typed is tried last;
with ndots or more dots (or a trailing dot) the name as typed is tried first. glibc asks for A and AAAA (IPv4 and
IPv6) for every candidate. The queries go to a real DNS server on 127.0.0.1:PORT, which logs them."""
import sys, time
import dns.message, dns.query, dns.rcode

conf, name, port = sys.argv[1], sys.argv[2], int(sys.argv[3])
search, ndots = [], 1
for line in open(conf):
    w = line.split()
    if w and w[0] == "search": search = w[1:]
    if w and w[0] == "options":
        for o in w[1:]:
            if o.startswith("ndots:"): ndots = int(o[6:])
if name.endswith("."):
    cands = [name]
else:
    rel = [f"{name}.{d}." for d in search]
    cands = [name + "."] + rel if name.count(".") >= ndots else rel + [name + "."]
print(f"name {name!r}: {name.rstrip('.').count('.')} dots, ndots={ndots}, trailing dot={name.endswith('.')}")
n, t0 = 0, time.perf_counter()
for c in cands:
    rcs = []
    for typ in ("A", "AAAA"):
        r = dns.query.udp(dns.message.make_query(c, typ), "127.0.0.1", port=port, timeout=2); n += 1
        rcs.append(f"{typ} {dns.rcode.to_text(r.rcode())}" + (f" {r.answer[0][0]}" if r.answer else ""))
    print(f"  {c:52s} {' | '.join(rcs)}")
    if rcs[0].startswith("A NOERROR"):
        break
print(f"{n} queries, {(time.perf_counter() - t0) * 1000:.1f} ms on loopback")
