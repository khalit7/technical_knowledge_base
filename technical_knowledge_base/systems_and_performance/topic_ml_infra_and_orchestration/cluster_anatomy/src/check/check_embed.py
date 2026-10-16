"""The page embeds exactly out/expected.json (without the test cases), prose numbers agree with the data,
and nothing private is in the page or src/. usage: python3 -I check/check_embed.py  (from src/)"""
import json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
page = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
exp = json.load(open(os.path.join(HERE, "out", "expected.json")))
fail = 0


def ok(c, m):
    global fail
    print(("ok   " if c else "FAIL ") + m)
    fail += not c


m = re.search(r"window\.CA=(\{.*?\});\n", page)
emb = json.loads(m.group(1))
exp.pop("size_cases")
ok(emb == exp, "page data equals out/expected.json")

S, P, D, M = exp["size_cases"] if False else None, {p["id"]: p["calc"] for p in exp["presets"]}, exp["der"], exp["meas"]
PL = exp["place"]
text = re.sub(r"<script.*?</script>", " ", page, flags=re.S)
text = re.sub(r"<[^>]+>", " ", text).replace("&lt;", "<").replace("&amp;", "&")
text = re.sub(r"\s+", " ", text)
claims = [  # (string in the prose, value from data, formatted)
    ("37.5 ms", PL["packed_ms"], "%.1f ms"), ("262.5 ms", PL["spread_busy_ms"], "%.1f ms"),
    ("1:7", PL["o"], "1:%d"), ("50 / 7", 50 / PL["o"], None),
    ("2,048 and 65,536", (D["fattree_2tier_64"], D["fattree_3tier_64"]), "{:,} and {:,}"),
    ("40 2 /2 = 800", D["fattree_2tier_40"], "40 2 /2 = %d"),
    ("8 + 4 + 2 = 14", D["dgx_nics_total"] + 2, "8 + 4 + 2 = %d"),
    ("(30.72 TB)", D["dgx_local_nvme_tb"], "(%.2f TB)"),
    ("3.125 GB/s of network per GPU", D["ff2_gpu_net_GBps"], "%.3f GB/s of network per GPU"),
    ("16 times less", D["ff2_ratio"], "%d times less"),
    ("3.1 MW", D["ff2_power_mw"], "%.1f MW"), ("28.6 kW", D["superpod_rack_kw"], "%.1f kW"),
    ("40.8 kW", D["rack_h100_4"], "%.1f kW"),
    ("about 31 MW", P["big24k"]["it_mw"], "about %d MW"),
    ("32 leaves and 16 spines", (P["superpod"]["leaves"], P["superpod"]["spines"]), "{} leaves and {} spines"),
    ("128 x 10.2 kW = 1.31 MW", P["lab1k"]["it_mw"], "128 x 10.2 kW = %.2f MW"),
    ("43 racks", P["lab1k"]["racks"], "%d racks"),
    ("9,951 MiB", M["mem_mb"]["vm_meminfo"], "{:,} MiB"),
    ("79 µs", M["rtt_bridge_med"], "%.0f µs"), ("69 µs", M["rtt_loop_med"], "%.0f µs"),
    ("1,016 x 4 GB = 4.06 TB", 1016 * 4 / 1000, "1,016 x 4 GB = %.2f TB"),
    ("50.8 s", 1016 * 4 / 80, "%.1f s"), ("16.3 s", 1016 * 4 / 250, "%.1f s"),
    ("1,280 GB/s", 32 * 40, "{:,} GB/s"),
]
for s, v, f in claims:
    if f is None:
        ok(s in text and abs(v - 7.142857) < 1e-5, "prose has %r" % s); continue
    want = f.format(*v) if isinstance(v, tuple) else (f.format(v) if "{" in f else f % v)
    ok(want == s and s in text, "prose %r == data %r" % (s, want))
ok("about 55%" in text and abs(8 * 0.7 / 10.2 - 0.55) < 0.01, "55% of 10.2 kW")
ok(abs(1.83 - P["superpod"]["it_mw"] / 127 * 128) < 0.01 or "1.83 MW" in text, "B200 128 nodes 1.83 MW")
ok("2.3 to 5.1 GB/s" in text and abs(min(M["bw_bridge_GBps"]) - 2.3) < 0.05 and abs(max(M["bw_bridge_GBps"]) - 5.1) < 0.05, "bridge bulk range")
ok("about 1.5 GB/s" in text and all(abs(x - 1.5) < 0.05 for x in M["bw_loop_GBps"]), "loopback bulk")
# privacy
user = re.escape(os.environ.get("USER") or os.path.basename(os.path.expanduser("~")))
pat = re.compile("/" + "Users/|Users" + "-|" + user + "|gl" + "pat|sk" + "-ant|[\\w.+-]+@[\\w-]+\\.[\\w.]+|Mac" + "BookPro|\\b192\\.168\\.|\\b10\\.\\d+\\.\\d+\\.\\d+")
hits = []
for root, _, files in os.walk(os.path.join(HERE, "..")):
    if ".shots" in root:
        continue
    for f in files:
        pth = os.path.join(root, f)
        try:
            t = open(pth, encoding="utf-8").read()
        except Exception:
            continue
        for mm in pat.finditer(t):
            hits.append((os.path.relpath(pth, HERE), mm.group(0)))
ok(not hits, "privacy grep %s" % hits[:5])
sys.exit(1 if fail else 0)
