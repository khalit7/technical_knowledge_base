"""E8 to E10: caching, recorded against a real Unbound.
E8  an address changed at the authoritative server while a resolver holds the old one (TTL 30 s)
E9  negative caching: a name looked up before it exists, then created (SOA TTL 300, SOA MINIMUM 30)
E10 the authoritative server goes away after the TTL ran out: SERVFAIL, or a stale answer with serve-expired (RFC 8767)
Output: out/cache.json"""
import os, re, time
from common import *

Q = "proto-dns-q"


def dig(server, q, wait=6):
    t = time.time()
    p = sh(["docker", "exec", Q, "dig", f"@{server}", *q.split(), "+noall", "+comments", "+answer", "+authority", "+stats", "+tries=1", f"+timeout={wait}"], timeout=60)
    o = p.stdout
    st = re.search(r"status: (\w+)", o); ans = re.findall(r"^(\S+)\s+(\d+)\s+IN\s+(\w+)\s+(.+)$", o, re.M)
    qt = re.search(r"Query time: (\d+) msec", o)
    return {"t": round(t, 3), "server": server, "q": q, "status": st.group(1) if st else "no reply",
            "rows": [list(a) for a in ans], "ms": int(qt.group(1)) if qt else None}


def edit_llm(fn):
    live = os.path.join(WORK, "live", "llm.test.zone")
    s = open(live).read(); s = fn(s)
    s = re.sub(r"(SOA ns1\.llm\.test\. ops\.llm\.test\. )(\d+)", lambda m: m.group(1) + str(int(m.group(2)) + 1), s)
    tmp = live + ".tmp"; open(tmp, "w").write(s); os.replace(tmp, live)


def poll(seconds, step, servers, q, at=None, action=None):
    rows, t0, done = [], time.time(), False
    while time.time() - t0 < seconds:
        if at is not None and not done and time.time() - t0 >= at:
            action(); done = True; rows.append({"t": round(time.time(), 3), "event": "changed at the authoritative server"})
        for s in servers:
            rows.append(dig(s, q))
        time.sleep(step)
    return rows


def fresh():
    install_zones("unsigned")
    unbound("proto-dns-unbound", "10.53.0.53", "")
    unbound("proto-dns-unbound2", "10.53.0.54", "  serve-expired: yes\n")
    time.sleep(3)


def main():
    hierarchy_up("unsigned")
    run_bg(Q, "10.53.0.101", TOOLS, ["sleep", "1800"])
    res = {"when": now_iso()}
    fresh()
    # E8
    res["ttl_change"] = poll(44, 2, ["10.53.0.53", "10.53.0.12"], "weights.llm.test A", at=6,
                             action=lambda: edit_llm(lambda s: s.replace("10.53.0.81", "10.53.0.82")))
    # E9
    fresh()
    res["negative"] = poll(40, 2, ["10.53.0.53", "10.53.0.12"], "gone.llm.test A", at=4,
                           action=lambda: edit_llm(lambda s: s + "gone.llm.test. 300 IN A 10.53.0.83\n"))
    res["nodata"] = dig("10.53.0.53", "api.llm.test TXT")
    # E10
    fresh()
    rows = [dig("10.53.0.53", "weights.llm.test A"), dig("10.53.0.54", "weights.llm.test A")]
    stop("proto-dns-auth"); rows.append({"t": round(time.time(), 3), "event": "authoritative server for llm.test. stopped"})
    time.sleep(34)
    rows += [dig("10.53.0.53", "weights.llm.test A", 20), dig("10.53.0.54", "weights.llm.test A")]
    time.sleep(3)
    rows += [dig("10.53.0.54", "weights.llm.test A")]
    res["stale"] = rows
    res["unbound2_log"] = [l for l in logs("proto-dns-unbound2", "2000-01-01T00:00:00Z") if "weights" in l][-8:]
    stop(Q)
    hierarchy_up("unsigned")
    save("cache", res)


if __name__ == "__main__":
    main()
