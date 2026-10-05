"""Confirm the built page embeds exactly out/data.json and that the numbers written in the tab's static
prose agree with the data and the Python reference. Usage: python3 code/check_embed.py"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import reference as R

page = open(os.path.join(ROOT, "..", "..", "index.html"), encoding="utf-8").read()
data = json.load(open(os.path.join(ROOT, "out", "data.json")))
m = re.search(r"window\.SIMD=(\{.*?\});\n", page)
assert m, "SIMD not found in page"
emb = json.loads(m.group(1))
assert emb == data, "embedded data differs from out/data.json"
print("embedded data == out/data.json")

tab = page[page.index('id="t-sim"'):page.index('id="t-compile"')]
text = re.sub(r"<[^>]+>", " ", tab)
ok = 0


def need(cond, what):
    global ok
    if not cond:
        print("FAIL", what)
        sys.exit(1)
    ok += 1


L = {k: v for k, v in data["pub"]["luo_latency_cycles"].items() if k != "url"}
for s in ["466 cycles on an A100", "479 on an H800", "542 on an RTX 4090", "29 to 30 cycles", "262 to 273 for the L2"]:
    need(s in text, s)
need(round(L["A100"]["global"]) == 466 and round(L["H800"]["global"]) == 479 and round(L["RTX4090"]["global"]) == 542, "Luo globals")
need(min(v["shared"] for v in L.values()) == 29.0 and round(max(v["shared"] for v in L.values())) == 30, "Luo shared")
need(round(min(v["L2"] for v in L.values())) == 262 and round(max(v["L2"] for v in L.values())) == 273, "Luo L2")
n_occ = sum(1 for _ in open(os.path.join(ROOT, "occ", "occ_nvidia.csv")))
need(n_occ == 5292 and "5,292 combinations" in page, "occupancy case count")
acc = next(p for p in data["ptxas"] if p["fn"] == "acc128")
need(acc["by_arch"]["sm_90a"]["regs"] == 168 and ">168<" in tab, "acc128 registers")
o1, o2 = R.occupancy("sm_90a", 168, 0, 128, 0), R.occupancy("sm_90a", 128, 0, 128, 0)
need(abs(o1["occ"] - 0.1875) < 1e-12 and o1["warps"] == 12 and o2["occ"] == 0.25 and o2["warps"] == 16, "occupancy interview numbers")
need("12 / 64 = 18.75%" in text and "16 warps, 25%" in text, "occupancy interview text")
need(R.coalesce(R.lane_addresses("stride", 4, 8))["bytes_moved"] == 1024 and "1,024 bytes moved for 128 used, 12.5%" in text, "coalescing worst case")
h = data["pub"]["chips"]["H100 SXM"]
need(round(h["fp32"] / h["bw"]) == 20 and round(h["bf16"] / h["bw"]) == 295 and "67 / 3.35 = 20" in text and "989.5 / 3.35 = 295" in text, "H100 ridges")
need(-(-(9 + 479) // 9) == 55 and "about 55 warps" in text, "warps needed")
u = R.latency_sim(16, 8, 479, 1, cycles=20000)
need(abs(u["model"] - 16 * 9 / 488) < 1e-12 and round(100 * u["model"]) == 30 and "16 x 9 / 488 = 30% busy" in text, "latency predict")
need(abs(R.latency_sim(16, 8, 479, 4, cycles=20000)["model"] - 1) < 1e-12, "k = 4 suffices")
need(R.tiling(4096, 1, 1, 4)["ai"] == 0.25 and "0.25 FLOP per byte" in text, "naive intensity")
need(R.tile_anim() == {"naive": 1024, "staged": 256, "steps": 8}, "tile animation totals")
tr = {c["name"]: c for c in data["m"]["transpose"]}
a, b = tr["tiled, tile[32][32]"], tr["tiled, padded tile[32][33]"]
need(max(a["ms_min"], b["ms_min"]) <= min(a["ms_max"], b["ms_max"]), "padded and unpadded transposes overlap in range ('within noise')")
bk = {c["stride"]: c for c in data["m"]["banks"]}
need(all(bk[33]["ms"] < c["ms"] for s, c in bk.items() if s != 33), "stride 33 fastest (median)")
need(all(abs(bk[s]["ms_min"] / bk[33]["ms_min"] - 1) < 0.1 for s in (1, 2)), "best runs of strides 1 and 2 match stride 33")
need(all(bk[s]["ms_max"] < bk[32]["ms_min"] for s in (1, 2, 4, 8)), "strides 1-8 never as slow as 32")
lt = sorted(data["m"]["latency"], key=lambda c: c["threads"])
lat = [c["threads"] * 16 / c["gbps"] for c in lt if c["threads"] <= 1024]
need(max(lat) / min(lat) < 1.1, "derived latencies agree within 10%")
for t in (512, 1024):
    r = next(c for c in lt if c["threads"] == t)["gbps"] / next(c for c in lt if c["threads"] == t // 2)["gbps"]
    need(1.8 < r < 2.2, f"bandwidth doubles at {t}")
dv = {c["mode"]: c for c in data["m"]["diverge"]}
need(abs(dv[0]["ms"] - dv[1]["ms"]) / dv[1]["ms"] < 0.1, "per-group branch costs nothing measurable")
need(1.6 < dv[2]["ms"] / dv[1]["ms"] < 2.0, "divergent a little under 2x")
tl = {c["tile"]: c for c in data["m"]["tiling"]}
need(1.8 < tl[8]["gflops"] / tl[1]["gflops"] < 2.2 and tl[32]["gflops"] < tl[16]["gflops"] < tl[8]["gflops"] * 1.05, "tiling prose")
rc = data["pub"].get("roof_cross", {})
if rc:
    need(abs(rc["matmul naive, custom (fp32, 2048)"] / tl[1]["gflops"] - 1) < 0.05 and abs(rc["matmul tiled 16x16, custom (fp32, 2048)"] / tl[16]["gflops"] - 1) < 0.05, "roofline cross-check within a few percent")
co = {(c["stride"], c["offset"]): c for c in data["m"]["coalesce"]}
need(abs(co[(4, 0)]["gbps"] / co[(1, 0)]["gbps"] - 1) < 0.1 and abs(co[(1, 1)]["gbps"] / co[(1, 0)]["gbps"] - 1) < 0.1, "no loss to stride 4; offset free")
for s in (16, 32, 64):
    r = co[(s // 2, 0)]["gbps"] / co[(s, 0)]["gbps"]
    need(1.6 < r < 2.4, f"halving at stride {s}")
print(f"check_embed: {ok} checks passed")
