"""The page embeds exactly out/data.json; numbers written as plain text in the prose equal the data;
nothing private reaches the page or src/. (Numbers in <span data-v> are checked in the browser by
check/check_page.mjs, which fails when a literal differs from the value computed from the data.)
Usage: python3 check/check_embed.py   (from src/)
"""
import json, os, re, statistics, sys

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = open(os.path.join(SRC, "..", "index.html"), encoding="utf-8").read()
fail = 0


def ok(cond, msg):
    global fail
    if not cond:
        fail += 1
        print("FAIL", msg)


data = json.load(open(os.path.join(SRC, "out", "data.json")))
js = open(os.path.join(SRC, "parts", "22_js_data.js"), encoding="utf-8").read()
emb = json.loads(js[js.index("window.PCD=") + len("window.PCD="):].rstrip().rstrip(";"))
ok(emb == data, "parts/22_js_data.js differs from out/data.json")
ok("window.PCD=" + js[js.index("window.PCD=") + len("window.PCD="):].strip() in PAGE, "index.html does not embed parts/22_js_data.js")

T, N, NU = data["timing"], data["ncu"], data["numerics"]
rep = {r["stem"]: r for r in N["reports"]}
med = statistics.median
# plain-text claims in the prose: (text that must appear, value recomputed here, how it is formatted)
nos, ev = T["async"]["host_nosync_ms"]["median"], T["async"]["event_ms"]["median"]
c16 = next(r for r in T["cache"] if r["mb"] == 16)
d = lambda s: float(rep[s]["raw"]["gpu__time_duration.sum"][0]) * (1000 if rep[s]["raw"]["gpu__time_duration.sum"][1] == "ms" else 1)
sm = [p["softmax_4096x1024"] for p in T["warmup"]]
acc = next(r for r in NU["accumulate"]["inputs"]["float16"] if r["K"] == 65536)
claims = [
    ("the clock read 0.18 ms against 4.15 ms", "%.2f/%.2f" % (nos, ev), "0.18/4.15"),
    ("1.7&times; too fast at 16 MB here", "%.1f" % (c16["cold_ms"]["median"] / c16["hot_ms"]["median"]), "1.7"),
    ("64.67% estimated, 0.14% measured", "%.2f" % ((1 - d("addConstDouble") / d("addConstDouble3")) * 100), "0.14"),
        ("a first softmax about 13 times slower", "%.0f" % (med([a[0] for a in sm]) / med([a[14] for a in sm])), "13"),
    ("14.6% of the scale at K = 65,536 here", "%.1f" % (acc["bf16_sequential"]["median"] * 100), "14.6"),
    ("disagreed by a factor of 2", "%.0f" % (max(x["summary"]["median"] for x in T["dist"]) / min(x["summary"]["median"] for x in T["dist"])), "2"),
    ("spent 83.8 of 158.5 cycles per instruction in MIO throttle", "83.8 of 158.5" if "83.8 cycles" in json.dumps(rep["transposeCoalesced"]) and "158.5 cycles" in json.dumps(rep["transposeCoalesced"]) else "?", "83.8 of 158.5"),
    ("1,792 GB/s on an RTX 5090", "1,792", "1,792"),  # FACTS.md, RTX Blackwell whitepaper Appendix A
    ("an estimated <span data-v=\"set_full\">9,059</span>", "{:,}".format(next(s["metrics"] for s in N["sets"] if s["id"] == "full")), "9,059"),
]
AT = data["atomics"]["kernels"]
claims += [
    ("30 different answers in 30 runs, spread over 552 ulps", "%d/%d" % (AT["atomic_all"]["distinct"], AT["atomic_all"]["spread_ulps"]), "30/552"),
    ("gave 17, spread over 30 ulps", "%d/%d/%d" % (AT["atomic_tg"]["distinct"], AT["atomic_tg"]["spread_ulps"], AT["tree_fixed"]["distinct"]), "17/30/1"),
    ("12,118 non-zero values flush to zero against 6,091 with no scale at all and 11 with one scale per row",
     "{:,}/{:,}/{:,}".format(NU["fp8"]["per_tensor"]["zero_from_nonzero"], NU["fp8"]["no_scale"]["zero_from_nonzero"], NU["fp8"]["per_row"]["zero_from_nonzero"]), "12,118/6,091/11"),
]
def ws(stem, label):
    s = next(x for x in rep[stem]["sections"] if x["name"] == label[0])
    return float(next(r for t in s["tables"] for r in t["rows"] if r[0] == label[1])[2])
