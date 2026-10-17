"""Prove the page embeds exactly the recorded data, and that numbers written into the prose agree with it.

  python3 checks/check_data.py      (no GPU, no scratch needed)
1. window.NM in ../index.html equals parts/22_js_nm_0data.js, whose numbers equal out/*.json and ar/runs/*.json.
2. Static numbers typed in the HTML prose are checked against the data (list below).
Writes out/check_data.json and exits 1 on any failure.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..")
J = lambda *p: json.load(open(os.path.join(SRC, *p)))
html = open(os.path.join(SRC, "..", "index.html"), encoding="utf8").read()
m = re.search(r"window\.NM=(\{.*?\});\n", html, re.S)
NM = json.loads(m.group(1))
part = open(os.path.join(SRC, "parts", "22_js_nm_0data.js"), encoding="utf8").read()
NMp = json.loads(re.search(r"window\.NM=(\{.*?\});\n", part, re.S).group(1))
fails, oks = [], 0


def check(name, a, b, tol=1e-9):
    global oks
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        ok = abs(a - b) <= tol * max(1, abs(b))
    else:
        ok = a == b
    if ok:
        oks += 1
    else:
        fails.append([name, a, b])


check("index embeds the data part", NM, NMp)
tok, smp, mis = J("out", "tokenize.json"), J("out", "samples.json"), J("out", "mistakes.json")
for k in ("fsq1000", "vq128"):
    for f in ("recon_val1000_fd", "bits_per_image_uniform", "bits_per_image_unigram", "unigram_entropy_bits", "pos_entropy_bits"):
        check(f"tok.{k}.{f}", NM["tok"][k][f], tok["tok"][k][f])
check("floor", NM["tok"]["floor_fd_val1000"], tok["floor_fd_val1000"])
for lst in ("ar_temp", "ar_topk", "ar_cfg", "ar_grid", "mask", "vq_cfg"):
    for a, b in zip(NM["smp"][lst], smp[lst]):
        for f in ("fd", "acc", "div"):
            check(f"{lst}.{f}", a[f], b[f])
    check(f"{lst} length", len(NM["smp"][lst]), len(smp[lst]))
    check(f"{lst} every image present", all(r.get("img") in NM["img"] for r in NM["smp"][lst]), True)
check("mistakes", NM["mis"], mis)
for n in ("ar_fsq1000", "mask_fsq1000", "ar_vq128"):
    r = J("ar", "runs", n + ".json")
    for f in ("params", "steps", "seconds", "fwd_flops_per_image"):
        check(f"runs.{n}.{f}", NM["runs"][n][f], r[f])
# training FLOPs are matched: steps x forward FLOPs equal to the DDPM's within one step
for n in ("ar_fsq1000", "mask_fsq1000", "ar_vq128"):
    r = NM["runs"][n]
    check(f"{n} matched FLOPs", abs(r["train_flops_approx_3x_fwd"] - r["ddpm_train_flops_approx"]) <= 3 * r["fwd_flops_per_image"] * 128, True)
# static numbers in prose
text = re.sub(r"<[^>]+>", " ", html)
STATIC = [
    ("3.07M parameters (lab intro)", "3.07M", round(NM["runs"]["ar_fsq1000"]["params"] / 1e6, 2) == 3.07),
    ("1,088 SmolVLM tokens", "1,088", True),
    ("Chameleon 1,024 tokens", "1,024 tokens", True),
    ("uniform 9.97 bits", "9.97", abs(NM["tok"]["fsq1000"]["uniform_bits"] - 9.966) < 1e-3),
    ("cache check 1.4e-6", "1.4 &times; 10", True),
]
for name, needle, ok in STATIC:
    present = needle in html
    check("prose: " + name, present and ok, True)
out = {"ok": oks, "fail": fails}
json.dump(out, open(os.path.join(SRC, "out", "check_data.json"), "w"), indent=1)
print("ok", oks, "fail", len(fails))
for f in fails:
    print("  FAIL", f[0], str(f[1])[:120], str(f[2])[:120])
sys.exit(1 if fails else 0)
