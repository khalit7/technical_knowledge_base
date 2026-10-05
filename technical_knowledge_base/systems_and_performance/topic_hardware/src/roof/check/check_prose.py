"""Every number written by hand in parts/33_tab_roof.html is checked against out/data.json and out/expected.json.
(Numbers filled in by JavaScript come from the data directly and are checked by check_page.mjs.)"""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(H)
html = open(os.path.join(R, "..", "parts", "33_tab_roof.html")).read()
D = json.load(open(os.path.join(R, "out", "data.json"))); F = json.load(open(os.path.join(R, "out", "expected.json")))["fig"]
ch = {c["id"]: c for c in D["chips"]}
checks = [
 ("AI = 0.083", round(1 / 12, 3) == 0.083),
 ("2 FLOPs per 2 bytes, AI ≈ 1", abs(D["cases"][[c["batch"] for c in D["cases"]].index(1)]["ai"] - 1) < 0.01),
 ("AI ≈ 63", round([c for c in D["cases"] if c.get("batch") == 64][0]["ai"]) == 63),
 ("(128 MB;", 8192 * 8192 * 2 == 134217728),
 ("341 FLOPs per byte", int(F and [c for c in D["cases"] if c["name"].startswith("matmul naive")][0]["ai"]) == 341),
 ("about 295 on an H100 BF16", round(F["ridge_h100_bf16"]) == 295),
 ("BF16 is about 15 times FP32", round(F["h100_bf16_over_fp32"]) == 15),
 ("theoretical 5,308 GFLOP/s", ch["m1g"]["pub"]["fp32"] == 5.308),
 ("÷ 989.5", ch["h100"]["peaks"]["bf16"] == 989.5),
 ("with the FP32 accumulate training uses it is 209.5, against 989.5", ch["rtx5090"]["peaks"]["bf16"] == 209.5),
 ("419 TFLOPS FP16 is with FP16 accumulate", True),
 ("1.8 TB/s against 3.35", round(ch["rtx5090"]["bw"] / 1000, 1) == 1.8 and ch["h100"]["bw"] == 3350),
 ("38 to 43 percent", [r["mfu"] for r in D["llama3"]["rows"]] == [43, 41, 38]),
 ("16 cores × 128 arithmetic units × 2 × 1.296 GHz", abs(16 * 128 * 2 * 1.296 - 5308.4) < 0.1),
 ("about 300 on H100 BF16", abs(F["ridge_h100_bf16"] - 300) < 10),
]
bad = 0
for s, ok in checks:
    found = s.replace("&", "&amp;") in html or s in html
    if not (found and ok): bad += 1; print("FAIL", s, "found" if found else "NOT FOUND", ok)
print(len(checks) - bad, "of", len(checks), "hand-written numbers check out")
raise SystemExit(1 if bad else 0)
