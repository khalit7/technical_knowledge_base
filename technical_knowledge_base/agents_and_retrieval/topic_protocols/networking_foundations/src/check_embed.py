"""Confirm the built page carries exactly the recorded data and that the prose quotes it and the derived numbers right.

1. window.NF in ../index.html equals make_data.build() (the recordings in meas/out/).
2. The TCP timeline's inputs equal the root page's recording (src/wire/raw: h1_request.bin, h1_response.bin, h1_arrivals.json).
3. Every number the prose quotes from a measurement or derives by formula is recomputed here and must appear in the page.
4. The congestion animation's utilisation figures are recomputed in Python (an independent port of 26_js_rd_cc.js) and
   compared with the JavaScript run under node.
5. No secrets, home paths, local addresses or the root's private patterns anywhere in the page or src/.
Run from this folder: python3 check_embed.py
"""
import json, math, os, re, subprocess, sys

H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, H); sys.path.insert(0, os.path.join(H, "..", "..", "src"))
import make_data, private_patterns  # noqa: E402

page = open(os.path.join(H, "..", "index.html"), encoding="utf-8").read()
text = re.sub(r"<[^>]+>", " ", page)
bad = 0
def ok(cond, msg):
    global bad
    if not cond: bad += 1; print("FAIL", msg)

# 1. embedded data
m = re.search(r"window\.NF=(\{.*?\});\n", page, re.S)
ok(m and json.loads(m.group(1)) == json.loads(json.dumps(make_data.build())), "window.NF differs from meas/out (run make_data.py and build.sh)")
NF = make_data.build()

# 2. TCP timeline inputs against the root's recording
RAW = os.path.join(H, "..", "..", "src", "wire", "raw")
arr = json.load(open(os.path.join(RAW, "h1_arrivals.json")))["recv"]
w = re.search(r"const WRITES=(\[\[.*?\]\]);", page).group(1)
writes = json.loads(re.sub(r"'([^']*)'", lambda x: json.dumps(x.group(1)), w))
ok([[a["t_ms"], a["bytes"]] for a in arr] == [[x[0], x[1]] for x in writes], "TCP timeline writes differ from h1_arrivals.json")
ok(re.search(r"REQ=(\d+)", page).group(1) == str(len(open(os.path.join(RAW, "h1_request.bin"), "rb").read())), "request size")
resp = open(os.path.join(RAW, "h1_response.bin"), "rb").read()
ok(sum(x[1] for x in writes) == len(resp), "write sizes do not add up to the recorded response")

# 3. prose numbers
def has(s, why): ok(s in text or s in page, f"prose should contain {s!r} ({why})")
f0 = lambda v: f"{v:,.0f}"; f1 = lambda v: f"{v:,.1f}"
runs = NF["path"]["runs"]
conn = [r["connect_ms"] for r in runs]
has(f"{min(conn):.1f} to {max(conn):.1f} ms", "connect time range")
pm = re.search(r"= ([\d.]+)/([\d.]+)/([\d.]+)/", NF["mtu"]["rtt"]); has(f"{float(pm.group(1)):.1f} to {float(pm.group(3)):.1f} ms", "ping range")
ooo = [r["rxoutoforderbytes"] for r in runs if r["rxoutoforderbytes"]]
has(" and ".join(f0(x) for x in ooo), "out-of-order bytes")
w16 = [r["rcv_wnd"] for r in runs if r["rcvbuf"] == 16384]; has(f"{f0(min(w16))} to {f0(max(w16))} bytes", "16 KB windows")
for b in (16384, 65536):
    for r in [r for r in runs if r["rcvbuf"] == b]:
        ratio = r["goodput_mbps"] / (r["rcv_wnd"] * 8 / (r["srtt_ms"] / 1000) / 1e6)
        ok(0.9 <= ratio <= 1.1, f"window-limited run outside 10 percent: {b} {ratio:.3f}")
