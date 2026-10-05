"""Checks (run from src/: python3 check/check_embed.py):
1. the built page embeds exactly out/data.json (window.MHD);
2. every number quoted in the prose equals what the data gives (formatted as on the page);
3. no private paths or tokens in the page or in src/.
"""
import json, re, os, sys, statistics as st

html = open("../index.html", encoding="utf-8").read()
D = json.load(open("out/data.json"))
m = re.search(r"window\.MHD=(\{.*?\});\n", html)
assert m, "MHD not found"
assert json.loads(m.group(1)) == D, "embedded data differs from out/data.json"
txt = re.sub(r"<[^>]+>", " ", html)
txt = re.sub(r"\s+", " ", txt)
g = lambda grp, name: next(r for r in D["m1"][grp] if r["name"] == name)
fm = lambda v, d=0: f"{v:,.{d}f}"
aos, soa, alls = g("aos", "AoS, read field x"), g("aos", "SoA, read array x"), g("aos", "AoS, read all 8 fields")
tg = lambda w, s: next(r for r in D["m1"]["tgwide"] if r["bytes_per_access"] == w and r["stride"] == s)["rate"]
loc = D["m1"]["local"]
roof = D["m1"]["roof"]
bw = st.median([r["gbps"] for r in roof if r["F"] <= 16]); pk = max(r["rate"] for r in roof)
wid = D["m1"]["widths"]
lab = D["lab"]
expect = {
    "AoS field": fm(aos["ms"], 2) + " ms", "AoS all": fm(alls["ms"], 2) + " ms", "SoA": fm(soa["ms"], 2) + " ms",
    "AoS/SoA": fm(aos["ms"] / soa["ms"], 1) + " times faster", "bytes ratio": "is " + fm((aos["moved_bytes"]) / soa["moved_bytes"], 1),
    "tg16 s1": fm(tg(16, 1)) + " GB/s", "tg16 s4": fm(tg(16, 4)), "tg16 s8": fm(tg(16, 8)), "tg16 s9": fm(tg(16, 9)) + " at 9", "tg4 s1": fm(tg(4, 1)) + " GB/s",
    "local dyn": fm(loc[0]["ms"], 2) + " ms", "local sel": fm(loc[1]["ms"], 2) + " ms", "local ratio": fm(loc[0]["ms"] / loc[1]["ms"], 2) + " times slower",
    "bw roof": fm(bw) + " GB/s", "peak": fm(pk) + " GFLOP/s", "ridge": fm(pk / bw) + " FLOP per byte", "of theory": fm(100 * pk / 5308) + "% of the 5,308",
    "ai range": "from " + fm(roof[0]["ai"], 2) + " to " + fm(roof[-1]["ai"]), "width spread": fm(min(r["rate_lo"] for r in wid)) + " to " + fm(max(r["rate_hi"] for r in wid)) + " GB/s",
    "load": f"load average {D['meta']['load'][0]} to {D['meta']['load'][1]}",
    "softmax MB": fm(lab["softmax_fused"]["bytes"] / 1e6, 1) + " MB", "matmul MB": fm(lab["mm_mlx"]["bytes"] / 1e6, 1) + " MB", "matmul GF": fm(lab["mm_mlx"]["flops"] / 1e9, 1) + " GFLOP",
}
bad = 0
for k, v in expect.items():
    if v is None:
        continue
    if v not in txt:
        bad += 1; print("NOT IN PROSE:", k, repr(v))
# derived claims checked numerically
eager = lab["softmax_eager"]; e_gbs = eager["bytes"] / eager["ms"] / 1e6
assert 0.2 < e_gbs / bw < 0.3, ("a quarter of the roof", e_gbs / bw)
mm = lab["mm_naive"]; assert 9 < (mm["flops"] / mm["bytes"]) / (pk / bw) < 12, "ten times the ridge"
exp = json.load(open("out/expected.json"))["page"]
assert exp["aos"]["nSec"] == 32 and exp["soa"]["nSec"] == 4 and exp["mis"]["nSec"] == 5 and exp["f4s8"]["passes"] == 32
# privacy
pat = re.compile("/Use" + "rs/|Use" + "rs-|gl" + "pat|sk-" + "ant|/priv" + "ate/tmp")
for root, _, files in os.walk("."):
    for f in files:
        p = os.path.join(root, f)
        if f.endswith((".py", ".mjs", ".sh", ".js", ".html", ".json", ".txt", ".md", ".cu", ".log")):
            if pat.search(open(p, encoding="utf-8", errors="ignore").read()):
                bad += 1; print("PRIVATE PATTERN IN", p)
if pat.search(html):
    bad += 1; print("PRIVATE PATTERN IN index.html")
print("embed ok, prose numbers", len([v for v in expect.values() if v]) - bad, "of", len([v for v in expect.values() if v]), "found;", "FAIL" if bad else "all checks ok")
sys.exit(1 if bad else 0)
