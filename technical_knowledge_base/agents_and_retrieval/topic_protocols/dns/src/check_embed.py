"""Checks that the built page says exactly what the recordings say. Plain Python 3 plus node.
1. parts/22_js_data.js is regenerated from lab/out/*.json by make_data.py, and index.html embeds it byte for byte.
2. The Cache timeline's model (parts/32_js_cache_model.js) agrees with an independent Python version (recompute below).
3. The page's in-browser key-tag function gives the root's real key tags (inputs/root_dnskey_2026100500.txt,
   from InterNIC's root zone) and they are the ones IANA publishes (inputs/root-anchors.xml).
4. Every number the prose quotes from a recording is recomputed from the data.
5. No private pattern (the root's git-ignored list), home path, secret-looking token or em-dash in anything committed.
Usage: python3 check_embed.py   (from this folder)"""
import json, math, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, "..", "index.html")
ok = True


def check(cond, what):
    global ok
    print(("ok   " if cond else "FAIL ") + what)
    ok = ok and cond


# 1
subprocess.run([sys.executable, os.path.join(HERE, "make_data.py")], check=True, capture_output=True)
data_js = open(os.path.join(HERE, "parts", "22_js_data.js")).read()
html = open(PAGE).read()
check(data_js.strip() in html, "index.html embeds parts/22_js_data.js exactly (rebuild with sh build.sh if not)")
D = json.loads(data_js[data_js.index("=") + 1:].rstrip().rstrip(";"))


# 2: the cache model, written again in Python
def model(p):
    N, d = 400, []
    for i in range(N):
        u = (i + 0.5) / N
        if p["lead"] <= 0:
            e = (1 - u) * p["oldTTL"]
        else:
            e0 = -p["lead"] + (1 - u) * p["oldTTL"]
            e = e0 if e0 > 0 else p["newTTL"] - math.fmod(-e0, p["newTTL"])
        d.append(e)
    C, M = [], 1000
    for j in range(M):
        s = d[j % N]; k = (j * 7919) % M / M
        if k < p["jvmShare"]:
            s += p["jvm"] * ((j * 104729) % M / M)
        if k >= 1 - p["pinShare"]:
            s = math.inf
        C.append(s)
    C.sort(); fin = [x for x in C if math.isfinite(x)]
    at = lambda t: sum(1 for s in C if s > t) / M
    return {"worst": fin[-1] if fin else 0, "a10": at(10), "a60": at(60), "a900": at(900), "a1800": at(1800)}


cases = [dict(oldTTL=3600, newTTL=60, lead=3600, jvm=30, jvmShare=0.2, pinShare=0), dict(oldTTL=3600, newTTL=60, lead=1800, jvm=30, jvmShare=0, pinShare=0),
         dict(oldTTL=3600, newTTL=60, lead=0, jvm=30, jvmShare=0.2, pinShare=0.05), dict(oldTTL=86400, newTTL=300, lead=43200, jvm=30, jvmShare=0.5, pinShare=0.2)]
js = open(os.path.join(HERE, "parts", "32_js_cache_model.js")).read()
node = "global.window={};" + js + ";const C=" + json.dumps(cases) + ";console.log(JSON.stringify(C.map(p=>{const m=window.cacheModel(p);return {worst:m.worst,a10:m.at(10),a60:m.at(60),a900:m.at(900),a1800:m.at(1800)}})))"
jsres = json.loads(subprocess.run(["node", "-e", node], capture_output=True, text=True, check=True).stdout)
for c, r in zip(cases, jsres):
    py = model(c)
    check(all(abs(py[k] - r[k]) < 1e-9 for k in py), f"cache model JS = Python for {c}: worst {py['worst']:.1f} s, at 60 s {py['a60']:.3f}")
