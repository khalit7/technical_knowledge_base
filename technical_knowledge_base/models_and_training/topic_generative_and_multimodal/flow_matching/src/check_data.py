"""Check that the page embeds exactly the recorded data, and that prose numbers match it (CPU, seconds).

1. parts/22_js_fm_0data.js parses and equals out/page_data.json (plus the sprite sheet).
2. Every data-fmf key used in the HTML exists in the facts, and every fact is used.
3. The code shown (the exact field) equals the source of runs/fm_toy.py; the scheduler output equals out/sched_demo.json.
4. Literal numbers in the prose that restate recorded values are checked against the raw outputs (a list below).
5. Production configs shown come from inputs/scheduler_configs.json; SD3 tables from inputs/sd3_tables.json.
Run: python3 check_data.py  (standard library only). Prints OK or the failures.
"""
import glob, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "parts")
bad = []
js = open(os.path.join(P, "22_js_fm_0data.js")).read()
D = json.loads(js[js.index("window.FMD=") + len("window.FMD="):].rstrip().rstrip(";"))
PD = json.load(open(os.path.join(HERE, "out", "page_data.json")))
for k, v in PD.items():
    if D.get(k) != v:
        bad.append(f"page_data mismatch: {k}")
html = "".join(open(f).read() for f in sorted(glob.glob(os.path.join(P, "*.html"))))
used = set(re.findall(r'data-fmf="([\w.]+)"', html))
for k in sorted(used - set(D["f"])):
    bad.append(f"fact used but missing: {k}")
print("facts used", len(used), "of", len(D["f"]), "; unused:", sorted(set(D["f"]) - used)[:60])
src = open(os.path.join(HERE, "runs", "fm_toy.py")).read()
if D["code"]["exact"].strip() != src[src.index("def coef("):src.index("def grid(")].strip():
    bad.append("code shown differs from fm_toy.py")
sd = json.load(open(os.path.join(HERE, "out", "sched_demo.json")))
if D["sched_demo"].strip() not in sd["printed"]:
    bad.append("scheduler output differs from sched_demo.json")
# raw outputs
toy = json.load(open(os.path.join(HERE, "out", "toy.json")))
memo = json.load(open(os.path.join(HERE, "out", "memo.json")))
oti = json.load(open(os.path.join(HERE, "out", "ot_images.json")))
for nm, ok in [
    ("DDIM == Euler below 1e-12", toy["exact"]["ddim_equiv"]["max_abs_diff"] < 1e-12),
    ("one exact Euler step lands on the centre", toy["exact"]["one_step_mean_norm"] < 1e-6),
    ("VP schedules share straightness", toy["exact"]["paths"]["cos"]["straightness"] == toy["exact"]["paths"]["vp"]["straightness"]),
    ("memo: 100% copies at 50 steps", memo["steps"]["50"]["exact_copies_frac"] == 1.0),
    ("ot: images cost reduction below 10%", 1 - oti["minibatch"][-1]["cost_per_pixel"] / oti["minibatch"][0]["cost_per_pixel"] < 0.10),
    ("sched demo: 1024 px mu 1.15", abs(sd["1024"]["mu"] - 1.15) < 1e-6),
    ("sched demo: error text", "`mu` must be passed" in sd["error"]),
]:
    if not ok:
        bad.append("raw check failed: " + nm)
# literal numbers in prose
lit = {"0.8635": str(sd["1024"]["sigmas"][1]), "0.8639": str(sd["1024"]["fixed_sigmas"][1]),
       "35.7": D["f"]["isded_2_250"], "53.0": D["f"]["isde_0_250"], "0.999": f'{D["img"]["rf2_straight"]:.3f}'}
for k, v in lit.items():
    if k != v:
        bad.append(f"literal {k} != recorded {v}")
text = re.sub(r"<[^>]+>", " ", html)
for k in lit:
    if k not in text:
        bad.append(f"literal {k} not in prose")
# configs shown
sc = json.load(open(os.path.join(HERE, "inputs", "scheduler_configs.json")))["configs"]
for r, v in D["sched"].items():
    for k in ["shift", "base_shift", "max_shift", "flow_shift", "shift_terminal"]:
        if v.get(k) != sc[r]["config"].get(k):
            bad.append(f"config {r} {k}")
