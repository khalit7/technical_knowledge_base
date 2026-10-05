"""Turn the lab's recordings (lab/out/*.json) into parts/22_js_data.js (window.DNSD). Plain Python 3, stdlib only.
Packets from tcpdump are parsed into one event per DNS message; everything else is copied, trimmed for display."""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "lab", "out")
L = lambda n: json.load(open(os.path.join(OUT, n + ".json")))
PKT = re.compile(r"(\d+)(\S*)\s+(?:(NXDomain|ServFail|Refused|FormErr)\S*\s+)?(?:q: )?(\w+)\? (\S+)(?: (\d+)/(\d+)/(\d+))?")


def packets(lines, me="10.53.0.100"):
    """tcpdump -vv prints two lines per packet: a header line with the time, then src > dst and the decoded DNS."""
    ev, t0 = [], None
    for i in range(0, len(lines) - 1):
        a, b = lines[i], lines[i + 1]
        m0 = re.match(r"^(\d+\.\d+) IP .*proto (UDP|TCP)", a)
        if not m0 or not b.startswith("    "):
            continue
        t = float(m0.group(1)); proto = m0.group(2)
        mm = re.match(r"\s+(\S+)\.(\d+) > (\S+)\.(\d+): (.*)$", b)
        if not mm:
            continue
        body = re.sub(r"\[bad udp cksum [^\]]*\] |\[udp sum ok\] ", "", mm.group(5))
        p = PKT.search(body.split("length", 1)[-1] if proto == "TCP" else body)
        if proto == "TCP" and not p:
            fl = re.search(r"Flags \[([^\]]*)\]", body)
            if fl and t0 is not None:
                ev.append({"t": round((t - t0) * 1000, 1), "d": "q" if mm.group(1) == me else "r", "tcp": fl.group(1)})
            continue
        if not p:
            continue
        if t0 is None:
            t0 = t
        out = mm.group(1) == me
        e = {"t": round((t - t0) * 1000, 1), "d": "q" if out else "r", "to": mm.group(3) if out else mm.group(1),
             "id": int(p.group(1)), "type": p.group(4), "name": p.group(5)}
        if proto == "TCP":
            e["proto"] = "TCP"
        if not out:
            e["rcode"] = p.group(3) or "NOERROR"
            e["an"] = int(p.group(6)) if p.group(6) else 0
            if "+" in p.group(2) or "|" in p.group(2):
                pass
            if "|" in p.group(2):
                e["tc"] = True
            ans = re.findall(r"\b(?:A|AAAA) ([0-9a-f.:]+)", body.split(" ns: ")[0])
            if ans:
                e["addrs"] = ans[:6] + (["..."] if len(ans) > 6 else [])
        ev.append(e)
    return ev


def assign(ev, calls, pt0, resolv):
    """Give each packet the index of the getaddrinfo call it belongs to. First guess: the last call that had started
    when the packet was captured (pod and capture share the VM's clock, to within a millisecond or so). A query whose
    name cannot belong to that call (the name as written or with a search suffix) moves to the neighbouring call it can
    belong to; replies and TCP segments follow the query they answer or the call in progress."""
    m = re.search(r"^search (.*)$", resolv, re.M); search = m.group(1).split() if m else []
    cand = [({c["name"]} if c["name"].endswith(".") else {c["name"] + "." + x + "." for x in search} | {c["name"] + "."}) for c in calls]
    ids, cur = {}, 0
    for e in ev:
        ab = pt0 + e["t"] / 1000
        dist = [max(c["t0"] - ab, ab - (c["t0"] + c["ms"] / 1000), 0) for c in calls]
        k = dist.index(min(dist))
        if "type" in e and e["d"] == "q":
            if e["name"] not in cand[k]:
                for j in (k - 1, k + 1, k - 2, k + 2):
                    if 0 <= j < len(calls) and e["name"] in cand[j]:
                        k = j; break
            ids[e["id"]] = k; cur = k
        elif "type" in e:
            k = ids.get(e["id"], k)
        else:
            k = cur
        e["c"] = k
    return ev


def clean_dig(s):
    keep = []
    for l in s.splitlines():
        if l.startswith(";; Got answer") or l.startswith(";; OPT PSEUDO") or not l.strip():
            continue
        keep.append(l.replace("\t", " "))
    return "\n".join(keep)