check(60 < model(cases[0])["worst"] <= 90, "lowered one old TTL ahead: worst case within new TTL + client cache (60 + 30 s)")
check(abs(model(cases[1])["worst"] - 1800) < 10, "lowered only half an old TTL ahead: worst case about 1,800 s")
# 3: key tags
lines = [l for l in open(os.path.join(HERE, "inputs", "root_dnskey_2026100500.txt")) if "DNSKEY" in l]
keys = [l.split()[4:] for l in lines]
kt = re.search(r"window\.keyTag=function.*?;\s*return ac&0xffff\};", html, re.S).group(0)
node = "global.atob=s=>Buffer.from(s,'base64').toString('binary');global.window={};" + kt + "console.log(JSON.stringify(" + json.dumps(keys) + ".map(k=>window.keyTag(+k[0],+k[1],+k[2],k.slice(3).join('')))))"
tags = json.loads(subprocess.run(["node", "-e", node], capture_output=True, text=True, check=True).stdout)
xml = open(os.path.join(HERE, "inputs", "root-anchors.xml")).read()
anchors = sorted(int(t) for t in re.findall(r"<KeyTag>(\d+)</KeyTag>", xml))
check(sorted(tags) == [8763, 20326, 38696, 57780], f"in-browser key tags of the root zone's DNSKEYs: {sorted(tags)}")
check({20326, 38696} <= set(anchors) and {20326, 38696} <= set(tags), f"both root KSK tags are IANA trust anchors {anchors}")
check(all("matches IANA anchor" in l for l in D["pub"]["keytags"] if l.startswith("KSK")), "keytags.py: both KSK DS digests match IANA's")
# 4: numbers quoted in prose
by = {s["label"]: s for s in D["pod"]["sc"]}
def per(label, i):
    s = by[label]; ev = [e for e in s["ev"] if e.get("c") == i and "type" in e]
    return sum(1 for e in ev if e["d"] == "q"), sum(1 for e in ev if e.get("rcode") == "NXDomain")
