"""After build.sh: (1) the page embeds exactly the data build_data.py writes from the recorded inputs;
(2) every number the Reading tab's prose quotes equals the recorded value it comes from; (3) no private paths or em dashes.
Run: python3 check_data.py   (plain Python 3)"""
import json, os, re, subprocess, sys, html
H = os.path.dirname(os.path.abspath(__file__)); S = os.path.dirname(H); ROOT = os.path.dirname(S)
page = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
part = open(os.path.join(S, "parts", "22_js_rd_data.js")).read()
before = part
subprocess.run([sys.executable, os.path.join(H, "build_data.py")], check=True, capture_output=True)
after = open(os.path.join(S, "parts", "22_js_rd_data.js")).read()
fails = []
if before != after: fails.append("22_js_rd_data.js is stale: rebuild")
if after.split("\n", 1)[1].strip() not in page: fails.append("index.html does not embed the current data")
D = json.loads(after[after.index("=") + 1:].strip().rstrip(";"))
F = json.load(open(os.path.join(S, "read", "inputs", "measure.json")))
m = re.search(r'<div class="tab" id="t-read".*?(?=<div class="tab" id="t-step")', page, re.S)
text = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>|<style.*?</style>", "", m.group(0), flags=re.S)))
text = re.sub(r"\s+", " ", text)
MB = lambda b, d=2: f"{b / 1e6:.{d}f}"
st, ph, op, cp, dist = D["step"], D["phases"], D["opt"], D["comp"], D.get("dist")
checks = [
  ("34.85 to 3.33 MB", MB(st["plain"]["fwd_added"]) + " to " + MB(st["ckpt"]["fwd_added"]) + " MB"),
  ("295", str(st["plain"]["n_bwd"])), ("486", str(st["plain"]["n_opt"])), ("142", str(st["plain"]["n_fwd"])),
  ("22.5 to 31.6", f'{ph["cpu"]["step"]:.1f} to {ph["cpu_ck"]["step"]:.1f}'),
  ("2.7 times faster on the CPU and 4.1 times on MPS", f'{op["cpu"]["forloop"] / op["cpu"]["fused"]:.1f} times faster on the CPU and {op["mps"]["forloop"] / op["mps"]["fused"]:.1f} times on MPS'),
  ("23.20 ms compiled against 22.75 ms eager", f'{cp["cpu"]["compiled"]:.2f} ms compiled against {cp["cpu"]["eager"]:.2f} ms eager'),
  ("19.08 ms", f'{cp["cpu"]["eager, fused AdamW"]:.2f} ms'),
  ("19.19 ms", f'{ph["cpu"]["fwd"] + ph["cpu"]["bwd"] + op["cpu"]["fused"]:.2f} ms'),
  ("1.18 times", f'{cp["mps"]["eager"] / cp["mps"]["compiled"]:.2f} times'), ("1.85 times", f'{cp["mps"]["eager"] / cp["mps"]["compiled, fused AdamW"]:.2f} times'),
  ("6.52 ms with gradients, 6.16 ms under", "6.52 ms with gradients, 6.16 ms under"),
]
if dist:
    mm = dist["mem"]
    checks += [("from 548 MB to 249 MB", f'from {mm["ddp_w2_big"]["total"] / 1e6:.0f} MB to {mm["fsdp_w4_big"]["total"] / 1e6:.0f} MB'),
               ("303 MB", f'{(mm["ddp_w2_big"]["params"] + mm["ddp_w2_big"]["opt"]) / 1e6:.0f} MB'),
               ("1,051,648 B, then 11,696,128 B", ", then ".join(f'{c["in_bytes"]:,} B' for c in dist["coll"]["ddp_w2"] if c["op"] == "all_reduce")),
               ("14 collectives", f'{len(dist["coll"]["fsdp_w2"])} collectives'),
               ("3.80137, 3.09551, 3.16247", ", ".join(f"{x:.5f}" for x in dist["coll"]["ddp_w2_loss"]))]
for quoted, expect in checks:
    if quoted != expect: fails.append(f"prose {quoted!r} but data gives {expect!r}")
    elif quoted not in text: fails.append(f"{quoted!r} not found in the Reading text")
# tiny graph and dispatch facts quoted in prose
if F["custom_op"]["plain"]["breaks"] == 0 or F["custom_op"]["custom_op"]["breaks"] != 0: fails.append("custom-op result changed")
import getpass
for bad in ["/Users/", "Users-", getpass.getuser(), "glpat", "sk-ant", chr(0x2014)]:
    for fn in ["index.html"]:
        if bad in page: fails.append(f"found {bad!r} in {fn}")
print("checks", len(checks), "fails", len(fails)); [print(" ", f) for f in fails]
sys.exit(1 if fails else 0)
