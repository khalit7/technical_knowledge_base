"""Check that ../index.html embeds exactly the data generated from src/runs/, and that numbers quoted in prose exist in the data.
usage: python3 -B check_data.py"""
import json, os, re, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(H, "..", "..", "index.html")
html = open(P, encoding="utf-8").read()
emb = json.loads(re.search(r"window\.MP=(\{.*?\});\n", html, re.S).group(1))
part = open(os.path.join(H, "..", "parts", "15_js_mp_data.js")).read()
gen = json.loads(part[part.index("=") + 1:-2])
subprocess.run([sys.executable, "-B", os.path.join(H, "gen_data.py")], check=True, capture_output=True)
part2 = open(os.path.join(H, "..", "parts", "15_js_mp_data.js")).read()
bad = []
if emb != gen: bad.append("page data differs from parts/15_js_mp_data.js (rebuild)")
if part2 != part: bad.append("parts/15_js_mp_data.js is stale against src/runs (rerun gen_data.py)")
D = emb
text = re.sub(r"<script.*?</script>", "", html, flags=re.S)
def need(s, why):
    if s not in text: bad.append(f"prose lacks {s!r} ({why})")
# numbers in prose and where they must come from
r3 = next(r for r in D["runs"] if r["id"] == next(v for v in D["versions"] if v["v"] == D["champion"])["run"])
checks = [(repr(r3["val_loss"]), r3["val_loss"] == D["repro"]["recorded"]["val_loss"]),
          (repr(D["load_champion"]["val_loss"]), D["load_champion"]["val_loss"] == r3["val_loss"]),
          ("1,386,058", any(a[0] == "ckpt" and a[2] == 1386058 for m in D["metaflow"] for t in m["tasks"] for a in t["arts"])),
          ("3cdcf1a9ce10", D["repro_v1"]["checks"]["code_sha"]["recorded"] == "3cdcf1a9ce10"),
          ("67873f121e99", D["repro_v1"]["checks"]["code_sha"]["now"] == "67873f121e99"),
          ("2.4829", abs(D["versions"][0]["val_loss"] - 2.4829) < 5e-5), ("2.2877", abs(D["versions"][1]["val_loss"] - 2.2877) < 5e-5),
          ("2.3177", abs(D["versions"][3]["val_loss"] - 2.3177) < 5e-5), ("2.1990", abs(D["versions"][5]["val_loss"] - 2.1990) < 5e-5),
          ("2.1165", abs(next(r for r in D["runs"] if r["split"] == 0.8)["train_loss"] - 2.1165) < 5e-5),
          ("1.3e-5", abs(abs(D["xplat"]["logged"][-1][2] - D["xplat"]["logged"][-1][1]) - 1.3e-5) < 0.05e-5),
          ("1792142900051724", any(m["id"] == "1792142900051724" and not m["ok"] for m in D["metaflow"])),
          ("1792142936774695", any(m["id"] == "1792142936774695" and m["origin"] == "1792142900051724" for m in D["metaflow"])),
          ("about 540 MB", True), ("1.0 s", D["load_champion"]["load_secs"] == 1.0)]
for s, ok in checks:
    need(s, "quoted"); 
    if not ok: bad.append(f"{s!r} disagrees with the data")
ev = D["xplat"]["every"]
fl = next(r[0] for r in ev if r[1] != r[2]); fg = next(r[0] for r in ev if r[3] != r[4])
if D["xplat"]["logged"][-1][1] != r3["train_loss"]: bad.append("native step-200 loss in xplat.json is not the champion run's train_loss")
if (fl, fg) != (2, 12): bad.append(f"first divergence {fl},{fg} not 2,12 as the prose says")
if D["champion"] != 3: bad.append("champion is not 3")
print("FAIL" if bad else "OK", *bad, sep="\n  ")
sys.exit(1 if bad else 0)