q5, nx5 = per("glibc_ndots5", 0)
check((q5, nx5) == (8, 6), f"api.llm.test with ndots:5 = 8 queries, 6 NXDOMAIN (recorded {q5}, {nx5})")
check(per("glibc_ndots5_4dom", 0) == (10, 8), "four search domains: 10 queries, 8 NXDOMAIN")
check(not by["musl_ndots1"]["calls"][2]["ok"] and by["glibc_ndots1"]["calls"][2]["ok"], "kubernetes.default with ndots:1: glibc resolves, musl fails")
ms = by["glibc_drop_aaaa"]["calls"][0]["ms"]
check(f"{ms:,.0f} ms" in html, f"one-screen quotes the lost-packet time {ms:,.0f} ms")
check(5000 < ms < 5100 and 2500 < by["musl_drop_aaaa"]["calls"][0]["ms"] < 2600 and 1000 < by["glibc_drop_aaaa_t1"]["calls"][0]["ms"] < 1100, "timeouts: glibc about 5 s, musl about 2.5 s, timeout:1 about 1 s")
check(by["glibc_dead_first"]["calls"][0]["ms"] > 5000 and by["musl_dead_first"]["calls"][0]["ms"] < 100, "dead first server: glibc about 5 s, musl fast")
H = D["pod"]["http"]
check(H["keepalive"]["fresh"] == 80 and H["keepalive"]["pooled"] == 8 and H["close"]["pooled"] == 80, "HTTP: 80 / 80 / 8 queries")
T = D["walk"]["trunc"]
check("rcvd: 671" in T["udp_512_then_tcp"] and "rcvd: 682" in T["edns_1232"] and "671-byte" in html and "(682 bytes)" in html, "truncation sizes 671 and 682 bytes")
walk = D["walk"]["runs"]
check([u["name"] for u in walk[0]["up"]][1] == "test." and [u["name"] for u in walk[1]["up"]][1] == "api.llm.test.", "QNAME minimisation: root saw test. with it, api.llm.test. without")
neg = [r for r in D["cache"]["neg"] if r.get("s") == "10.53.0.53"]
flip = next(r for r in neg if r["st"] == "NOERROR")
check(29 <= flip["t"] <= 33 and neg[0]["ttl"] == 30, f"negative cache: answer appeared at {flip['t']} s, negative TTL 30")
chg = D["cache"]["change"]; ev = next(r for r in chg if "event" in r); fl = next(r for r in chg if r.get("s") == "10.53.0.53" and r.get("v") == "10.53.0.82")
check(28 <= fl["t"] <= 33, f"TTL change: resolver switched at {fl['t']} s, about 30 s after its fetch")
st = [r for r in D["cache"]["stale"] if r.get("s") == "10.53.0.54" and r["t"] > 1]
check(all(r["ttl"] == 30 and 1700 < r["ms"] < 1900 for r in st), "serve-stale: TTL 30 after about 1.8 s")
P = D["pub"]
t1 = re.search(r"api\.anthropic\.com\.\s+(\d+)\s", P["api_a_1"]).group(1); t2 = re.search(r"api\.anthropic\.com\.\s+(\d+)\s", P["api_a_2"]).group(1)
check(f"{t1} seconds left" in html and f"{t2} seconds left" in html and f"{t1}, then {t2}" in html, f"api.anthropic.com TTLs quoted as recorded: {t1} then {t2}")
check("1800 IN SOA" in re.sub(r"\s+", " ", P["soa"]) and "604800 1800" in P["soa"], "anthropic.com SOA TTL and MINIMUM 1,800")
check('alpn="h2"' in P["api_https"] and 'alpn="h3,h2"' in P["cf_https"], "HTTPS records: api.anthropic.com h2, cloudflare.com h3,h2")
check(P["rootzone"]["tld_count"] == 1437 and "1,437" in html, "1,437 TLDs delegated in the root zone file")
check("20326" in P["root_rrsig"], "root key set signed by 20326 on 5 October")
check("SERVFAIL" in P["failed"] and "NOERROR" in P["failed_cd"] and "EDE: 9" in P["failed"], "dnssec-failed.org: SERVFAIL, EDE 9, answer with +cd")
check(P["identity"]["plain_same_as_dot"] is False and re.fullmatch(r'"[a-z]{3}\d{2}"', P["identity"]["dot"]) is not None, "DoT reached a public data-centre code; plain UDP did not")
check(all(x == "468" for x in re.findall(r"MSG SIZE  rcvd: (\d+)", json.dumps(P))), "every recorded DoT reply 468 bytes")
check("ra" in P["root_intercept"].split("flags:")[1].split(";")[0] and "ANSWER: 2" in P["root_intercept"], "a root server's address answered with RA and a final answer (interception)")
S = D["sec"]
check("validation failure" in " ".join(S["dnssec"]["expired_log"]) and "signature expired" in " ".join(S["dnssec"]["expired_log"]), "expired signatures: Unbound logs signature expired")
check("SERVFAIL" in S["dnssec"]["rolled_old_anchor"] and " ad" in S["dnssec"]["rolled_new_anchor"], "rolled root: old anchor SERVFAIL, new anchor validates")
nv = next(r for r in S["rebind"] if r["mode"] == "naive"); pn = next(r for r in S["rebind"] if r["mode"] == "pinned")
check("LAB-FAKE-KEY" in nv["out"]["steps"][-1]["body"] and pn["out"]["steps"][-1]["body"] == "attacker page", "rebinding: naive leaked, pinned did not")
check(S["loop"]["exit"] != 0 and any("Loop" in l for l in S["loop"]["out"]), "CoreDNS loop plugin halted")
# 5: privacy and style over everything that will be committed
sys.path.insert(0, os.path.normpath(os.path.join(HERE, "..", "..", "src")))
import private_patterns as pp
pat = re.compile(pp.alternation(), re.I) if pp.PATTERNS else None
home = os.path.expanduser("~")
bad = []
for root, _, files in os.walk(os.path.join(HERE, "..")):
    if ".shots" in root:
        continue
    for f in files:
        fp = os.path.join(root, f)
        try:
            t = open(fp, encoding="utf-8").read()
        except Exception:
            continue
        for what, hit in [("private pattern", pat and pat.search(t)), ("home path", home in t), ("token", f != "check_embed.py" and re.search("glpat" + "-|sk-" + "ant-|Bearer [A-Za-z0-9._-]{12,}", t)), ("em-dash", chr(0x2014) in t)]:
            if hit:
                bad.append(f"{what}: {os.path.relpath(fp, HERE)}")
check(not bad, "no private pattern, home path, token or em-dash in the page folder" + ("" if not bad else ": " + "; ".join(bad)))
check(len(pp.PATTERNS) > 0, f"the root's private pattern list is present ({len(pp.PATTERNS)} patterns)")
print("ALL OK" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
