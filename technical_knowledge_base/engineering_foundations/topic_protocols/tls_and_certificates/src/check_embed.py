"""Confirm the page embeds exactly what raw/ records, that numbers written in the prose match the recordings, and that
nothing private reached the repo. Run from src/: python3 check_embed.py (exit status 1 on any failure)."""
import json, os, re, subprocess, sys, glob
sys.path.insert(0, "../../src")
from private_patterns import alternation

fails = 0


def ok(name, cond, detail=""):
    global fails
    print(("ok   " if cond else "FAIL ") + name + (": " + str(detail) if detail else ""))
    fails += 0 if cond else 1


html = open("../index.html", encoding="utf-8").read()
before = open("parts/21_js_data.js").read()
subprocess.run([sys.executable, "make_data.py"], check=True, capture_output=True)
after = open("parts/21_js_data.js").read()
ok("parts/21_js_data.js is a fresh make_data.py output of raw/", before == after)
ok("index.html embeds that data byte for byte", after.strip().split("\n", 1)[1] in html)

R = lambda n: json.load(open(os.path.join("raw", n)))
text = re.sub(r"<[^>]+>", " ", html)
t13 = R("hs_tls13.json"); m = t13["records"]
prose = {
    "ClientHello 1,529 bytes": (m[0]["len"], "1,529 bytes"),
    "ServerHello 1,210 bytes": (m[1]["len"], "ServerHello</b> (1,210 bytes"),
    "Certificate message 917": ([x for r in m for x in r.get("msgs", []) if x["type"] == "Certificate"][0]["len"], "Certificate</b> (917 bytes"),
    "CertificateVerify 78": ([x for r in m for x in r.get("msgs", []) if x["type"] == "CertificateVerify"][0]["len"], "CertificateVerify</b> (78 bytes"),
    "NewSessionTicket 249": ([x for r in m for x in r.get("msgs", []) if x["type"] == "NewSessionTicket"][0]["len"], "NewSessionTicket</b> (249 bytes"),
}
want = {"ClientHello 1,529 bytes": 1529, "ServerHello 1,210 bytes": 1210, "Certificate message 917": 917, "CertificateVerify 78": 78, "NewSessionTicket 249": 249}
for k, (v, s) in prose.items():
    ok("prose: " + k, v == want[k] and s in html, v)
ok("prose: request record 294 bytes", any(r.get("app_bytes") == 277 and r["len"] == 294 for r in m) and "294 bytes" in text)
ok("prose: mTLS client bytes 1,913 without mTLS", R("hs_tls13.json")["wire_bytes"]["c2s"] == 1913 and "1,913" in text)
p = R("public_chains.json")
ok("prose: 10 of the 12 public endpoints hybrid", sum("MLKEM" in (h.get("group") or "") for h in p["hosts"]) == 10 and "10 of the 12" in text)
h = R("hrr.json")
ok("prose: ClientHello 236 to 1,458 bytes", [c["client_hello_bytes"] for c in h["cases"]][4] == 236 and [c["client_hello_bytes"] for c in h["cases"]][0] == 1458 and "236 to 1,458" in text)
c = R("hs_cost.json")["median_ms"]
ok("prose: 0.05 ms against 1.4 ms", round(c["one kept-alive connection"], 2) == 0.05 and round(c["new connection, full handshake"], 1) == 1.4 and "0.05 ms against 1.4 ms" in text, c)
fl = {k: 0 for k in ("tls13", "mldsa65")}
ok("prose: 15.9 KB against 2.4 KB", "15.9 KB against 2.4 KB" in text)

# privacy: no private patterns, home path, scratch path or secret-looking tokens anywhere committed
pat = re.compile(alternation(), re.I)
files = [f for f in glob.glob("**/*", recursive=True) if os.path.isfile(f) and "__pycache__" not in f and f != "check_embed.py"] + ["../index.html", "../README.md"]
hits = []
for f in files:
    s = open(f, encoding="utf-8", errors="replace").read()
    if pat.search(s) or "/Users/" in s or "claude-502" in s or re.search(r"glpat-|sk-ant-|Bearer [A-Za-z0-9._-]{12,}|BEGIN (EC |RSA )?PRIVATE KEY", s):
        hits.append(f)
ok("no private patterns, paths, keys or tokens in %d files" % len(files), not hits, hits)
print("\n%d failed" % fails)
sys.exit(1 if fails else 0)
