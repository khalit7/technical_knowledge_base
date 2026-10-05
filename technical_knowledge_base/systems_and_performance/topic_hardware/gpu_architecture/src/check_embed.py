"""Checks after sh build.sh: (1) the page embeds exactly out/expected.json as window.GA (so every chart and
JS-filled number is the recorded output); (2) numbers written by hand in the prose agree with the data.
Usage: python3 check_embed.py   (exit 1 on any failure)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
exp = json.load(open(os.path.join(HERE, "out", "expected.json")))
m = re.search(r"window\.GA=(\{.*?\});\n", html, re.S)
bad = 0
if not m or json.loads(m.group(1)) != exp:
    print("FAIL: embedded window.GA differs from out/expected.json"); bad += 1
else:
    print("ok: embedded data equals out/expected.json")

L, T, H = exp["little"], exp["tile"], exp["hide"]
lv = exp["m1"]["levels_ns"]
def r(x, d=0):
    return f"{x:,.{d}f}"

# (literal as written in the HTML source, value it must equal, how it is derived)
claims = [
    ("16 &times; 9 / 474 &asymp; 30%", round(100 * H[1]["bound"]), 30, "hide bound W(n+C)/(n+C+L-1)"),
    ("270,336 threads &times; 4 bytes = 1.08 MB", round(132 * 2048 * 4 / 1e6, 2), 1.08, "H100 threads x 4 B"),
    ("against the 0.91 MB needed", L["h100_inflight_mb"], 0.91, "Little's law H100"),
    ("8,192 cycles of perfect issue", T["fmas"] // 128, 8192, "1,048,576 / 128 lanes"),
    ("1,024 per SM", T["a100_fma_clk_sm"], 1024, "A100 blog"),
    ("2,048 FP16 FMAs per SM per clock", T["h100_fma_clk_sm"], 2048, "Hopper blog 2x"),
    ("128 per thread for a 128-thread block", T["acc_regs_per_thread_128"], 128, "64 KB / 4 B / 128"),
    ("2 paths take", exp["m1"]["div"][1][0], 2, "divergence K"),
    ("1.95 times, 32 paths 38.6 times on the M1", exp["div_ratio2"], 1.95, "divergence ratio 2"),
    ("32 paths 38.6 times on the M1", exp["div_ratio32"], 38.6, "divergence ratio 32"),
    ("about 1%", round(100 * L["one_warp"] / L["stream_peak"]), 1, "one warp / peak"),
    ("here about 512 threads per core", 8192 // 16, 512, "saturation threads / 16 cores"),
    ("148 GB/s here", round(L["stream_peak"]), 148, "stream peak"),
    ("4.7 times the BF16 rate", round(989.5 / 209.5, 1), 4.7, "H100 / 5090 BF16"),
    ("bandwidth 0.53 times", round(1.792 / 3.35, 2), 0.53, "5090 / H100 bandwidth"),
    ("0.21 times an H100", round(209.5 / 989.5, 2), 0.21, "5090 / H100 BF16"),
    ("about 2 billion parameters at 16 bytes", 32e9 / 16 / 1e9, 2, "32 GB / 16 B"),
    ("64 against 900 is 14 times", round(900 / 64), 14, "NVLink total / PCIe"),
    ("64 against 450 per direction is 7 times", round(450 / 64), 7, "NVLink per direction / PCIe"),
    ("BF16 rises 1.78 times over the B200 but FP8 3.9 times", exp["gens"]["rubin_over_b200"], 1.78, "Rubin / B200 BF16"),
    ("FP8 3.9 times", round(17500 / 4500, 1), 3.9, "Rubin / B200 FP8"),
    ("FP8 is 4.4 times BF16", round(17500 / 4000, 1), 4.4, "Rubin FP8 / BF16"),
    ("NVFP4 at 8.75 times", 35000 / 4000, 8.75, "Rubin FP4 / BF16"),
    ("FP4 at 6 times BF16", 13500 / 2250, 6, "B300"),
    ("182 FLOPs per byte against the H100's 295", round(4000 / 22), 182, "Rubin ridge"),
    ("At FP8 it rose to 795", int(17500 / 22), 795, "Rubin FP8 ridge"),
    ("(15 against 10 PF)", 15 / 10, 1.5, "B300 / B200 FP4 per NVIDIA blog"),
    ("2.8 times Blackwell", round(22 / 8, 1), 2.8, "Rubin / B200 bandwidth (2.75)"),
    ("two thirds of the size of the 50 MB L2", round(exp["gens"]["h100_rf_total_mb"] / 50, 2), 0.66, "33 MiB / 50"),
    ("62.9%", exp["gens"]["luo_mma_frac"], 62.9, "Luo"),
]
txt = html
for lit, val, want, how in claims:
    if lit not in txt:
        print("FAIL: literal not found:", lit); bad += 1; continue
    if abs(val - want) > 0.011 * max(1, abs(want)):
        print(f"FAIL: {lit!r}: data gives {val}, prose says {want} ({how})"); bad += 1
    else:
        print(f"ok: {lit[:60]!r} = {val} ({how})")
for priv in ("Users/", "Users-", "glpat", "sk-ant"):
    if priv in html:
        print("FAIL: private pattern in page:", priv); bad += 1
print("FAIL" if bad else "ALL OK", bad)
sys.exit(1 if bad else 0)
