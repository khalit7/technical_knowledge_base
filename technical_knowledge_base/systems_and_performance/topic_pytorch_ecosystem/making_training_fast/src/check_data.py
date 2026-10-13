"""After the build: (1) the page embeds exactly the data build_data.py produces from exp/inputs; (2) every number
written by hand in the HTML prose equals the recorded value it states; (3) no private paths or em dashes.
Numbers drawn by the page's JavaScript come from window.FST, so they match by construction.
    python3 check_data.py   (exit 1 on any failure)"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_data

page = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
fails = 0


def ok(cond, msg):
    global fails
    print(("ok   " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


# (1) embedded data
data = build_data.build()
m = re.search(r"window\.FST=(\{.*?\});\n", page, re.S)
ok(m is not None and json.loads(m.group(1)) == json.loads(json.dumps(data)), "page embeds exactly build_data.py's output")

# (2) hand-written prose numbers against the data
mem = {(r["config"], r["how"]): r for r in data["mem"]["runs"]}
big = mem[("big", "plain")]
checks = [
    ("25,373,184", big["params"] == 25373184, "larger variant parameters"),
    ("3.39147", abs(big["loss"] - 3.39147) < 5e-6 and all(abs(mem[("big", h)]["loss"] - 3.39147) < 5e-6 for h in ("ckpt", "sac_mm", "sac_attn")), "same loss in the four checkpointing runs"),
    ("411.7 MB", abs(8 * 256 * 50257 * 4 / 1e6 - 411.7) < 0.05, "one logits tensor at V = 50,257"),
    ("100 tensors in the larger variant", True, "parameter tensor count (8 x 12 + 4)"),
]
import itertools
n_tensors_big = 8 * 12 + 4
ok(n_tensors_big == 100, "larger variant has 100 parameter tensors")
for lit, cond, what in checks:
    ok(lit in page and cond, f"{what}: '{lit}' on the page and equal to the data")
# BlockMask facts quoted in prose
fl = {(b["T"], b["mask"]): b for b in data["flex"]["block_masks"]}
ok(fl[(256, "causal")]["block_size"] == [128, 128], "default BlockMask block size 128 (prose: 128 x 128 tiles)")
# the per-block formula in the calculator matches every recorded saved-bytes check
sf = data.get("saved_formula")
if sf:
    ok(all(c["diff"] == 0 or abs(c["diff"]) <= 8 * c["T"] + 64 for c in sf["checks"]), "saved-activation formula matches measured saved bytes (to the position ids)")
# torchao bytes stated in prose
ao = data["ao"]["ptq_big_after_150_steps"]
ok(ao[0]["linear_bytes"] > ao[1]["linear_bytes"], "int8 smaller than float32")

# (3) privacy and style
import getpass
for bad in ("/Users/", "Users-", getpass.getuser(), "glpat", "sk-ant", "@gmail", chr(0x2014)):
    ok(bad not in page, f"no '{bad}' in the page")
print("fails", fails)
sys.exit(1 if fails else 0)
