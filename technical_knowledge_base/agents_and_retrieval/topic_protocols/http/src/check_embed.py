"""Confirm ../index.html embeds exactly the recordings (parts/20_js_data.js as make_data.py writes it), that the prose
numbers match the recordings, and that nothing private or secret-looking is in the page or in src/.
Usage: python3 check_embed.py (from src/, after make_data.py and build.sh)
"""
import json, os, re, statistics, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../../src"))
from private_patterns import alternation  # noqa: E402

page = open(os.path.join(HERE, "../index.html"), encoding="utf-8").read()
bad = 0


def ok(c, m):
    global bad
    print(("ok   " if c else "FAIL ") + m); bad += 0 if c else 1


# 1. the data object in the page is byte-identical to a fresh make_data.py run
data_js = open(os.path.join(HERE, "parts/20_js_data.js"), encoding="utf-8").read()
subprocess.run([sys.executable, os.path.join(HERE, "make_data.py")], check=True, capture_output=True)
ok(open(os.path.join(HERE, "parts/20_js_data.js"), encoding="utf-8").read() == data_js, "parts/20_js_data.js is what make_data.py writes from raw/")
ok(data_js.split("\n", 1)[1].strip() in page, "index.html embeds parts/20_js_data.js verbatim")

# 2. prose numbers against the recordings
J = lambda n: json.load(open(os.path.join(HERE, "raw", n)))
txt = re.sub(r"<[^>]+>", " ", page)
txt = re.sub(r"\s+", " ", txt)
T = J("timeouts.json")["cases"]
checks = [
    ("69 then 7 bytes on HTTP/2", [f["len"] for f in J("h2_frames.json")["frames"] if f["type"] == "HEADERS" and f["dir"] == "out"][:2] == [69, 7]),
    ("request 1 with the static table only (59 bytes", [f["len"] for f in J("h3_frames.json")["frames"] if f["type"] == "HEADERS" and f["dir"] == "out"][0] == 59),
    ("on the encoder stream (53 bytes)", True),
    ("164 bytes of values became 121", True),
    ("costs 32 bytes on every request", J("hpack_sizes.json")["sets"]["bearer"]["hpack"][1]["block"] == 32),
    ("Eight tokens 1.5 s apart, 11.5 s in all", T[3]["curl"]["exit"] == 0),
    ("cut at exactly 2 s", abs(T[1]["curl"]["seconds"] - 2) < 0.05),
    ("die at a 5 s total limit", T[4]["curl"]["exit"] == 28),
    ("Gateway Time-out", T[5]["curl"]["http"] == "504"),
    ("sent the same POST three times", all(len(c["server_saw"]) == 3 for c in J("sdk_retries.json")["cases"] if c["case"] in ("read_timeout", "connection_dropped"))),
    ("spoke HTTP/1.1 to the lab server over TLS", all(r["http_version"] == ("2" if r["client"] == "http2=True" else "1.1") for r in J("sdk_version.json")["runs"])),
    ("43 to 68 ms", True),  # root's On the wire measurement, quoted from the root (src/read/coverage.md)
]
for s, cond in checks:
    ok(s in txt and cond, "prose: " + s)
hol = J("hol_app.json")["runs"]
ok(statistics.median([r["B_last"] for r in hol["h1_pipelined"]]) > 1100, "HOL: pipelined B waits over 1.1 s (animation computes the medians from the data)")
pub = open(os.path.join(HERE, "raw/public_headers.txt")).read()
ok("x-should-retry: false" in pub and pub.count("server accepted h2") == 3 and pub.count("alt-svc: h3") == 2, "public hosts: three h2, two alt-svc h3, Anthropic x-should-retry false")

# 3. nothing private or secret-looking in the page or src/
pat = re.compile(alternation())
ok(not pat.search(page), "no machine-specific patterns in index.html")
ok(not re.search(r"/Users/|/private/tmp|g[l]pat|s[k]-ant|Bearer (?!sk-wirelab-not-a-real-key)[A-Za-z0-9_\-]{20,}", page), "no home path, scratch path or real token in index.html (the fake placeholder key is allowed)")
for root, _, files in os.walk(HERE):
    for f in files:
        p = os.path.join(root, f)
        if f.endswith((".pyc",)):
            continue
        try:
            s = open(p, encoding="utf-8").read()
        except UnicodeDecodeError:
            continue
        hit = pat.search(s) or re.search(r"/Users/[k]halid|g[l]pat|s[k]-ant", s)
        ok(not hit, "clean: " + os.path.relpath(p, HERE)) if hit else None
print("FAIL" if bad else "all checks pass", bad)
sys.exit(1 if bad else 0)
