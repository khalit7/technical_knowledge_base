"""Checks that the built page embeds exactly the recorded data and that numbers written in the Dedup lab's prose match it.
usage: python3 check_numbers.py   (plain Python 3, no venv needed; run after build.sh)
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
page = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
data_js = open(os.path.join(HERE, "..", "parts", "32_js_dd_0data.js"), encoding="utf-8").read()
O = lambda n: json.load(open(os.path.join(HERE, "out", n)))  # noqa: E731
bad = 0

# 1. the page carries the data file byte for byte
if data_js.strip() not in page:
    print("FAIL: index.html does not contain parts/32_js_dd_0data.js (rebuild?)"); bad += 1
DD = json.loads(re.search(r"window\.DD=(.*);\s*$", data_js, re.S).group(1))
# 2. the data equals the recorded outputs
sc, big, ex, se, bl, su, fw = (O("dd_scurve.json"), O("dd_bighash.json"), O("dd_exact.json"), O("dd_sent.json"),
                               O("dd_bloom.json"), O("dd_suffix.json"), O("dd_fineweb.json"))
for name, a, b in [("scurve", DD["scurve"], sc["settings"]), ("big", DD["big"], big), ("bloom", DD["bloom"], bl),
                   ("pairs", len(DD["pairs"]), len(O("dd_pairs.json")["pairs"])), ("fw", DD["fw"], fw)]:
    if a != b:
        print("FAIL: data differs from out/ for", name); bad += 1
# 3. numbers in the prose of the tab's HTML parts
html = "".join(open(os.path.join(HERE, "..", "parts", f), encoding="utf-8").read()
               for f in sorted(os.listdir(os.path.join(HERE, "..", "parts"))) if f.startswith("32_tab_dd_"))
fmt = lambda v: f"{v:,}"  # noqa: E731
claims = [
    (fmt(DD["n"]), "documents in filtered"), (fmt(DD["npairs"]), "pairs"),
    (fmt(sc["clusters"]["removed"]), "MinHash removed"), (str(sc["clusters"]["n"]) + " clusters", "clusters"),
    (fmt(14 * DD["n"]), "signature values checked"), (fmt(len(DD["pairs"])) + " pairs", "embedded pairs"),
    (fmt(ex["extracted"]["docs"]), "extracted docs"), (fmt(ex["final"]["docs"]), "final docs"),
    (fmt(ex["extracted"]["lines"]["total"]), "lines"), (fmt(ex["extracted"]["lines"]["dup"]), "line repeats"),
    (fmt(bl["unique"]), "distinct lines"), (fmt(ex["extracted"]["lines_on_5plus_hosts"]["distinct"]), "lines on 5+ hosts"),
    (fmt(ex["extracted"]["lines_on_5plus_hosts"]["occurrences"]), "their occurrences"),
    (fmt(big["rw20x450"]["pairs_J_eq_1"]), "identical pairs"), (str(big["rw450x20"]["pairs_J_ge_08"]), "pairs >= 0.8"),
    (str(se["filtered"]["docs_dropped"]), "C4 dropped"), (str(se["filtered"]["docs_shortened"]), "C4 shortened"),
    (str(fw["groups"]["in_fineweb"] + fw["groups"]["removed_by_our_minhash"] + fw["groups"]["kept_by_us_not_in_fineweb"]), "fw groups sum"),
]
for s, what in claims:
    if s not in html and s not in page:
        print(f"FAIL: {what}: {s!r} not found in the prose"); bad += 1
c = DD["cmp"]
checks = [(c["overlap"]["c4_spans"]["minhash"] == 64, "64 of the 70 C4 drops are MinHash removals"),
          (c["counts"]["exact"] == 50 and c["overlap"]["exact"]["minhash"] == 50, "all 50 exact copies in MinHash"),
          (su["stages"]["final"]["by_L"][1]["frac"] == 0.0086, "0.86% after MinHash at L=100"),
          (round(su["stages"]["extracted"]["by_L"][1]["frac"], 2) == 0.17, "17% extracted at L=100"),
          (bl["sizes"][1]["fp_runs"] == [13, 11, 14] or min(bl["sizes"][1]["fp_runs"]) >= 11, "11 to 14 at 1 MiB"),
          (bl["min_words_bug"]["marked_with_min_words_1"] == 0, "min_words bug"),
          (big["rw20x450"]["candidates"] == 143 and big["rw450x20"]["cand_J_ge_08"] == 308, "RefinedWeb readings"),
          (round(75 / DD["n"], 3) == 0.028, "2.8% one-file rate")]
for ok, what in checks:
    if not ok:
        print("FAIL:", what); bad += 1
print("check_numbers:", "ok" if not bad else f"{bad} failures")
sys.exit(1 if bad else 0)
