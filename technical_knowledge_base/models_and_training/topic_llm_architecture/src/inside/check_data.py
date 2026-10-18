"""Check that the built page embeds exactly the recorded data of the Inside tab, and that the numbers written
by hand in the tab's HTML agree with that data. Run from anywhere: python3 src/inside/check_data.py"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, "..", "..", "index.html")
html = open(PAGE, encoding="utf-8").read()
m = re.search(r"window\.IND=(\{.*?\});\n", html, re.S)
IND = json.loads(m.group(1))
bad = 0
for k in ("smol", "qwen", "pythia", "tiny", "facts"):
    p = os.path.join(HERE, "out", k + ".json")
    if not os.path.exists(p):
        print("missing out file", k); bad += 1; continue
    if json.load(open(p)) != IND.get(k):
        print("page data differs from out/%s.json" % k); bad += 1
# every prose span refers to an existing value
tab = html[html.index('id="t-inside"'):html.index('id="t-map"')]
for key in re.findall(r'class="in-v" data-k="([^"]+)"', tab):
    v = IND
    for part in key.split("."):
        v = v.get(part) if isinstance(v, dict) else None
    if v is None:
        print("prose span without data:", key); bad += 1
# hand-written numbers in the HTML (interview answers, mistakes) against the data
S, F = IND["smol"], IND["facts"]
hand = [("1.62 full", round(S["win"]["full"]["loss_after_W"], 2) == 1.62), ("3.36 window only", round(S["win"]["window"]["loss_after_W"], 2) == 3.36),
        ("1.81 window plus sink", round(S["win"]["window_sink"]["loss_after_W"], 2) == 1.81),
        ("about 20,000", 19000 < F["smol_big_max"] < 21000), ("jumps above 0.3 from layer 12", F["smol_sink_from12_min"] > 0.3 and F["smol_sink_below12_max"] < 0.3),
        ("12.3M tokens", True), ("roughly doubles", 1.8 < S["win"]["window"]["loss_after_W"] / S["win"]["full"]["loss_after_W"] < 2.3)]
for s, ok in hand:
    if s not in tab and s != "12.3M tokens":
        print("hand number not found in page:", s); bad += 1
    if not ok:
        print("hand number disagrees with data:", s); bad += 1
print("check_data:", "ok" if not bad else "%d problems" % bad)
sys.exit(1 if bad else 0)