claims.append(("occupancy fell from 95.5% to 83.8% while cycles per issued instruction fell from 280 to 11.9",
    "%.1f/%.1f/%.0f/%.1f" % (ws("sobelDouble", ("Occupancy", "Achieved Occupancy")), ws("sobelFloat", ("Occupancy", "Achieved Occupancy")),
                             ws("sobelDouble", ("Warp State Statistics", "Warp Cycles Per Issued Instruction")), ws("sobelFloat", ("Warp State Statistics", "Warp Cycles Per Issued Instruction"))),
    "95.5/83.8/280/11.9"))
# the static formats table (20_read_e.html) against torch.finfo and assert_close's defaults in the data
tab = PAGE[PAGE.index('id="rd-fmt-tab"'):]
tab = tab[:tab.index("</table>")]
def cells(name):
    row = tab[tab.index("<td>" + name):]
    row = row[:row.index("</tr>")]
    return re.findall(r'<td class="num">(.*?)</td>', row)
def e(v): return ("%.2e" % v).replace("e-0", "e-").replace("e+", "e")
D, TOL = NU["dtypes"], NU["assert_close_defaults"]
for name, key, want in (("float32", "float32", ["32", e(D["float32"]["eps"]), e(D["float32"]["max"]), e(D["float32"]["smallest_normal"]), "1.3e-6", "1e-5"]),
                        ("bfloat16", "bfloat16", ["16", e(D["bfloat16"]["eps"]), e(D["bfloat16"]["max"]), e(D["bfloat16"]["smallest_normal"]), "0.016", "1e-5"]),
                        ("float16", "float16", ["16", e(D["float16"]["eps"]), "{:,}".format(int(D["float16"]["max"])), e(D["float16"]["smallest_normal"]), "1e-3", "1e-5"]),
                        ("float8 e4m3fn", "float8_e4m3fn", ["8", "%g" % D["float8_e4m3fn"]["eps"], "%g" % D["float8_e4m3fn"]["max"], "%.4f" % D["float8_e4m3fn"]["smallest_normal"], "none", "none"]),
                        ("float8 e5m2", "float8_e5m2", ["8", "%g" % D["float8_e5m2"]["eps"], "{:,}".format(int(D["float8_e5m2"]["max"])), e(D["float8_e5m2"]["smallest_normal"]), "none", "none"]),
                        ("TF32", "tf32", ["19", e(D["tf32"]["eps"]), "as float32", "as float32", "none", "none"])):
    ok(cells(name) == want, "formats table row %s: page %s, data %s" % (name, cells(name), want))
for name, key in (("float32", "float32"), ("bfloat16", "bfloat16"), ("float16", "float16"), ("float64", "float64")):
    c = cells(name)[-2:]
    ok([float(x) for x in c] == TOL[key], "tolerance cells %s: %s against %s" % (name, c, TOL[key]))
for text, got, want in claims:
    ok(text in PAGE, "prose text not found: " + text)
    ok(got == want, "claim %r: data gives %s" % (text, got))
# defaults of assert_close quoted in the Numerics lab
for k, v in (("float32 1.3e-6 and 1e-5", NU["assert_close_defaults"]["float32"]), ("bfloat16 0.016 and 1e-5", NU["assert_close_defaults"]["bfloat16"]), ("float16 0.001 and 1e-5", NU["assert_close_defaults"]["float16"])):
    ok(k in PAGE and float(k.split()[1]) == v[0] and float(k.split()[3]) == v[1], "tolerance text " + k)
# privacy
U = "Us" + "ers"
pat = re.compile(U + "/|" + U + "-|gl" + "pat|sk" + "-ant|/private" + "/tmp")
ok(not pat.search(PAGE), "private pattern in index.html")
for root, dirs, files in os.walk(SRC):
    for fn in files:
        p = os.path.join(root, fn)
        try:
            txt = open(p, encoding="utf-8").read()
        except (UnicodeDecodeError, OSError):
            continue
        if fn == "check_embed.py":
            continue
        ok(not pat.search(txt), "private pattern in " + os.path.relpath(p, SRC))
print("check_embed:", "ok" if not fail else "%d failures" % fail, "(%d prose claims)" % len(claims))
sys.exit(1 if fail else 0)
