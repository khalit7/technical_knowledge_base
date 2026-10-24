"""The page embeds exactly the recorded data, and the numbers in the prose match it.

1. window.DZ in ../../index.html equals out/page_data.json, and its numbers equal the raw recordings: this page's
   out/samplers.json, extra.json, guide.json, sd.json, gmm_toy.json, recompute.json, and the root Diffusion lab's
   src/diff/out/samples_eps.json (reused, never recomputed).
2. window.DZX equals out/page_data_more.json, whose parts equal the root lab's src/diff/out/page_data.json (2026-10-24).
3. Every data-dz / data-lab span in the built HTML holds exactly the recorded value (runs/fill_static.py).
4. Numbers typed into the HTML (not filled from the data) are listed below as claims and recomputed.
Usage: python3 check_data.py   (plain Python 3)
"""
import json, os, re, html as H

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "out")
LAB = os.path.join(HERE, "..", "..", "..", "src", "diff", "out")
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.DZ=(\{.*?\});\n", page, re.S); DZ = json.loads(m.group(1))
O = lambda n, d=OUT: json.load(open(os.path.join(d, n)))
bad, n = [], 0


def ok(cond, what):
    global n; n += 1
    if not cond:
        bad.append(what)


ok(DZ == O("page_data.json"), "page embeds out/page_data.json")
lab = O("samples_eps.json", LAB)
for r in lab["samplers"]:
    k = {"ddpm": "ddpm", "ddim": "ddim", "dpm": "dpm", "euler": "euler"}[r["sampler"]]
    e = DZ["samp"]["m4"][k][str(r["steps"])]
    ok(e["fd"] == r["fd"] and e["acc"] == r["acc"] and e["div"] == r["div"], f"lab {k} {r['steps']}")
sm, ex, gu, sd = O("samplers.json"), O("extra.json"), O("guide.json"), O("sd.json")
alias = {"eta0.0": "ddim", "dpm2m": "dpm"}
for r in sm["runs"]:
    if r["sampler"].startswith("lab_"):
        continue
    e = DZ["samp"]["m4"][alias.get(r["sampler"], r["sampler"])][str(r["steps"])]
    ok(e["fd"] == r["fd"] and e["acc"] == r["acc"], "sampler " + r["name"])
for r in ex["runs"]:
    if r["sampler"] in ("m8_ddim", "m8_ddpm"):
        e = DZ["samp"]["m8"][r["sampler"][3:]][str(r["steps"])]
        ok(e["fd"] == r["fd"] and e["acc"] == r["acc"], "m8 " + r["name"])
for r in gu["runs"]:
    if r["kind"] in DZ["guide"]:
        hit = [g for g in DZ["guide"][r["kind"]] if g["scale"] == r["scale"] and g["fd"] == r["fd"]]
        ok(len(hit) == 1, "guide " + r["name"])
ok(DZ["sd"]["runs"] == [dict(x, cap=y["cap"]) for x, y in zip(sd["runs"], DZ["sd"]["runs"])], "sd runs")
# reproduction of the lab's numbers by this page's run
rep = {r["name"]: r for r in sm["runs"]}
ok(rep["lab_ddim"]["fd"] == next(r["fd"] for r in lab["samplers"] if r["sampler"] == "ddim" and r["steps"] == 10), "lab DDIM 10 reproduced exactly")
ok(sm["check_eta0_vs_lab_ddim"] < 1e-5 and sm["check_eta1_vs_lab_ddpm"] < 1e-3, "eta checks")

# ---- DZX: the root lab's recordings, unchanged
mx = re.search(r"window\.DZX=(\{.*?\});\n", page, re.S); DZX = json.loads(mx.group(1))
ok(DZX == O("page_data_more.json"), "page embeds out/page_data_more.json")
labpd = O("page_data.json", LAB)
ok(DZX["lab"] == labpd["f"] and DZX["traj"] == labpd["traj"], "DZX lab numbers and trajectories equal the root lab's")
ok(all(DZX["st"][k] == labpd["st"][k] for k in DZX["st"]), "DZX strips equal the root lab's")
ok(all(DZX["per_t"][k] == labpd["train"][k]["per_t"] for k in ("eps", "v")), "DZX error by timestep equals the root lab's")
# ---- static fill: each span holds its recorded value
html_part = page.split("<script>")[0]
for attr, src in (("data-dz", DZ["f"]), ("data-lab", DZX["lab"])):
    for k, v in re.findall(r'<span ' + attr + r'="([^"]+)">(.*?)</span>', html_part):
        ok(k in src and v == str(src[k]), f"static {attr} {k}")
ok(not re.search(r'<span data-(dz|lab)="[^"]+"></span>', html_part), "every number span filled")
# ---- prose: every data-dz key exists, and the typed numbers below hold
keys = set(re.findall(r'data-dz="([^"]+)"', re.sub(r'<script.*?</script>', ' ', page, flags=re.S)))
missing = sorted(k for k in keys if k not in DZ["f"])
ok(not missing, "data-dz keys missing from DZ.f: " + ", ".join(missing))
text = re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>", " ", page, flags=re.S))))
rc = O("recompute.json"); toy = O("gmm_toy.json")
claims = [
    ("SNR below 1 from t = 259", rc["schedules"]["linear"]["snr_lt1_from"] == 259),
    ("t = 259, 496 and 354", rc["schedules"]["cosine"]["snr_lt1_from"] == 496 and rc["schedules"]["scaled"]["snr_lt1_from"] == 354),
    ("0.419 at t = 0 against 0.00027 at t = 999", [O("page_data.json", LAB)["train"]["eps"]["per_t"][i][2] for i in (0, -1)] == [0.41895, 0.00027]),
    ("0.00004 at t = 0 against 0.603 at t = 999", [round(O("page_data.json", LAB)["train"]["eps"]["per_t"][i][3], 5) for i in (0, -1)] == [4e-05, 0.60313]),
    ("v-model's is 0.161", round(O("page_data.json", LAB)["train"]["v"]["per_t"][-1][3], 3) == 0.161),
    ("0.0064 and 0.068", round(rc["schedules"]["linear"]["sqrt_abar_999"], 4) == 0.0064 and round(rc["schedules"]["scaled"]["sqrt_abar_999"], 3) == 0.068),
    ("SNR is 0.0047", round(rc["schedules"]["scaled"]["snr_999"], 4) == 0.0047),
    ("4,096 &times; 0.0047", rc["mean_leak"]["sd_n_per_channel"] == 4096),
    ("about 19", round(rc["mean_leak"]["sd_mean_snr_999"]) == 19),
    ("77.8% at s = 1 to 96.4% at s = 5", [r["acc"] for r in lab["cfg"] if r["scale"] in (1, 5)] == [0.778, 0.964]),
    ("FD within 0.2", max(abs(a["fd"] - b["fd"]) for a in lab["samplers"] for b in lab["samplers"]
                          if a["sampler"] == "euler" and b["sampler"] == "ddim" and a["steps"] == b["steps"]) <= 0.2),
]
for s, c in claims:
    ok(s.replace("&times;", "×") in text or s in page, "claim text not on page: " + s)
    ok(c, "claim wrong: " + s)
print(f"checks {n}, failures {len(bad)}")
for b in bad:
    print("  FAIL", b)
