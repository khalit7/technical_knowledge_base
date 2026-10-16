#!/usr/bin/env python3
"""The page embeds exactly out/data.json, the numbers written in prose agree with the recorded data, and
nothing private is in the folder. usage (from src/): python3 -I check/check_embed.py"""
import json, os, re, sys, glob
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
page = open(os.path.join(H, "..", "index.html")).read()
m = re.search(r"window\.KM=(\{.*?\});\n", page, re.S)
emb = json.loads(m.group(1)); want = json.load(open(os.path.join(H, "out", "data.json")))
fails = []
if json.dumps(emb, sort_keys=True) != json.dumps(want, sort_keys=True, default=str):
    fails.append("embedded KM differs from out/data.json")
D = want; F = D["fail"]
def pod(run, idx, k=0):
    return [p for p in F[run]["pods"] if p["idx"] == str(idx)][k]
def cond(run, typ, obj=None):
    return [c for c in F[run]["conds"] if c["type"] == typ and (obj is None or c["obj"] == obj)][0]["t"]
life = D["life"]["job"]
def life_t(what, n=0):
    return [e["t"] for e in life if e["what"] == what][n]
raw = [json.loads(l) for l in open(os.path.join(H, "runs", "e1.watch.jsonl"))]
t0 = [r["t"] for r in raw if r["kind"] == "Job"][0]
p0add = [r["t"] for r in raw if r["kind"] == "Pod" and r["verb"] == "ADDED"][0]
p0bind = [r["t"] for r in raw if r["kind"] == "Pod" and r.get("node")][0]
p1bind = [r["t"] for r in raw if r["kind"] == "Pod" and r.get("node") and r["name"].startswith("km-e1-1")][0]
def bind_gap():
    from datetime import datetime
    ts = lambda l: datetime.strptime(l.split()[2][:26].rstrip("Z"), "%Y-%m-%dT%H:%M:%S.%f")
    ev = D["preempt"]["events"]
    a = [l for l in ev if "km-high  FailedScheduling" in l or ("km-high " in l and "preempting 1" in l)][0]
    b = [l for l in ev if "km-high  Scheduled" in l][0]
    return (ts(b) - ts(a)).total_seconds()
checks = [  # (text on the page, value from data, formatter)
    ("pod 0 after 21 ms", round((p0add - t0) * 1000), lambda v: f"pod 0 after {v} ms"),
    ("bound it 13 ms later", round((p0bind - p0add) * 1000), lambda v: f"bound it {v} ms later"),
    ("both pods bound took 44 ms", round((p1bind - t0) * 1000), lambda v: f"both pods bound took {v} ms"),
    ("started at 0.61 s", life_t("Started"), lambda v: f"started at {v:.2f} s"),
    ("Complete at 17.6 s", life_t("Completed"), lambda v: f"Complete at {v:.1f} s"),
    ("retried after 19.1 s", pod("e2a", 0, 1)["created"] - max(pod("e2a", 0)["end"], pod("e2a", 1)["end"]), lambda v: f"retried after {v:.1f} s"),
    ("BackoffLimitExceeded</code> at 34 s", cond("e2b", "Failed"), lambda v: f"BackoffLimitExceeded</code> at {v:.0f} s"),
    ("(e2a, 34 s)", cond("e2a", "Failed"), lambda v: f"(e2a, {v:.0f} s)"),
    ("Job at 11.6 s", cond("e2c", "Failed"), lambda v: f"Job at {v:.1f} s"),
    ("failed at 8.8 s", cond("e3c", "Failed", "km-e3c"), lambda v: f"failed at {v:.1f} s"),
    ("retried after 9.7 s", pod("e4a", 2, 1)["created"] - pod("e4a", 2)["end"], lambda v: f"retried after {v:.1f} s"),
    ("at 8.1 s", cond("e4b", "SuccessCriteriaMet"), lambda v: f"at {v:.1f} s"),
    ("only at 39.3 s", cond("e4b", "Complete"), lambda v: f"only at {v:.1f} s"),
    ("Failed at 17.5 s and its peer at 18.2 s", (pod("e3b", 1)["end"], pod("e3b", 0)["end"]), lambda v: f"Failed at {v[0]:.1f} s and its peer at {v[1]:.1f} s"),
    ("completed at 52.5 s", cond("e3b", "Completed", "km-e3b"), lambda v: f"completed at {v:.1f} s"),
    ("BackoffLimitExceeded, at 18.7 s", cond("e2d1", "Failed"), lambda v: f"BackoffLimitExceeded, at {v:.1f} s"),
    ("BackoffLimitExceeded, at 20.0 s", cond("e2d2", "Failed"), lambda v: f"BackoffLimitExceeded, at {v:.1f} s"),
    ("JobSet Completed at 14.3 s", [e["t"] for e in D["life"]["jobset"] if e["what"] == "AllJobsCompleted"][0], lambda v: f"JobSet Completed at {v:.1f} s"),
    ("Complete at 15.3 s", [e["t"] for e in D["life"]["trainjob"] if e["what"] == "AllJobsCompleted"][0], lambda v: f"Complete at {v:.1f} s"),
    ("2.2638769149780273", D["trainjob"]["gloss"][0], lambda v: repr(v)),
    ("2.2638769149780273 ", D["resume"]["ref_end"], lambda v: repr(v)),
    ("135 of 135", sum(r["checks"]["matched"] for r in D["scores"].values()), lambda v: f"{v} of {v}"),
    ("about 2.2 s after", bind_gap(), lambda v: f"about {v:.1f} s after"),
]
for text, val, fmt in checks:
    s = fmt(val)
    if s.strip() not in page:
        fails.append(f"prose {text!r}: data gives {s!r}")
mem = D["trainjob"]["mem"]
for a in ("1.037GiB", "1.251GiB"):
    if a not in mem: fails.append("memory reading " + a + " not in e12.mem.txt")
if "1.04 to 1.25 GiB" not in page: fails.append("prose memory 1.04 to 1.25 GiB")
# privacy over everything that will be committed
pat = re.compile(r"/Users/|Users-|khalid|glpat|sk-ant|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}|\.local\b(?!\s*$)")
for p in glob.glob(os.path.join(H, "..", "**", "*"), recursive=True):
    if os.path.isdir(p) or "/.shots/" in p or p.endswith("check_embed.py") or p.endswith(".png"):
        continue
    t = open(p, errors="replace").read()
    for mm in pat.finditer(t):
        s = mm.group(0)
        if s.endswith(".local") and "svc.cluster.local" in t[mm.start() - 30:mm.end()]:
            continue
        if re.fullmatch(r"[\w.+-]+@sha256", s) or "@sha256" in t[mm.start():mm.end() + 8]:
            continue
        fails.append(f"privacy: {os.path.relpath(p, H)}: {s}")
        break
print("\n".join(fails) if fails else f"OK: embedded data identical, {len(checks) + 1} prose numbers agree, privacy clean")
sys.exit(1 if fails else 0)
