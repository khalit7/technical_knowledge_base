"""Collect the torchtitan runs (logs written by run_titan.sh into a scratch folder) into ../../inputs/titan.json.
Usage: python3 summarize.py <log folder>   (plain Python 3)"""
import json, os, re, sys
D = sys.argv[1]
ANSI = re.compile(r"\x1b\[[0-9;]*m")
runs = {}
for name in ["titan_cpu", "titan_cpu_fp32", "titan_cpu_noac", "titan_cpu_fullac", "titan_cpu_fsdp"]:
    p = os.path.join(D, name + ".log")
    if not os.path.exists(p):
        continue
    steps = {}
    head = None
    for line in open(p, errors="replace"):
        line = ANSI.sub("", line)
        m = re.search(r"step:\s*(\d+)\s+loss:\s*([0-9.]+)\s+grad_norm:\s*([0-9.]+)", line)
        if m:
            steps[int(m.group(1))] = [float(m.group(2)), float(m.group(3))]
        m = re.search(r"Trainer is initialized with (.*)$", line)
        if m:
            head = m.group(1).strip()
    runs[name] = {"loss": [steps[k][0] for k in sorted(steps)], "grad_norm": [steps[k][1] for k in sorted(steps)], "setup": head,
                  "processes": 2 if name.endswith("fsdp") else 1}
chk = json.load(open(os.path.join(D, "check.json")))
out = {"runs": runs, "attention_check": chk}
here = os.path.dirname(os.path.abspath(__file__))
json.dump(out, open(os.path.join(here, "..", "..", "inputs", "titan.json"), "w"), indent=1)
print(json.dumps({k: (v["loss"][:2], v["loss"][-1], v["setup"]) for k, v in runs.items()}, indent=1))
