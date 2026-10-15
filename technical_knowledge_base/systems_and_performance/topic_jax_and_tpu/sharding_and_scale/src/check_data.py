"""Checks before publishing (run from src/): 1. the page embeds exactly the data ss_data.py builds from out/*.json;
2. numbers written in the prose match the recorded data; 3. privacy grep over everything that will be committed.
The Mesh designer's JavaScript is checked against runs/ss_mesh.py by check_mesh.mjs.

    python3 -I -B check_data.py
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
fails = []


def J(n):
    return json.load(open(os.path.join(OUT, n)))


# 1. embedded data == rebuilt data
page = open(os.path.join(HERE, "..", "index.html")).read()
part = open(os.path.join(HERE, "parts", "22_js_ss_data.js")).read()
before = part
subprocess.run([sys.executable, "-I", "-B", os.path.join(HERE, "runs", "ss_data.py")], check=True, capture_output=True)
after = open(os.path.join(HERE, "parts", "22_js_ss_data.js")).read()
if before != after:
    fails.append("22_js_ss_data.js is stale: rerun runs/ss_data.py and build.sh")
line = [ln for ln in after.splitlines() if ln.startswith("window.SS=")][0]
if line not in page:
    fails.append("index.html does not embed the current data: rerun build.sh")
SS = json.loads(line[len("window.SS="):].rstrip(";"))
if SS["scale"]["configs"]["big"]["params"] != J("scale.json")["configs"]["big"]["params"]:
    fails.append("scale params differ")

# 2. prose numbers against data
read = "".join(open(os.path.join(HERE, "parts", f)).read() for f in sorted(os.listdir(os.path.join(HERE, "parts"))) if f.endswith(".html"))
sc = J("scale.json")["configs"]
big = {l["id"]: l for l in sc["big"]["layouts"]}
small = {l["id"]: l for l in sc["small"]["layouts"]}
fc = J("formula_check.json")["rows"]
cp = J("cp.json")
pipe = J("pipe.json")
moe = J("moe.json")
ex = J("explicit.json")
prop = J("prop.json")
multi = J("multi.json")
tot = lambda rows: (sum(r["count"] for r in rows), sum(r["bytes"] for r in rows))
mb = lambda b: round(b / 1e6, 1)


def claim(text, ok, what):
    if text not in read:
        fails.append("prose no longer contains: " + text)
    elif not ok:
        fails.append("prose number disagrees with data: " + what)


claim("25,417,728 parameters", sc["big"]["params"] == 25417728, "big params")
claim("826,368 parameters", sc["small"]["params"] == 826368, "small params")
dp_ar = [c for c in big["dp"]["collectives"] if c[0] == "all-reduce"][0][4]
claim("one all-reduce of exactly the gradient bytes (101,670,916", dp_ar == 101670916, "dp bytes")
claim("from 305 MB to 38 MB", mb(big["dp"]["param_bytes_per_device"] + big["dp"]["opt_bytes_per_device"]) == 305.0
      and round((big["fsdp"]["param_bytes_per_device"] + big["fsdp"]["opt_bytes_per_device"]) / 1e6) == 38, "fsdp memory")
claim("temp 412 MB per device against 311 MB", round(big["fsdp"]["memory"]["temp_size_in_bytes"] / 1e6) == 412
      and round(big["dp"]["memory"]["temp_size_in_bytes"] / 1e6) == 311, "temp")
claim("227 MB at 25.4M parameters against 102 MB", round(sum(c[4] for c in big["tp"]["collectives"]) / 1e6) == 227, "tp bytes")
r = [x for x in fc if x["config"] == "small" and x["id"] == "tp8"][0]
claim("1.33 times the predicted bytes", round(r["ratio_measured_over_predicted"], 2) == 1.33, "tp8 ratio")
ok04 = all(abs(x["ratio_measured_over_predicted"] - 1) < 0.004 for x in fc if x.get("ratio_measured_over_predicted") and x["id"] != "tp8"
           or (x["id"] == "tp8" and x["config"] == "big" and abs(x["ratio_measured_over_predicted"] - 1) < 0.004))
claim("within 0.4%", ok04, "formula ratios within 0.4%")
claim("every loss is within 4.8e-7", all(rr.get("abs_loss_diff_vs_one_device", 0) <= 4.8e-7 for rr in ex["runs"]), "explicit loss")
claim("within 4.8e-7 of one device over 3 steps", max(l["max_abs_loss_diff_vs_single"] for c in sc.values() for l in c["layouts"]) <= 4.8e-7, "scale loss")
claim("tensor parallel to 17 all-reduces", [rr for rr in ex["runs"] if rr["layout"] == "tp" and rr["fix"] == "tp"][0]["collectives"]["all-reduce"]["count"] == 17, "explicit tp")
fs = prop["full_step"]
claim("compiled to 18 collectives under Shardy and 167 under GSPMD", tot(fs["tp"]["shardy"])[0] == 18 and tot(fs["tp"]["gspmd"])[0] == 167, "tp prop")
claim("210 under Shardy and 148 under GSPMD", tot(fs["fsdp_naive"]["shardy"])[0] == 210 and tot(fs["fsdp_naive"]["gspmd"])[0] == 148, "fsdp prop")
claim("every one of the 94 operation groups", all(c["n_ops_compared"] == 94 for c in prop["cases"]), "94 groups")
re_ = cp["running_example"]
claim("largest difference 7.5e-8 for the ring", round(re_["ring"]["max_abs_err"], 9) == 7.5e-08 or abs(re_["ring"]["max_abs_err"] - 7.45e-8) < 1e-9, "ring err")
claim("gradients within 2.9e-6 for all three", max(v["grad_max_abs_err"] for v in re_.values()) <= 2.9e-6, "cp grads")
claim("123 MB per device for the ring against 273 MB", round(cp["long"]["methods"]["ring"]["temp_bytes_per_device"] / 1e6) == 123
      and round(cp["long"]["methods"]["allgather"]["temp_bytes_per_device"] / 1e6) == 273, "cp long temp")
claim("3,670,016 bytes", re_["ring"]["collectives"]["collective-permute"]["bytes"] == 3670016, "ring bytes")
claim("4,194,304-byte output", re_["allgather"]["collectives"]["all-gather"]["bytes"] == 4194304, "ag bytes")
runs = {(x["kind"], x["S"], x["M"], x["R"]): x for x in pipe["runs"]}
claim("loss within 4.8e-7 and every gradient within 1.2e-7", max(x["abs_loss_diff"] for x in pipe["runs"]) <= 4.8e-7
      and max(x["grad_max_abs_diff"] for x in pipe["runs"]) <= 1.2e-7, "pipe errs")
claim("3/7 for 4 stages and 4 microbatches", abs(runs[("gpipe", 4, 4, 1)]["bubble_fraction_forward"] - 3 / 7) < 1e-9, "bubble 3/7")
claim("1/9 for MaxText", abs(runs[("circular", 2, 4, 2)]["bubble_fraction_forward"] - 1 / 9) < 1e-9, "bubble 1/9")
claim("(16 collective-permutes against 8)", runs[("circular", 2, 4, 2)]["collectives"]["collective-permute"]["count"] == 16
      and runs[("gpipe", 2, 4, 1)]["collectives"]["collective-permute"]["count"] == 8, "permutes")
m1 = [x for x in moe["runs"] if x["k"] == 1]
claim("exactly 2 all-to-alls forward and 3 in the backward", all(x["hand"]["collectives"]["all-to-all"]["count"] == 2 and x["hand"]["grad_collectives"]["all-to-all"]["count"] == 3 for x in moe["runs"]), "moe hand")
claim("used all-to-all in only 1 of 6", sum(1 for x in moe["runs"] if "all-to-all" in x["auto"]["collectives"]) == 1, "moe auto")
col6 = [row[6] for row in moe["runs"][0]["wanted"]]
col1 = [row[1] for row in moe["runs"][0]["wanted"]]
claim("expert 6 is wanted by 120 to 150", min(col6) == 120 and max(col6) == 150, "moe col6")
claim("expert 1 by 21 to 35", min(col1) == 21 and max(col1) == 35, "moe col1")
claim("(78 all-gathers and 70 all-reduces each)", True, "root lab fsdp (root strategies.json)")
root = json.load(open(os.path.join(HERE, "..", "..", "src", "shard", "out", "strategies.json")))
g = [x for x in root["gspmd"] if x["id"] == "fsdp"][0]
if not (g["same_as_shardy"] and g["summary"]["all-gather"]["count"] == 78 and g["summary"]["all-reduce"]["count"] == 70):
    fails.append("root fsdp gspmd counts changed")
claim("33.5 MB of MLP-hidden all-gathers", sum(r["bytes"] for r in fs["fsdp_naive"]["shardy"] if r["kind"] == "all-gather" and r["where"] == "model_jax.py:68" and r["phase"] == "fwd") == 33554432, "surprise")
n = multi["normal"]
if not (n["processes_agree"] and n["max_abs_loss_diff_vs_one_device"] <= 4.8e-7):
    fails.append("multi run")

# 3. privacy: everything under the page folder that will be committed
pat = re.compile(r"/Users/|Users-|khalid|glpat|sk-ant|[\w.+-]+@[\w-]+\.[\w.]+|\.local\b|MacBook")
root_dir = os.path.dirname(HERE)
for dp, dns, fns in os.walk(root_dir):
    dns[:] = [d for d in dns if d not in (".shots", "__pycache__")]
    for fn in fns:
        fp = os.path.join(dp, fn)
        if fn.endswith((".png",)):
            continue
        try:
            txt = open(fp, errors="replace").read()
        except Exception:
            continue
        for m in pat.finditer(txt):
            ctx = txt[max(0, m.start() - 30):m.end() + 30].replace("\n", " ")
            if "noreply" in ctx or "check_data.py" in fp:
                continue
            fails.append(f"privacy: {os.path.relpath(fp, root_dir)}: ...{ctx}...")
        if os.path.getsize(fp) > 4_000_000:
            fails.append("file over 4 MB: " + fp)

print("\n".join(fails) if fails else "check_data: all ok")
sys.exit(1 if fails else 0)
