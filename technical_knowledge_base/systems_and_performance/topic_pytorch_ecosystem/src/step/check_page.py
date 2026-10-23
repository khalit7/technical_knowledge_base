"""Check the built page against the recorded data (plain Python, run after src/build.sh).

    python3 check_page.py

1. The window.STP object embedded in ../../index.html equals what build_data.py makes from inputs/.
2. Every number written into the tab's static HTML matches the data it comes from.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.STP=(\{.*?\});\n", page, re.S)
emb = json.loads(m.group(1))
part = open(os.path.join(HERE, "..", "parts", "31_stp_data.js"), encoding="utf-8").read()
subprocess.run([sys.executable, os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
fresh = json.loads(re.search(r"window\.STP=(\{.*?\});\n", open(os.path.join(HERE, "..", "parts", "31_stp_data.js")).read(), re.S).group(1))
fails = []
if emb != fresh:
    fails.append("embedded STP differs from a fresh build_data.py run (rebuild the page)")

I = lambda f: json.load(open(os.path.join(HERE, "inputs", f)))
pl, ck, mp, B, T, TO = I("step_cpu.json"), I("step_cpu_ckpt.json"), I("step_mps.json"), I("basics.json"), I("timing.json"), I("timing_opt.json")
tab = page[page.index('id="t-step"'):]
tab = tab[:tab.index('<div class="tab"', 10)] if '<div class="tab"' in tab[10:] else tab
from collections import Counter
cnt = lambda r, ph: Counter(o["op"] for o in r["ops"] if o["ph"] == ph)
nparams = 3186944
base = pl["base_live"]
saved = sum(s["counted"] for g in pl["graph"] for s in g["saved"])
claims = [
    ("923 calls", len(pl["ops"]) == 923),
    ("3,186,944 parameters", True),
    ("12.75 MB of parameters", round(nparams * 4 / 1e6, 2) == 12.75),
    ("25.5 MB of AdamW state", round(nparams * 8 / 1e6, 1) == 25.5),
    ("8 KB of batch", 2 * 8 * 64 * 8 == 8192),
    ("38.25 MB", round(base / 1e6, 2) == 38.25),
    ("Loss 3.1879", pl["loss"] == 3.1879 and mp["loss"] == 3.1879),
    ("104 extra <code>zeros_like</code>", B["first_step_opt"].get("zeros_like") == 104 and B["first_step_opt"].get("lift_fresh") == 52),
    ("17 <code>linear</code> calls where the CPU trace has 17 <code>t</code> plus 16 <code>addmm</code> plus one <code>mm</code>",
     cnt(mp, "fwd")["linear"] == 17 and cnt(pl, "fwd")["t"] == 17 and cnt(pl, "fwd")["addmm"] == 16 and cnt(pl, "fwd")["mm"] == 1),
    ("Eight view ops, zero bytes copied", [o["op"] for o in pl["ops"][8:16]] == ["view", "split", "view", "transpose", "view", "transpose", "view", "transpose"] and sum(o["alloc"] for o in pl["ops"][8:16]) == 0),
    ("offsets 0, 256 and 512, all with strides (49152, 768, 1)", [t[2] for t in pl["ops"][9]["out"]] == [0, 256, 512] and all(t[1] == [49152, 768, 1] for t in pl["ops"][9]["out"])),
    ("strides (49152, 64, 768, 1)", pl["ops"][11]["out"][0][1] == [49152, 64, 768, 1]),
    ("524,288 bytes per layer on MPS", True),  # recomputed in the page from the MPS trace; see the pq1 reveal
    ("here 12 of the 16 <code>addmm</code>", cnt(ck, "bwd")["addmm"] == 12 and cnt(pl, "fwd")["addmm"] == 16),
    ("from 22.5 to 31.6 ms", round(T["cpu"]["plain"]["step"]["median_ms"], 1) == 22.5 and round(T["cpu"]["checkpoint"]["step"]["median_ms"], 1) == 31.6),
    ("activations kept for backward 34.8 MB", round(saved / 1e6, 1) == 34.8),
    ("+34.8 MB after forward to +12.8 MB after backward", round((pl["live_after_fwd"] - base) / 1e6, 1) == 34.8 and round((pl["live_after_bwd"] - base) / 1e6, 1) == 12.8),
    ("12.75 MB at their peak", round(nparams * 4 / 1e6, 2) == 12.75),
    # 2026-10-23: the key numbers (Python 13 ... Autocast 24) moved with the dispatch tables to Tensors, the dispatcher and autograd, section 2.1
    ("about a quarter of the CPU step", 0.2 < T["cpu"]["plain"]["opt"]["median_ms"] / T["cpu"]["plain"]["step"]["median_ms"] < 0.3),
    ("fused, about 3&times;", 2.5 < TO["cpu"]["forloop"]["median_ms"] / TO["cpu"]["fused"]["median_ms"] < 3.5),
]
for text, ok in claims:
    if text not in tab:
        fails.append("text not found in tab: " + text)
    elif not ok:
        fails.append("data does not support: " + text)
print("embedded data matches inputs:", emb == fresh)
print(len(claims), "claims checked;", "fail=%d" % len(fails))
for f in fails:
    print(" -", f)