s3 = json.load(open(os.path.join(HERE, "inputs", "sd3_tables.json")))
if D["sd3"] != s3:
    bad.append("sd3 tables differ")
for n in ["1.54", "5.67", "2.88", "45.78", "49.70", "80.41", "0.256"]:
    if n not in text:
        bad.append(f"SD3 number {n} not in prose")
# 2026-10-24: absorbed root Flow lab data (window.FMY) and the static fill
import math
yjs = open(os.path.join(P, "22_js_fm_0more.js")).read()
Yd = json.loads(yjs[yjs.index("window.FMY=") + len("window.FMY="):].rstrip().rstrip(";"))
YP = json.load(open(os.path.join(HERE, "out", "page_data_more.json")))
for k, v in YP.items():
    if Yd.get(k) != v:
        bad.append(f"page_data_more mismatch: {k}")
rs = open(os.path.join(HERE, "..", "..", "src", "parts", "33_js_fw_0data.js")).read()
W = json.loads(rs[rs.index("{"):rs.rindex("}") + 1])
for k in ["err", "he", "cfg"]:
    if Yd[k] != W[k]:
        bad.append(f"FMY {k} differs from the root's recording")
for k, v in Yd["f"].items():
    if k in W["f"] and W["f"][k] != v:
        bad.append(f"FMY fact {k} differs from the root")
usedy = set(re.findall(r'data-fmy="([\w.]+)"', html))
for k in sorted(usedy - set(Yd["f"])):
    bad.append(f"fmy fact used but missing: {k}")
built = open(os.path.join(HERE, "..", "index.html")).read()
if re.search(r'data-fm[fy]="[\w.]+"></', built):
    bad.append("unfilled static fact in index.html")
# section 10 literals against the recorded rows
I = D["img"]
def fd(rows, key, n):
    return f'{next(r for r in rows if r[0] == key and r[1] == n)[3]:.1f}'
lit10 = {fd(I["fm"], "euler", 4): "158.3", fd(I["diff"], "ddim", 4): "478.9", fd(I["diff"], "ddpm", 4): "300.3",
         fd(I["fm"], "euler", 10): "64.4", fd(I["diff"], "ddim", 10): "181.3", fd(I["diff"], "ddpm", 10): "130.5", fd(I["diff"], "dpm", 10): "115.1",
         fd(I["fm"], "euler", 20): "49.8", fd(I["diff"], "ddim", 20): "130.9", fd(I["diff"], "ddpm", 20): "77.9", fd(I["diff"], "dpm", 20): "101.2",
         fd(I["diff"], "ddpm", 1000): "34.9", fd(I["diff"], "ddpm", 250): "39.7", fd(I["fm"], "euler", 250): "53.0", fd(I["fm"], "midpoint", 25): "53.1",
         f'{min(r["fd"] for r in Yd["he"]):.1f}': "43.5"}
for got, want in lit10.items():
    if got != want or want not in text:
        bad.append(f"section 10 literal {want} (recorded {got})")
# section 6 clock: lambda = a / (a + b) at t = 0.25, 0.5, 0.75 (same formulas as fm_toy.py coef)
def coef(kind, t):
    if kind == "cos":
        return math.sin(math.pi / 2 * t), math.cos(math.pi / 2 * t)
    s_ = 1 - t; ab = math.exp(-(0.1 * s_ + 19.9 * s_ * s_ / 2)); return math.sqrt(ab), math.sqrt(1 - ab)
for kind, want in [("cos", "0.29, 0.5, 0.71"), ("vp", "0.01, 0.06, 0.23, 0.51")]:
    ts = [0.25, 0.5, 0.75] if kind == "cos" else [0, 0.25, 0.5, 0.75]
    got = ", ".join(f"{a / (a + b):.2f}".rstrip("0") if kind == "cos" else f"{a / (a + b):.2f}" for a, b in (coef(kind, t) for t in ts))
    if got != want or want not in text:
        bad.append(f"clock {kind}: {got} vs {want}")
print("OK" if not bad else "FAIL\n" + "\n".join(bad))
