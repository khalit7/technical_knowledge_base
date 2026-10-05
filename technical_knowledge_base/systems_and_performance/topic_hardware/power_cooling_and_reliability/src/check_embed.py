"""Checks after sh build.sh: (1) the page embeds exactly parts/22_js_pw_data.js as written by recompute.py (window.PW);
(2) every number written by hand in the prose agrees with out/expected.json; (3) no private patterns in src/ or the page.
Usage: python3 -B check_embed.py   (exit 1 on any failure)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
exp = json.load(open(os.path.join(HERE, "out", "expected.json")))
data = open(os.path.join(HERE, "parts", "22_js_pw_data.js"), encoding="utf-8").read()
bad = 0
m = re.search(r"window\.PW=(\{.*?\});\n", html, re.S)
m2 = re.search(r"window\.PW=(\{.*?\});\n", data, re.S)
if not m or not m2 or json.loads(m.group(1)) != json.loads(m2.group(1)):
    print("FAIL: embedded window.PW differs from parts/22_js_pw_data.js"); bad += 1
else:
    pw = json.loads(m.group(1))
    same = all(pw[k] == exp[k] for k in ('sim_defaults', 'chips', 'systems', 't5', 'scale', 'mc_check', 'swing', 'day_fails_h', 'day_bad', 'day_young'))
    print("ok: embedded data equals recompute.py output" if same else "FAIL: window.PW differs from out/expected.json"); bad += 0 if same else 1

E = exp
gw = E["per_gw"]
# (literal as written in the HTML, value from the data, value the prose states)
claims = [
    ("100,000 GPUs stop every 30 minutes", E["mtbf_100k_llama3rate_min"], 30),
    ("about 14,000 cubic feet of air a minute", E["nvl72_air_cfm_dT15"], 14000),
    ("about 170 litres a minute", E["nvl72_water_lpm_dT10"], 170),
    ("once every 3.1 hours", E["mtbf_llama3_h"], 3.1),
    ("0.56 pJ against 0.71 pJ", [c for c in E["chips"] if c[0] == "B300 (GB300)"][0][6], 0.56),
    ("0.56 pJ against 0.71 pJ", E["h100_pj"], 0.71),
    ("about 21% less", 100 * (1 - 0.56 / E["h100_pj"]), 21),
    ("about 55% of it", 100 * 5.6 / 10.2, 55),
    ("would already be 40.8 kW", E["dgxh100_rack_x4_kw"], 40.8),
    ("would need 18,519 A", E["amps_1mw_54v"], 18519),
    ("(1,250 A for the same megawatt)", E["amps_1mw_800v"], 1250),
    ("is 1.53 kW", gw["dgxh100"]["root"]["kw_per_acc"], 1.53),
    ("about $0.15 per GPU-hour", gw["dgxh100"]["root"]["elec_per_acc_h"], 0.15),
    ("3.7% of Lambda", E["h100_elec_share_of_rent"], 3.7),
    ("about $0.86 billion", E["gw_year_cost_busd"], 0.86),
    ("about <b>3,464 times</b>", E["vol_heat_ratio"], 3464),
    ("would warm by 16.2 &deg;C", E["dgxh100_air_dT"], 16.2),
    ("are 11.5 MW of GPU power", E["l3_gpu_tdp_mw"], 11.5),
    ("would be 20.9 MW", E["l3_server_max_mw"], 20.9),
    ("65 J covers 46 ms", E["gb300_store_ms_at_1400w"], 46),
    ("add to 268 of 419", E["t5_gpu"], 268),
    ("<b>64.0%</b>", E["t5_gpu_pct"], 64.0),
    ("148 of 419 is 35.3%", E["t5_faulty_gpu_pct_by_count"], 35.3),
    ("caused 91, 21.7%", E["t5_memory_on_gpu_pct"], 21.7),
    ("one per 33.6 GPU-years", E["t5_per_gpu_hbm_years"], 33.6),
    ("is 3.79 failures per thousand", E["rate_llama3_per_k_node_days"], 3.79),
    ("once every 264 days", E["mtbf_1server_days_llama3rate"], 264),
    ("about every 5.8 years", E["mtbf_1gpu_years_llama3rate"], 5.8),
    ("project to 1.8 hours", E["kokolis_mtbf_16k_h"], 1.8),
    ("0.23 hours for 131,072", E["kokolis_mtbf_131k_h"], 0.23),
    ("(&mu; = 3.09 h)", E["sim_mu_h"], 3.09),
    ("Young gives 48.1 minutes", E["sim_T_young_min"], 48.1),
    ("exact optimum is 44.8 minutes", E["sim_T_opt_min"], 44.8),
    ("keeps 72.5% of its time", 100 * E["sim_eff_exact_young"], 72.5),
    ("3-hour interval on the same run keeps 53.2%", 100 * E["sim_eff_exact_bad"], 53.2),
    ("to within 0.12%", 100 * E["aupy_max_rel_err"], 0.12),
    ("within 0.7 percentage points", 100 * E["mc_max_abs_gap"], 0.7),
    ("&mu; = 23 minutes", E["scale"][5]["mtbf_min"], 23),
    ("26.6% useful time", 100 * E["scale"][5]["c5m"]["eff_exact_at_young"], 26.6),
    ("against 27.0% at the true optimum", 100 * E["scale"][5]["c5m"]["eff_opt"], 27.0),
    ("first-order formula's &minus;6.2%", 100 * E["scale"][5]["c5m"]["eff_first_at_young"], -6.2),
    ("at most 21.6 GWh", E["l405_gwh"], 21.6),
    ("<b>4.98 J per training token</b>", E["l405_j_per_tok"], 4.98),
    ("that is 1.72 J at 100% of peak", E["l405_floor_j_per_tok"], 1.72),
    ("and 4.19 J at the 41% MFU", E["l405_at_41mfu_j_per_tok"], 4.19),
    ("is 1.82 times its GPUs", E["l405_server_scale"], 1.82),
    ("roughly 10.9 J per training token", E["l405_facility_j_per_tok"], 10.9),
    ("(864 J)", E["gemini_prompt_j"], 864),
    ("that fraction is about 73%", 100 * E["sim_eff_exact_opt"], 73),
    ("= about 65,000 GPUs", E["drill_100mw_h100"], 65000),
    ("about 6.6 m&sup3;/s (14,000 CFM)", E["nvl72_air_m3s_dT15"], 6.6),
    ("MTBF halves from 185.6 to 92.8 minutes", E["drill_32k_mtbf_min"], 92.8),
    ("+ 2 = about 21.3 minutes", E["drill_32k_young_min"], 21.3),
    ("reproduces the parent page's \"about 466,000\"", E["root_check_b200_per_gw"], 466000),
]
for lit, val, want in claims:
    if lit not in html:
        print("FAIL: literal not found:", lit); bad += 1; continue
    tol = 0.011 * max(1, abs(want)) + (0.5 if abs(want) >= 20 else 0.05)
    if abs(want) >= 1000:
        tol = 0.03 * abs(want)
    if abs(val - want) > tol:
        print(f"FAIL: {lit!r}: data gives {val}, prose says {want}"); bad += 1
    else:
        print(f"ok: {lit[:58]!r} = {val:.5g}")
# private patterns in everything that will be committed
root = os.path.dirname(HERE)
for dp, dn, fn in os.walk(root):
    if '.shots' in dp:
        continue
    for f in fn:
        pth = os.path.join(dp, f)
        try:
            txt = open(pth, encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        for priv in ("Users/", "Users-", "glpat", "sk-ant"):
            if priv in txt and not f.endswith('check_embed.py'):
                print("FAIL: private pattern", priv, "in", os.path.relpath(pth, root)); bad += 1
print("check_embed:", "FAIL" if bad else "ALL OK", bad)
sys.exit(1 if bad else 0)