ser = NF["path"]["series"]["wnd"]; ok(round(ser[0][1] / 1024) == 125 and ser[0][1] < 131072, "autotune starts near 128 KB")
auto = [r["rcv_wnd"] for r in runs if r["rcvbuf"] == "auto"]; has(f"about {min(auto)/1e6:.1f} to {max(auto)/1e6:.1f} MB", "autotuned windows")
ok({r["rcv_wscale"] for r in runs if r["rcvbuf"] == "auto"} == {6} and {r["rcv_wscale"] for r in runs if r["rcvbuf"] == 16384} == {3}, "window scale shifts 6 and 3")
cur_small = [r["rttcur_ms"] for r in runs if r["rcvbuf"] in (16384, 65536)]; cur_big = [r["rttcur_ms"] for r in runs if r["rcvbuf"] in (262144, "auto")]
has(f"{min(cur_small)} to {max(cur_small)} ms", "window-limited current RTT"); has(f"{min(cur_big)} to {max(cur_big)} ms", "link-filling current RTT")
L = NF["loaded"]; has(f"{L['download']['mbps']:.1f} Mbit/s", "loaded download rate"); has(f"{L['idle_median_ms']:.1f} ms median", "idle median"); has(f"{L['loaded_median_ms']:.1f} ms while", "loaded median")
q = L["download"]["mbps"] * 1e6 * (L["loaded_median_ms"] - L["idle_median_ms"]) / 1000 / 8 / 1000; ok(abs(q - 125) < 5, f"queue size {q:.0f} KB vs roughly 125"); has(f"{L['loaded_median_ms'] - L['idle_median_ms']:.1f} ms, derived", "queue delay")
env = NF["env"]; has(re.search(r"cubic_sockets: (\d+)", env).group(1) + " sockets on CUBIC", "CUBIC sockets")
v4 = NF["mtu"]["v4"]; has(f0(v4["path_mtu"]), "path MTU"); has(f0(v4["largest_payload"]) + " bytes (+ 28", "largest payload")
ok({r["maxseg"] for r in runs} == {1388}, "MSS 1388"); has("1,388 bytes", "MSS")
us = NF["local"]["udp_sizes"]["results"]; ok(us["9216"] == "sent" and "too long" in us["9217"], "UDP 9216/9217")
bl = NF["local"]["backlog"]["clients"]; ok(sum(c["connect"] == "ok" for c in bl) == 7 and sum(c.get("reply") == "ok" for c in bl) == 2, "backlog 7 connected, 2 served")
ok(NF["quic"]["ladder"][0]["bytes"] == 1200, "QUIC first datagram 1200")
nd = NF["local"]["nodelay"]["tcp_nodelay"]; ok(nd["asyncio_client"] and not nd["asyncio_server_accepted"], "asyncio nodelay finding")
g = json.load(open(os.path.join(H, "inputs", "google_ipv6_2026.json")))["rows"]
first = next(r for r in g if r[3] >= 50); ok(first[:3] == [2026, 3, 28] and f"{first[3]:.2f}" == "50.10", "Google IPv6 first crossing"); has(f"{g[-1][3]:.2f} percent on 3 October 2026", "latest IPv6")
# derived numbers
D = {"125 MB": 10e9 / 8 * 0.1 / 1e6, "3.1 MB": 25e9 / 8 * 1e-3 / 1e6, "625 KB": 100e9 / 8 * 50e-6 / 1e3, "5.2 Mbit/s": 65535 * 8 / 0.1 / 1e6,
     "45 Mbit/s": 1460 * 8 / 0.1 * math.sqrt(1.5) / math.sqrt(1e-5) / 1e6, "470 per second": 28232 / 60, "7,875 s": 7200 + 9 * 75,
     "13 round trips": math.log2(125e6 / 14600), "21 Mbit/s": 262144 * 8 / 0.1 / 1e6, "1.3 Gbit/s": 16 * 2**20 * 8 / 0.1 / 1e9,
     "224 s": 140e9 * 8 / 5e9, "1,568 s": 980e9 * 8 / 5e9, "117 Mbit/s": 1000 * 1460 * 8 / 0.1 / 1e6, "27.6 Mbit/s": 65536 * 8 / 0.019 / 1e6}
for s, v in D.items():
    num = float(re.match(r"[\d,.]+", s).group(0).replace(",", ""))
    dec = len(s.split()[0].split(".")[1]) if "." in s.split()[0] else 0
    ok(round(v, dec) == num or (dec == 0 and abs(v - num) < 1), f"derived {s} recomputes as {v:.3f}"); has(s, "derived number")
ok(abs(8949 / 1448 - 6.18) < 0.01, "jumbo ratio")

# 4. congestion animation, independent port
def run(alg, RTT=0.1, CAP=1000, T=60, EXTRA=25, C=0.4, B=0.7):
    AL = 3 * (1 - B) / (1 + B); w = 10; ss = True; wmax = K = te = west = 0; tot = 0; n = 0
    for i in range(int(T / RTT) + 1):
        t = round(i * RTT, 1); tot += min(w, CAP); n += 1
        if w > CAP or abs(t - EXTRA) < 1e-9:
            if alg == "reno": w = max(2, w / 2)
            else: wmax = w; w = max(2, w * B); K = (wmax * (1 - B) / C) ** (1 / 3); te = t + RTT; west = w
            ss = False; continue
        if ss: w *= 2
        elif alg == "reno": w += 1
        else: tt = t + RTT - te; west += AL; w = max(C * (tt - K) ** 3 + wmax, west)
    return tot / (n * CAP)
src = open(os.path.join(H, "parts", "26_js_rd_cc.js")).read(); js = src[:src.index("})();") + 5]
out = subprocess.run(["node", "-e", "global.window={};" + js + ";console.log(JSON.stringify([window.NFCC.reno.util,window.NFCC.cubic.util]))"], capture_output=True, text=True).stdout
ju = json.loads(out); pu = [run("reno"), run("cubic")]
ok(all(abs(a - b) < 1e-9 for a, b in zip(ju, pu)), f"CC utilisation JS {ju} vs Python {pu}")

# 5. privacy
files = [os.path.join(H, "..", "index.html"), os.path.join(H, "..", "README.md")]
for root, _, fs in os.walk(H):
    files += [os.path.join(root, f) for f in fs if not f.endswith((".png",))]
pat = re.compile(r"glpat-|sk-ant-|Bearer [A-Za-z0-9._-]{12,}|/Users/|192\.168\.(?!0\.0/16)\d|" + private_patterns.alternation())
for f in files:
    if not os.path.exists(f) or "/.shots/" in f: continue
    for i, line in enumerate(open(f, encoding="utf-8", errors="ignore"), 1):
        if pat.search(line) and "pat = re.compile" not in line and "192\\.168" not in line:
            ok(False, f"private or secret-looking text in {os.path.relpath(f, H)}:{i}")
print("check_embed:", "FAIL " + str(bad) if bad else "ok (data embedded exactly; prose numbers, derived numbers and the CC animation recompute; no private text)")
sys.exit(1 if bad else 0)
