"""Checks after sh build.sh: (1) the page embeds exactly out/expected.json (minus the test cases) as window.IC, so every
chart and JS-filled number is the recorded output; (2) numbers written by hand in the prose agree with the data;
(3) no private patterns. Usage: python3 check_embed.py   (exit 1 on any failure)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
exp = json.load(open(os.path.join(HERE, "out", "expected.json")))
page = {k: v for k, v in exp.items() if k not in ("simcases", "fabcases")}
m = re.search(r"window\.IC=(\{.*?\});\n", html, re.S)
bad = 0
if not m or json.loads(m.group(1)) != page:
    print("FAIL: embedded window.IC differs from out/expected.json"); bad += 1
else:
    print("ok: embedded data equals out/expected.json")

E, P, F, N = exp["ex"], exp["par"], exp["fab"], exp["nhalf"]
pub = {p["id"]: p for p in exp["pub"]}
nvl = 3.33 + 65536 / 450e9 * 1e6
ib = 2.8 + 65536 / 50e9 * 1e6
# (literal as written in the HTML source, value from the data, value the prose states, how it is derived)
claims = [
    ("<b id=\"ic-g8\">16.06 GB</b>", E["grad8"] / 1e9, 16.06, "8B bf16 gradients"),
    ("NVLink's n<sub>&frac12;</sub> is about 1.5 MB", N["nvl4"] / 1e6, 1.5, "alpha x beta"),
    ("NVLink: 3.33 &micro;s + 65,536 / 450 GB/s = 3.48 &micro;s", nvl, 3.48, "alpha-beta"),
    ("65,536 / 50 GB/s = 4.11 &micro;s", ib, 4.11, "alpha-beta"),
    ("Ratio 1.18", ib / nvl, 1.18, "ratio"),
    ("takes about 255 ms", E["ar2_pcie"] * 1e3, 255, "ring n=2 over PCIe 5.0"),
    ("send the same 28.1 GB per GPU", 1.75 * E["grad8"] / 1e9, 28.1, "2(n-1)/n S"),
    ("recursive doubling sends 48.2 GB", 3 * E["grad8"] / 1e9, 48.2, "log2 n S"),
    ("about 57% of the ring's time", 100 * E["ar8_nvls"] / E["ar8_nvl"], 57, "S vs 1.75 S"),
    ("giving 0.56 s and 62 ms", E["ar8_ib"], 0.56, "ring 8 over IB"),
    ("0.56 s and 62 ms (", E["ar8_nvl"] * 1e3, 62, "ring 8 over NVLink"),
    ("<b id=\"ic-epB\">86,016 bytes</b>", P["ep"]["bytes"], 86016, "4 x (h + 2h)"),
    ("<b id=\"ic-epT\">1.72 &micro;s</b>", P["ep"]["t_us"], 1.72, "bytes / 50 GB/s"),
    ("= <b>0.79 GFLOP</b>", P["ep"]["flops"] / 1e9, 0.79, "9 x 3 x h x 2048 x 2"),
    ("<b id=\"ic-epF\">461 TFLOP/s</b>", P["ep"]["need_tflops"], 461, "flops / time"),
    ("(F = 396 TFLOP/s)", P["F"] / 1e12, 396, "989.5 x 0.4"),
    ("breaks even at about 5,300 tokens", P["ib"]["dp_tokens"], 5300, "2I/3 over 400G"),
    ("about 131,000 tokens each", 16 * 2 ** 20 / 128, 131000, "16M / 128 replicas"),
    ("communication is 141% of the compute", 100 * P["tp70"]["ib"], 141, "parent calculator"),
    ("wait about 59% of the time", 100 * P["tp70"]["wait_ib"], 59, "r / (1 + r)"),
    ("105/127 = 83%", 100 * F["cross_frac"], 83, "cross-rail cross-server share"),
    ("Rings reach 76 to 81%", 100 * pub["b200_ring"]["frac"], 76, "B200 ring"),
    ("76 to 81% of NVLink", 100 * pub["h200_ring"]["frac"], 81, "H200 ring"),
    ("73 to 101% of the model", 100 * pub["b200x4"]["frac"], 73, "4 x 8 B200"),
    ("to 101% of the model", 100 * pub["p5x2"]["frac"], 101, "2 x p5"),
    ("1.29 times the ring on H200", pub["h200_nvls"]["meas"] / pub["h200_ring"]["meas"], 1.29, "NVLS / ring"),
    ("1.23 times on B200", pub["b200_nvls"]["meas"] / pub["b200_ring"]["meas"], 1.23, "NVLS / ring"),
    ("n<sub>&frac12;</sub> of about 315 KB", N["pcie5"] / 1e3, 315, "PCIe alpha x beta (assumed alpha)"),
]
for lit, val, want, how in claims:
    if lit not in html:
        print("FAIL: literal not found:", lit); bad += 1; continue
    if abs(val - want) > 0.011 * max(1, abs(want)) + (0.5 if want >= 50 else 0):
        print(f"FAIL: {lit!r}: data gives {val}, prose says {want} ({how})"); bad += 1
    else:
        print(f"ok: {lit[:60]!r} = {val:.4g} ({how})")
for priv in ("Users/", "Users-", "glpat", "sk-ant"):
    if priv in html:
        print("FAIL: private pattern in page:", priv); bad += 1
print("FAIL" if bad else "ALL OK", bad)
sys.exit(1 if bad else 0)
