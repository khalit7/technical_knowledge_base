"""Check that the page embeds exactly src/pipe/out/page_data.json, and that every number written as prose in the
Pipeline lab's HTML parts equals the value it came from. Run with any Python 3 (no dependencies):
    python3 src/pipe/check_numbers.py
"""
import json
import os
import re
import sys

H = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(H, "..", "parts")
D = json.load(open(os.path.join(H, "out", "page_data.json")))
js = open(os.path.join(PARTS, "31_js_pip_0data.js")).read()
emb = json.loads(js[js.index("window.DCPD=") + len("window.DCPD="):].rstrip().rstrip(";"))
page = open(os.path.join(H, "..", "..", "index.html")).read()
bad = []
if emb != D:
    bad.append("embedded data differs from out/page_data.json")
if js.strip().split("\n", 1)[1].strip() not in page:
    bad.append("index.html does not contain the current data part (rebuild)")
html = "".join(open(os.path.join(PARTS, f)).read() for f in sorted(os.listdir(PARTS)) if f.startswith("31_tab_pipe"))
R, LS, U = D["run0"], D["label_summary"], D["url"]
fmt = lambda n: f"{n:,}"
checks = [  # (text that must appear in the HTML, value it states, expected value)
    ("20,991 pages in", 20991, R["responses"]), ("2,617 documents out", 2617, R["minhash"]),
    ("183 of 20,463", 183, R["html_read"] - R["url_kept"]), ("183 of 20,463", 20463, R["html_read"]),
    ("The 77 removals", 77, sum(U["labels"].values())), ("The 108 domain", 108, U["reasons"]["domain"] + U["reasons"]["subdomain"]),
    ("12,270 of 19,241", 12270, R["removed"]["2_lid"]["n"]), ("12,270 of 19,241", 19241, R["extracted"]),
    ("removes the most (1,883)", 1883, R["removed"]["4_gopher_qual"]["n"]), ("MinHash removes only 75", 75, R["removed"]["7_minhash"]["n"]),
    ("Of the 2,425 documents FineWeb kept", 2425, R["fineweb_kept"]), ("2,403 (99.1%)", 2403, R["fineweb_in_final"]),
    ("877 English documents survive", 877, D["funnel_ext"]["wet"]["by_step"]["kept"]),
    ("against 2,692 from trafilatura", 2692, D["funnel_ext"]["traf"]["by_step"]["kept"]),
    ("keep 877 documents from WET", 877, D["derived"]["per_extractor"]["wet"]["kept"]),
    ("199 timeouts in run0, 12 of which", 199, D["derived"]["traf_status"]["rerun_text"] + D["derived"]["traf_status"]["rerun_empty"] - 840),
    ("199 timeouts in run0, 12 of which", 12, D["derived"]["traf_recovered"]["kept_in_fineweb"]),
    ("removes 173 documents", 173, LS["char_dup_ratio"]["n_in_group"]), ("6 wrong of 8 labelled", 6, LS["char_dup_ratio"]["W"]),
    ("about 64% of extracted", 64, round(100 * R["removed"]["2_lid"]["n"] / R["extracted"])),
    ("(10 pages of 20,463)", 10, U["labels"]["W"]), ("66 of 140", 66, D["pii"]["counts_before"]["emails_role_like"]),
    ("66 of 140", 140, D["pii"]["counts_before"]["emails"]), ("the 6,971 English documents", 6971, R["english"]),
]
for text, stated, expected in checks:
    if text not in html:
        bad.append(f"text not found: {text!r}")
    elif stated != expected:
        bad.append(f"{text!r}: page says {stated}, data says {expected}")
print("checked", len(checks), "prose numbers;", "OK" if not bad else "PROBLEMS:\n" + "\n".join(bad))
sys.exit(1 if bad else 0)
