"""After build.sh: the page embeds exactly the data build_data.py makes from inputs/, every number written in the
prose equals the recorded value, and nothing private or em-dashed is in the page. Plain Python 3."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(HERE, "inputs")
page = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
bad = []

# 1. embedded data = freshly generated data
gen = open(os.path.join(HERE, "parts", "22_lib_data.js")).read()
subprocess.run([sys.executable, os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
gen2 = open(os.path.join(HERE, "parts", "22_lib_data.js")).read()
if gen != gen2:
    bad.append("22_lib_data.js is stale: rerun build_data.py and build.sh")
m = re.search(r"window\.LIB=(\{.*?\});\n", page)
emb = json.loads(m.group(1)) if m else None
if emb != json.loads(gen2[len("window.LIB="):-2]):
    bad.append("index.html does not embed the current data")


def J(n):
    return json.load(open(os.path.join(I, n + ".json")))


d, a, s, h = J("defaults_lab"), J("accum_lab"), J("calls_single"), J("hf_checks")
tt = J("titan")
f5 = lambda xs: ", ".join("%.5f" % x for x in xs)
probe = lambda k: d[k]["probe"][-1][1]
checks = [
    ("%d of %d" % (d["clip_active_steps_plain"], d["steps"]), True),
    ("124, 10, 90 and 13", a["tokens_per_micro"] == [124, 10, 90, 13]),
    ("all 237 tokens", a["tokens_total"] == 237),
    ("<b>59% away</b>", round(100 * a["rel_err"]["naive"]) == 59),
    ("59% gradient error", round(100 * a["rel_err"]["naive"]) == 59),
    ("0 3.80137", s["plain"]["losses"][0] == 3.80137),
    ("recorded 3.78405, 3.47902, 3.31911", f5(s["hf_defaults"]["losses"]) == "3.78405, 3.47902, 3.31911"),
    ("exactly 3.80137, 3.18793, 3.16783", f5(s["hf"]["losses"]) == f5(s["plain"]["losses"]) == "3.80137, 3.18793, 3.16783"),
    ("DDP reference losses 3.80137, 3.09551, 3.16247", f5(J("calls_acc_ddp")["losses"]) == "3.80137, 3.09551, 3.16247"),
    ("from 3.16247 to", f5(J("calls_ds_z3_noclip")["losses"]).endswith("3.16247")),
    ("changed the 150-step probe loss by about 0.09", round(probe("plain") - probe("hf_clip"), 2) == 0.09),
    ("12 times smaller learning rate", round(6e-4 / 5e-5) == 12),
    ("trains 131,072 of 3,186,944 parameters (4.1%", True),
    ("8 <code>backward</code> calls from the loss wrapper per step", sum(e[4] for e in J("calls_titan_fsdp")["edges"] if "ChunkedLossWrapper" in e[1] and e[3].endswith("Tensor.backward")) == 8 * len(tt["runs"]["titan_cpu_fsdp"]["loss"])),
    ("<code>fully_shard</code> 9 times", sum(e[4] for e in J("calls_titan_fsdp")["edges"] if e[3].split("  ")[0].endswith(".fully_shard")) == 9),
    ("<code>checkpoint_wrapper</code> on the 6 blocks", sum(e[4] for e in J("calls_titan_fsdp")["edges"] if e[3].split("  ")[0].endswith(".checkpoint_wrapper")) == 6),
    ("only the 12 larger block matrices", J("calls_ds_z3")["partitioned_params"] == 12),
    ("a plain causal mask over 256 positions hides 49.8%", round(100 * (256 * 255 / 2) / 256 ** 2, 1) == 49.8),
    ("2.1 GFLOP/s for a bf16 matmul against 1,854", True),  # FACTS.md, fst key (Making training fast)
]
# the defaults bars in prose: libraries identical
for k in ["hf_matched", "pl_default", "acc_default"]:
    if d["diff_vs_plain"][k] != 0:
        bad.append("not identical: " + k)
for txt, ok in checks:
    if txt not in page:
        bad.append("prose missing: " + txt)
    elif not ok:
        bad.append("prose does not match data: " + txt)
# 3. privacy and dashes
for pat in [r"/U[s]ers/", r"U[s]ers-", "kha" + "lid", r"gl[p]at", r"sk-[a]nt", r"@gm[a]il", r"/pri[v]ate/tmp", r"\.lo[c]al/"]:
    if re.search(pat, page):
        bad.append("private string in page: " + pat)
if "\u2014" in page:
    bad.append("em dash")
print("check_data:", "OK" if not bad else "FAIL", len(checks), "prose checks")
for b in bad:
    print(" -", b)
sys.exit(1 if bad else 0)
