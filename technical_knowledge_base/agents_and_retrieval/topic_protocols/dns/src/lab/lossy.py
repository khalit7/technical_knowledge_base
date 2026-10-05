"""A UDP relay on port 53 that forwards DNS queries to UPSTREAM and drops the ones a rule picks, to reproduce what
a lost packet does to a stub resolver (the Kubernetes conntrack race loses one of the A/AAAA pair the same way).
Usage: python3 lossy.py UPSTREAM RULE   RULE: none | first-aaaa (drop the first AAAA query of each new name)
                                              | first-any (drop the first query of each new name)
                                              | all (a dead server: drop everything)
Logs one line per query to stdout: time, client, id, type, name, action."""
import socket, sys, threading, time
import dns.message, dns.rdatatype

up, rule = sys.argv[1], sys.argv[2]
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.bind(("0.0.0.0", 53))
seen = set()


def relay(data, addr):
    u = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); u.settimeout(5)
    u.sendto(data, (up, 53))
    try:
        s.sendto(u.recv(65535), addr)
    except OSError:
        pass


while True:
    data, addr = s.recvfrom(65535)
    try:
        q = dns.message.from_wire(data); qq = q.question[0]
        name, typ = qq.name.to_text(), dns.rdatatype.to_text(qq.rdtype)
    except Exception:
        name, typ = "?", "?"
    drop = False
    if rule == "first-aaaa" and typ == "AAAA" and name not in seen:
        drop = True; seen.add(name)
    elif rule == "all":
        drop = True
    elif rule == "first-any" and (name, "any") not in seen:
        drop = True; seen.add((name, "any"))
    print(f"{time.time():.4f} {addr[0]}:{addr[1]} {typ} {name} {'DROPPED' if drop else 'forwarded'}", flush=True)
    if not drop:
        threading.Thread(target=relay, args=(data, addr), daemon=True).start()
