"""Prove the built page embeds exactly the recorded data and that the numbers written in the HTML match the runs.

    python3 check_data.py          (plain Python 3, no third-party packages)
1. window.EV in ../../index.html equals out/page_data.json.
2. Every measured number in EV.txt is recomputed here from out/metrics.json, out/gen.json and the setup's floor file.
3. Numbers typed directly into the HTML parts (run statistics) are checked against the JSON they came from.
Prints each check and ends with ALL OK or FAIL.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
J = lambda n: json.load(open(os.path.join(OUT, n)))
html = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
ok = True


def check(name, cond):
    global ok
    ok &= bool(cond)
    print(("ok   " if cond else "FAIL ") + name)


m = re.search(r"window\.EV=(\{.*?\});\n", html, re.S)
EV = json.loads(m.group(1))
check("page embeds exactly out/page_data.json", EV == J("page_data.json"))
met, gen, T = J("metrics.json"), J("gen.json"), EV["txt"]
NS = met["ns"]
mean = lambda a: sum(a) / len(a)
DP = {"fid": 2, "kid": 2, "cmmd": 4, "fd_dino": 1, "fd_clf": 1}
n_m = 0
for key, txt in T.items():
    if key.startswith("m:"):
        _, k, mt, n = key.split(":")
        v = mean(met["metrics"][k][mt][NS.index(int(n))])
        dp = 1 if (mt == "fid" and k == "real" and int(n) < 10000) else DP[mt]
        check(f"{key} = {txt}", txt == f"{v:,.{dp}f}"); n_m += 1
    if key.startswith("pit:"):
        check(f"{key} = {txt}", txt == f"{met['pitfalls'][key[4:]]['fid']:,.2f}")
floor = json.load(open(os.path.join(HERE, "..", "..", "..", "src", "data", "smoke", "fid_floor.json")))["floor_by_N"]
check("floor:10000 equals the setup's 2.54", T["floor:10000"] == "2.54" == f"{floor['10000'][0]:.2f}")
check("this page's real-vs-real FID at 10,000 reproduces the setup's (2.538 vs 2.54)", abs(mean(met["metrics"]["real"]["fid"][-1]) - floor["10000"][0]) < 0.01)
for n in ("1000", "500", "250"):
    lo, hi = min(floor[n]), max(floor[n]); v = mean(met["metrics"]["real"]["fid"][NS.index(int(n))])
    check(f"real FID at {n} ({v:.2f}) within 1 of the setup's draws ({lo} to {hi})", lo - 1 <= v <= hi + 1)
fi, fd, fb, fl = J("feats_inception.json"), J("feats_dino.json"), J("feats_clipB.json"), J("feats_clipL.json")
check("Inception reproduces the setup reference (2.538)", fi["check_fid_real_vs_setup_ref"] == 2.538 and fi["check_ref_mu_maxabs"] == 0.0)
check("DINOv2 test vectors equal the Vision encoders page's (cosine 1.0)", fd["check_cos_to_ve_cls_test"]["min"] >= 0.99995)
typed = [("134 images/s", round(fi["images_per_second"]) == 134), ("66 images/s", round(fd["images_per_second"]) == 66),
         ("131 images/s", round(fb["images_per_second"]) == 131), ("9 images/s", round(fl["images_per_second"]) == 9),
         ("peak 4.3 GB (gen)", round(gen["peak_mps_mb"] / 1000, 1) == 4.3), ("peak 4.5 GB (SD)", round(J("sd_gen.json")["peak_mps_mb"] / 1000, 1) == 4.5),
         ("353 s (VQA)", round(J("vqa.json")["seconds"]) == 353), ("36 s (CLIPScore)", round(J("clipscore.json")["seconds"]) == 36),
         ("1,022 s", J("clipL_full_attempt.json")["seconds_10000_test"] == 1022)]   # the stopped first L/14-336 run
for s, c in typed:
    check(f"typed in HTML: {s}", c and s.split(" (")[0].replace("peak ", "") in html)
check("ev_gen cross-check: DDPM FD 1,000 within 3 of the Diffusion from zero value 22.6", abs(gen["sets"]["ddpm"]["fd_fmnist_1000"] - 22.6) < 3)
check("ev_gen cross-check: VAE prior FD within 30 of the Latent lab's 689", abs(gen["sets"]["vae"]["fd_fmnist_1000"] - 689) < 30)
check(f"{n_m} measured m: numbers recomputed", n_m >= 7)
print("ALL OK" if ok else "FAIL")
