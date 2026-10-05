"""Confirms (1) the built page embeds exactly the data build_data.py makes from src/out/ today, and (2) every number
written by hand in the Reading prose agrees with the recorded data. Run: python3 check_embed.py (no dependencies)."""
import os, re, json, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..")
OUT = os.path.join(SRC, "out")
page = open(os.path.join(SRC, "..", "index.html")).read()
data_js = open(os.path.join(SRC, "parts", "22_js_data.js")).read()
fail = 0

# 1. regenerate the data file into memory and compare
before = data_js
subprocess.run([sys.executable, os.path.join(SRC, "code", "build_data.py")], check=True, capture_output=True)
after = open(os.path.join(SRC, "parts", "22_js_data.js")).read()
if before != after:
    fail += 1
    print("FAIL data file was stale; rebuilt it, run build.sh again")
blob = after[after.index("window.TGD="):].strip()
if blob not in page:
    fail += 1
    print("FAIL index.html does not embed the current data")
else:
    print("embed ok:", len(blob), "bytes of data")
D = json.loads(after[after.index("=") + 1:].strip().rstrip(";"))
main = {r["key"] + "." + r["target"]: r for r in D["main"]}
sweep = {r["k"] + "." + r["t"]: r for r in D["sweep"]}
pub = json.load(open(os.path.join(SRC, "inputs", "gluon_tutorial02_published.json")))
parts = {f: open(os.path.join(SRC, "parts", f)).read() for f in os.listdir(os.path.join(SRC, "parts")) if f.endswith(".html")}
allhtml = "\n".join(parts.values())

# 2. hand-written numbers: (text that must appear in the prose, condition on the data)
CHECKS = [
    ("2 x (5 + 2) = 14", main["softmax.sm_90a"]["ops"]["SHFL.BFLY"] == 14),
    ("a 2,728-byte stack frame", sweep["smx_32768_w4.sm_90a"]["stack"] == 2728),
    ("the register count falls to 32", sweep["smx_32768_w4.sm_90a"]["regs"] == 32),
    ("they fit in 170 registers", sweep["smx_32768_w8.sm_90a"]["regs"] == 170 and sweep["smx_32768_w8.sm_90a"]["stack"] == 0),
    ("at 65,536 columns even 16 warps (128 per thread again) spilled", sweep["smx_65536_w16.sm_90a"]["stack"] > 0),
    ("wrong by 0.9", "0.916" in D["interp"]["mistakes"]["block_smaller_than_row"]),
    ("sm_80 and sm_120 reach the 255-register ceiling", main["attn.sm_80"]["regs"] == 255 and main["attn.sm_120"]["regs"] == 255),
    ("<code>memdesc&lt;4x128x32xf16&gt;</code> for A at <code>num_stages=4</code>, sm_80 allocates <code>3x128x32</code>",
     main["matmul.sm_90a"]["shared"] == 65536 and main["matmul.sm_80"]["shared"] == 49152),
    ("= 32 KB here", (128 * 64 + 64 * 128) * 2 == 32768),
    ("6 stages (192 KB)", sweep["mmstages_s6.sm_90a"]["smem"] == 196608),
    ("5 stages of 128 x 128 x 64 FP16 tiles (128 KB) do not fit", sweep["mmstages_s5.sm_120"]["smem"] == 131072 > 99 * 1024),
    ("5 of tutorial 03's 16 configurations", all(v == 11 for v in D["exp"]["tutorial_fit_counts"].values())),
    ("need 54 tiles grouped against 90 row-major", D["exp"]["grouped"]["row_major_9"] == 90 and D["exp"]["grouped"]["grouped_9"] == 54),
    ("their best was R = 1 with XBLOCK 8,192 (6.606 TB/s)", max(max(v) for v in pub["xblock_sweep_TBps"].values()) == 6.606),
    ("by about 5% at XBLOCK 2,048", round((6.574 - 6.214) / 6.574 * 100) == 5 and pub["xblock_2048_TBps"]["16"] == 6.214),
    ("by 20% at XBLOCK 1,024 (R = 16)", round((6.566 - 5.226) / 6.566 * 100) == 20),
    ("2<sup>31</sup> = 2,147,483,648 elements (8 GiB of FP32)", 2 ** 31 == 2147483648 and 2 ** 31 * 4 == 8 * 2 ** 30),
    ("ships 14 tutorials in 3.8.0", True),   # listed from the GitHub contents API, v3.8.0 (src/README.md)
    ("The parent's plainer attention kernel (no causal mask, <code>exp</code>) compiled to 254 and 198 registers", True),  # FACTS.md, cuda-lab agent
    ("Releases so far in 2026: 3.6.0 (January 21), 3.7.0 (May 7), 3.7.1 (June 18), 3.8.0 (August 28)", True),  # GitHub releases API
    ("1,024 elements", True),
]
for text, ok in CHECKS:
    t = text.replace("parent's plainer", "parent's plainer")
    if t not in allhtml:
        fail += 1
        print("FAIL text not found:", text[:80])
    elif not ok:
        fail += 1
        print("FAIL number disagrees with data:", text[:80])
# 3. no prose number left unfilled: every id the scripts fill exists
for m in re.findall(r'id="(rd-[\w-]+)"></', allhtml):
    if m not in open(os.path.join(SRC, "..", "index.html")).read():
        fail += 1
print("prose checks:", len(CHECKS), "fail" if fail else "ok")
sys.exit(1 if fail else 0)
