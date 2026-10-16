#!/usr/bin/env python3
"""The page embeds exactly src/ft_data.json; the data is reproducible from src/runs and src/inputs; numbers in the prose
match the data, recompute.json and the root's labs; quoted source lines exist; privacy.
usage: python3 check/check_data.py
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
PAGE = os.path.join(SRC, "..", "index.html")
html = open(PAGE, encoding="utf-8").read()
bad = 0
def ok(c, msg):
    global bad
    if not c:
        bad += 1; print("FAIL", msg)

# 1. embedded data equals ft_data.json, and make_data reproduces it
m = re.search(r"window\.FT=(\{.*?\});\n", html, re.S)
emb = json.loads(m.group(1))
ok(emb == json.load(open(os.path.join(SRC, "ft_data.json"))), "embedded data differs from ft_data.json")
before = open(os.path.join(SRC, "ft_data.json")).read()
subprocess.run([sys.executable, os.path.join(SRC, "scripts", "make_data.py")], check=True, capture_output=True)
ok(open(os.path.join(SRC, "ft_data.json")).read() == before, "make_data.py does not reproduce ft_data.json")
# runs embedded exactly
for n in ("strag_none", "strag_mix", "strag_mix2"):
    r = json.load(open(os.path.join(SRC, "runs", n + ".json")))
    for k in range(4):
        ok(emb["strag"]["runs"][n]["compute"][k] == r["ranks"][str(k)]["compute_ms"], f"{n} rank {k} compute")
        ok(emb["strag"]["runs"][n]["comm"][k] == r["ranks"][str(k)]["comm_ms"], f"{n} rank {k} comm")

# 2. prose numbers
text = re.sub(r"<[^>]+>", " ", html)
text = re.sub(r"\s+", " ", text)
rc = json.load(open(os.path.join(SRC, "recompute.json")))
sdc = emb["sdc"]["runs"]; tax = {s["id"]: s for s in emb["tax"]["sources"]}
d16 = rc["designs"]["l3_16384"]
def pct(x): return f"{100 * x:.1f}%"
claims = {
    pct(d16["base"]["g"]): "68.9%", pct(d16["det"]["g"]): "72.7%", pct(d16["spare"]["g"]): "77.1%", pct(d16["async"]["g"]): "97.0%",
    f"{sdc['grad_hi']['gnorm_flip']:.1e}".replace("e+", "e"): "3.9e36", f"{sdc['grad_hi']['flip']['after']:.1e}".replace("e+", "e"): "1.6e37",
    f"{sdc['w_lo']['max_abs_diff']:.1e}".replace("e-0", "e-"): "4.8e-7",
    str(emb["sdc"]["clean"]["false_spikes"][0]): "84",
    f"{tax['llama3']['bucket_share']['gpu'] + tax['llama3']['bucket_share']['mem']:.0f}%": "64%",
    f"{tax['meta32k']['bucket_share']['gpu'] + tax['meta32k']['bucket_share']['mem']:.0f}%": "37%",
    f"{tax['acme']['bucket_share']['user']}%": "73.4%",
    f"{rc['kokolis_check']['mttf_16384_h']}": "1.8",
}
for got, want in claims.items():
    ok(got == want, f"computed {got} but prose says {want}")
    ok(want in text, f"prose number {want} not found on the page")
ok(max(r["max_abs_diff"] for k, r in sdc.items() if k != "w_hi") < 1e-4, "five flips below 1e-4")
ok(rc["adamw_toy"]["v_inf_after_120"] and rc["adamw_toy"]["max_update_hit_after"] < 1e-6, "AdamW toy")
ok(all(sdc[k]["cks_first"] is None for k in ("grad_lo", "grad_mid", "grad_hi")), "gradient flips pass the checksum")
ok(all(sdc[k]["cks_first"] == 120 for k in ("w_lo", "w_mid", "w_hi")), "weight flips caught at 120")
ok(all(sdc[k]["replay"]["first"] == [120, 2] for k in ("grad_lo", "grad_mid", "grad_hi")), "replay names replica 2 step 120")
ok(all(sdc[k]["replay"]["first"] == [121, 2] for k in ("w_lo", "w_mid")), "replay names replica 2 step 121")
ok(sdc["w_hi"]["nan_step"] == 121, "w_hi NaN at 121")
l3 = tax["llama3"]["checks"][0]
ok(l3["sum"] == 419 and l3["pct_mismatch"] == [["Faulty GPU", 30.1, 35.3]], "Llama 3 table check")
ok(round(rc["kokolis_check"]["2048_C300_R300"], 2) == 0.89 and rc["kokolis_check"]["12000_C10_R300"] > 0.9, "Meta reproduction")
for s in ("166 s", "3.4 s", "44 s", "18.1 s", "0.15 s", "445 s", "121 s"):
    ok(s in text, "root lab figure missing: " + s)

# 3. source lines quoted on the page exist in source_quotes.json
q = {(x["file"].split("/")[-1], x["line"]) for x in json.load(open(os.path.join(SRC, "inputs", "source_quotes.json")))["quotes"]}
for f, l in (("ProcessGroupNCCL.hpp", 159), ("ProcessGroupNCCL.cpp", 976), ("ProcessGroupNCCL.cpp", 1775), ("ProcessGroupNCCL.cpp", 1787),
             ("ProcessGroupNCCL.cpp", 1777), ("FlightRecorder.hpp", 110), ("run.py", 572), ("run.py", 564), ("Backend.hpp", 37)):
    ok((f, l) in q, f"source line {f}:{l} not located")

# 4. privacy and style on everything committed from this folder
root = os.path.join(SRC, "..")
import getpass
pat = re.compile("/Us" "ers/|Us" "ers-|" + re.escape(getpass.getuser()) + "|gl" "pat|sk-" "ant|" r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}|" + chr(0x2014))
for dp, dn, fn in os.walk(root):
    if ".shots" in dp or "__pycache__" in dp:
        continue
    for f in fn:
        p = os.path.join(dp, f)
        if f.endswith((".png",)) or f == "build.sh" and dp.endswith("src"):
            continue  # build.sh greps for the em-dash on purpose
        t = open(p, encoding="utf-8", errors="replace").read()
        for mm in pat.finditer(t):
            s = mm.group(0)
            if s.startswith(("noreply@", "git@")) or "@" in s and s.split("@")[1] in ("2x", "3x"):
                continue
            bad += 1; print("PRIVACY/STYLE", os.path.relpath(p, root), repr(t[max(0, mm.start() - 30):mm.end() + 20])); break
        ok(os.path.getsize(p) < 1_000_000, "file over 1 MB: " + p)
print("check_data:", "ALL OK" if not bad else f"FAIL {bad}")