def main():
    D = {}
    w = L("walk")
    D["walk"] = {"when": w["when"], "runs": []}
    for r in w["runs"]:
        t0 = None; rows = []
        for u in r["cold_upstream"]:
            hh, mi, ss = u["t"][11:].rstrip("Z").split(":")
            t = int(hh) * 3600 + int(mi) * 60 + float(ss)
            t0 = t if t0 is None else t0
            rows.append({"t": round((t - t0) * 1000, 2), "server": u["server"], "type": u["type"], "name": u["name"],
                         "rcode": u["rcode"], "flags": u["flags"], "size": u["size"]})
        qt = lambda s: int(re.search(r"Query time: (\d+)", s).group(1))
        ttl = re.search(r"api\.llm\.test\.\s+(\d+)\s+IN\s+A", r["warm_dig"]).group(1)
        D["walk"]["runs"].append({"qmin": r["qname_minimisation"], "up": rows, "cold_ms": qt(r["cold_dig"]),
                                  "warm_ms": qt(r["warm_dig"]), "warm_ttl": int(ttl), "warm_up": len(r["warm_upstream"])})
    D["walk"]["records"] = {k: clean_dig(v) for k, v in w["records"].items()}
    D["walk"]["trunc"] = w["truncation"]
    D["wire"] = L("wire")["runs"]
    p = L("pod")
    D["pod"] = {"when": p["when"], "versions": p["versions"], "sc": []}
    for s in p["scenarios"]:
        D["pod"]["sc"].append({"label": s["label"], "libc": s["libc"], "resolv": s["resolv"], "rule": s["rule"],
                               "calls": [{k: c[k] for k in ("name", "ok", "ms", "t0", "addrs", "error") if k in c} for c in s["calls"]],
                               "ev": packets(s["packets"]), "relay": s.get("relay_log")})
    # absolute start times, so the lab can line packets up with each getaddrinfo call
    for s, raw in zip(D["pod"]["sc"], p["scenarios"]):
        first = next((l for l in raw["packets"] if re.match(r"^\d+\.\d+ IP", l)), None)
        s["pt0"] = float(first.split()[0]) if first else None
        if first:
            assign(s["ev"], s["calls"], s["pt0"], s["resolv"])
    D["pod"]["http"] = {"n": 10}
    for variant, h in p["http"].items():
        hev = packets(h["packets"]); marks = {m["mark"]: m for m in h["out"]}
        ht0 = float(next(l for l in h["packets"] if re.match(r"^\d+\.\d+ IP", l)).split()[0])
        def count(a, b):
            lo, hi = (marks[a]["t"] - ht0) * 1000, (marks[b]["t"] - ht0) * 1000
            return sum(1 for e in hev if e["d"] == "q" and lo <= e["t"] <= hi and "type" in e)
        D["pod"]["http"][variant] = {"fresh": count("fresh_start", "fresh_end"), "pooled": count("pooled_start", "pooled_end")}
    c = L("cache")
    def series(rows):
        t0 = rows[0]["t"]; out = []
        for r in rows:
            if "event" in r:
                out.append({"t": round(r["t"] - t0, 2), "event": r["event"]}); continue
            a = [x for x in r["rows"] if x[2] in ("A", "SOA")]
            out.append({"t": round(r["t"] - t0, 2), "s": r["server"], "st": r["status"], "ms": r["ms"],
                        "ttl": int(a[0][1]) if a else None, "v": a[0][3] if a and a[0][2] == "A" else None})
        return out
    D["cache"] = {"change": series(c["ttl_change"]), "neg": series(c["negative"]), "stale": series(c["stale"]),
                  "nodata": c["nodata"]}
    s = L("sec")
    D["sec"] = {"dnssec": {k: (clean_dig(v) if isinstance(v, str) else v) for k, v in s["dnssec"].items()},
                "rebind": s["rebinding"], "loop": s["loop"]}
    pub = L("public")
    D["pub"] = {k: (clean_dig(v) if isinstance(v, str) else v) for k, v in pub.items()}
    js = "// generated by make_data.py from lab/out/*.json; do not edit\nwindow.DNSD=" + json.dumps(D, separators=(",", ":"), ensure_ascii=False) + ";\n"
    open(os.path.join(HERE, "parts", "22_js_data.js"), "w").write(js)
    print(len(js), "bytes")


if __name__ == "__main__":
    main()
