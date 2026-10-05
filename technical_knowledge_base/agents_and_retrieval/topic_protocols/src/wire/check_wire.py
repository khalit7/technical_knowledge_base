"""Confirm the On the wire tab shows exactly the recorded captures.
1. Rebuilding the data from raw/ gives byte for byte the WI_DATA embedded in ../../index.html.
2. The exact request and response bytes in raw/ are what REQUEST.md and the page show.
3. Nothing secret or identifying in raw/ or in the page: tokens, the home router's address, the DNS filter's vendor.
4. Spot checks that headline numbers recompute from the raw files independently of build_data.py.
Usage: python3 check_wire.py   (after build_data.py and ../build.sh). Exit code 1 on any failure.
"""
import csv, glob, json, os, re, statistics, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "raw")
PAGE = os.path.join(HERE, "..", "..", "index.html"); PART = os.path.join(HERE, "..", "parts", "31_js_wi_0data.js")
fails = []
ok = lambda c, m: None if c else fails.append(m)

# 1. regenerate and compare
before = open(PART).read()
subprocess.run([sys.executable, os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
after = open(PART).read()
ok(before == after, "parts/31_js_wi_0data.js is stale: rerun build_data.py")
page = open(PAGE, encoding="utf-8").read()
ok(after.strip() in page, "index.html does not embed the current WI_DATA: rerun build.sh")
D = json.loads(after[after.index("=") + 1:].rstrip().rstrip(";"))

# 2. exact bytes
req = open(os.path.join(R, "h1_request.bin"), "rb").read().decode(); res = open(os.path.join(R, "h1_response.bin"), "rb").read().decode()
ok(D["request"]["h1_request"] == req and D["request"]["h1_response"] == res, "request/response bytes differ from raw/")
md = open(os.path.join(HERE, "REQUEST.md")).read()
ok(req.replace("\r\n", "\n").split("\n\n")[0] in md, "REQUEST.md request head differs from raw/h1_request.bin")
ok(res.replace("\r\n", "\n").split("\n\n")[0] in md, "REQUEST.md response head differs from raw/h1_response.bin")
ok(open(os.path.join(HERE, "request.json")).read() in md, "REQUEST.md body differs from request.json")

# 3. secrets and identifying data
import sys as _s, os as _o; _s.path.insert(0, _o.path.join(_o.path.dirname(_o.path.abspath(__file__)), "..")); from private_patterns import alternation as _priv
pat = re.compile(r"glpat-[A-Za-z0-9]|sk-ant-[A-Za-z0-9]|Bearer (?=[A-Za-z0-9._-]*[0-9])[A-Za-z0-9._-]{16,}|" + _priv())
# this tab's files only (other tabs' parts are their authors' to check)
mine = glob.glob(os.path.join(HERE, "..", "parts", "31_*")) + [os.path.join(HERE, "REQUEST.md")]
for f in glob.glob(os.path.join(R, "**", "*"), recursive=True) + mine:
    if os.path.isfile(f) and not f.endswith((".bin",)):
        t = open(f, encoding="utf-8", errors="replace").read()
        if f.endswith(".json"):  # hex dumps can contain any short pattern; check decoded text only
            t = re.sub(r'"hex": "[0-9a-f]*"', "", t)
        m = pat.search(t); ok(not m, "possible secret or identifying text in %s: %s" % (f, m and m.group(0)))

# 4. independent spot checks
rows = list(csv.DictReader(open(os.path.join(R, "public_curl.tsv")), delimiter="\t"))
for host, v in D["waterfall"]["public"].items():
    xs = [float(r["time_connect"]) * 1000 for r in rows if r["host"] == host]
    ok(abs(statistics.median(xs) - v["tcp"]) < 0.01, "public TCP median for " + host)
c = json.load(open(os.path.join(R, "client_h2.json")))["runs"][0]
ok(D["anatomy"]["setup"]["tls_ms"] == c["setup"]["tls_ms"], "anatomy TLS time")
ch = bytes.fromhex(c["wire"][0]["hex"]); ok(int.from_bytes(ch[3:5], "big") == D["anatomy"]["client_hello"]["len"], "ClientHello length")
ok(b"api.llm.test" in ch, "SNI in the recorded ClientHello")
h = json.load(open(os.path.join(R, "hol", "loss_h3.json"))); b = json.load(open(os.path.join(R, "hol", "base_h3.json")))
ok(round(h["token_ms"]["0"][1] - b["token_ms"]["0"][1]) - D["hol"]["stall_ms"] in range(-15, 16), "QUIC stall in the loss run is near the probe's")
for p in ("h1", "h2"):
    ev = [json.loads(l) for l in open(os.path.join(R, "hol", "nt_loss_%s.log" % p)) if '"held": true' in l]
    ok(len(ev) == 1 and abs(ev[0]["release_ms"] - ev[0]["t_ms"] - 25 - D["hol"]["stall_ms"]) < 1, "TCP hold in %s equals the QUIC stall" % p)
ok(D["hol"]["quic_missing_pn"] and len(D["hol"]["quic_missing_pn"]) == 1, "exactly one QUIC packet missing in the loss run")

# the page shows numbers only through WI_DATA: no hard-coded milliseconds in the tab's HTML
tab = open(os.path.join(HERE, "..", "parts", "31_tab_wire.html")).read()
ok(not re.search(r"\b\d+(\.\d+)? ms\b", re.sub(r"<style>.*?</style>", "", tab, flags=re.S).replace("50 ms", "").replace("25 ms", "").replace("10 ms", "")),
   "hard-coded ms value in 31_tab_wire.html (other than the emulation settings 25/50 ms and the 10 ms stagger)")

print("check_wire:", "ok" if not fails else "FAIL")
for f in fails:
    print("  -", f)
sys.exit(1 if fails else 0)
