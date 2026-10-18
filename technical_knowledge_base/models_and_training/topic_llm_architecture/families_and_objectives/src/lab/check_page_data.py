"""check_page_data.py: the built page embeds exactly the recorded outputs, and every prose placeholder resolves.
  python3 check_page_data.py ../../index.html"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
html = open(sys.argv[1], encoding="utf8").read()
m = re.search(r"window\.FOD=(\{.*?\});\n", html, flags=re.S)
F = json.loads(m.group(1))
O = lambda n: json.load(open(HERE / "out" / n))
bad = []
def eq(a, b, what):
    if a != b:
        bad.append(what)

ms = O("masks.json")
eq(F["masks"], ms, "masks.json")
mf = O("mtp_frozen.json")
eq(F["mtpf"]["held_out"], mf["held_out"], "mtp held_out")
eq(F["mtpf"]["curves"], mf["curves"], "mtp curves")
for a, b in zip(F["mtpf"]["spec"], mf["spec"]):
    eq(a, {k: v for k, v in b.items() if k != "plain_text"}, "spec prompt %s" % b["prompt"])
de = O("diffusion_eval_fo_diffusion_long.json") if (HERE / "out" / "diffusion_eval_fo_diffusion_long.json").exists() else O("diffusion_eval.json")
eq(F["diff"]["short"]["summary"], O("diffusion_eval.json")["summary"], "diffusion short summary")
eq(F["diff"]["summary"], de["summary"], "diffusion summary")
eq(F["diff"]["trace"], de["trace"], "diffusion trace")
eq({k[1:]: v for k, v in F["diff"]["fill_in"].items()}, {str(round(float(k) * 100)): v for k, v in de["fill_in"].items()}, "fill_in")
re_ = O("runs_eval.json")
for k, n in (("ref", "ref_baseline_s1500"), ("joint", "fo_mtp_joint"), ("joint_s1", "fo_mtp_joint_s1"), ("base_s1", "fo_base_s1"), ("base_1980", "fo_base_1980")):
    if n in re_:
        eq(F["mtpj"][k]["final"], re_[n]["final"], "run " + n)
    else:
        bad.append("run missing " + n)
cr = O("code_refs.json")
for k, v in cr.items():
    if isinstance(v, dict):
        eq(F["code"][k]["line"], v["line"], "code " + k)
eq(F["probe"], O("shift_probe.json"), "shift probe")
# placeholders: every data-f path resolves to a value
def get(p):
    o = F
    for k in p.split("."):
        if isinstance(o, list):
            k = int(k)
        o = o[k] if (isinstance(o, dict) and k in o) or (isinstance(o, list) and k < len(o)) else None
        if o is None:
            return None
    return o
paths = sorted(set(re.findall(r'data-f="([^"]+)"', html)))
for p in paths:
    if get(p) is None:
        bad.append("unresolved placeholder " + p)
# headline sanity: the reference reproduces the topic's number
assert abs(ms["swap"]["causal"]["held_out"] - 2.278) < 0.002
print("placeholders", len(paths), "checked;", "OK" if not bad else "PROBLEMS:\n  " + "\n  ".join(bad))
sys.exit(1 if bad else 0)
