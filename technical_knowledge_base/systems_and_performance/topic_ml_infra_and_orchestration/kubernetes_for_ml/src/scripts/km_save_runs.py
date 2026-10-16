#!/usr/bin/env python3
"""Copy the raw evidence of the km runs from scratch into src/runs/, scrubbed with the root's scrub.py.
usage: python3 km_save_runs.py <raw dir> <src dir>
Watch streams are de-duplicated (the watcher re-lists every 30 s, which repeats objects at the same
resourceVersion). The two all-pods snapshots taken before the scoring runs are reduced to what the scores
depend on: per node, the sum of the requests of the pods already there."""
import json, os, re, subprocess, sys, glob
raw, src = sys.argv[1], sys.argv[2]
out = os.path.join(src, "runs"); os.makedirs(out, exist_ok=True)
SCRUB = os.path.join(src, "..", "..", "src", "data", "scrub.py")

def scrub(text):
    return subprocess.run([sys.executable, "-I", SCRUB], input=text, capture_output=True, text=True, check=True).stdout

def qty(v):
    v = str(v); m = {"m": 1e-3, "Ki": 1024, "Mi": 1024**2, "Gi": 1024**3}
    for s, f in m.items():
        if v.endswith(s): return float(v[:-len(s)]) * f
    return float(v)

skip = re.compile(r"(allpods_before\.json|\.pid|\.since|\.watch\.err)$")
n = 0
for p in sorted(glob.glob(os.path.join(raw, "*"))):
    b = os.path.basename(p)
    if os.path.isdir(p) or skip.search(b):
        continue
    t = open(p).read()
    if b.endswith(".watch.jsonl"):
        seen, keep = set(), []
        for l in t.splitlines():
            r = json.loads(l)
            key = (r.get("kind"), r.get("name") or r.get("regarding"), r.get("rv"), r.get("reason"))
            if r.get("kind") not in ("watch-start", "watch-stop", "watch-error") and key in seen:
                continue
            seen.add(key); keep.append(json.dumps(r, separators=(",", ":")))
        t = "\n".join(keep) + "\n"
    if b.endswith("nodes_before.json"):
        d = json.loads(t)
        t = json.dumps([{"name": x["metadata"]["name"], "labels": {k: v for k, v in x["metadata"]["labels"].items() if "block" in k or "control-plane" in k},
                         "taints": x["spec"].get("taints", []), "allocatable": x["status"]["allocatable"]} for x in d["items"]], indent=1)
    open(os.path.join(out, b), "w").write(scrub(t)); n += 1
for p in glob.glob(os.path.join(raw, "*.allpods_before.json")):
    d = json.load(open(p)); per = {}
    for x in d["items"]:
        nd = x["spec"].get("nodeName")
        if not nd or x["status"].get("phase") in ("Succeeded", "Failed"): continue
        a = per.setdefault(nd, {"pods": 0, "cpu": 0.0, "memory": 0.0, "example.com/gpu": 0.0, "nonzero_cpu": 0.0, "nonzero_memory": 0.0})
        a["pods"] += 1
        for c in x["spec"]["containers"]:
            rq = (c.get("resources") or {}).get("requests") or {}
            for k, v in rq.items():
                if k in a: a[k] += qty(v)
            # the scheduler's "non-zero" requests: a container without a cpu or memory request counts as
            # 100m and 200 MiB (pkg/scheduler/util/pod_resources.go lines 28-31 at v1.37.0)
            a["nonzero_cpu"] += qty(rq["cpu"]) if "cpu" in rq else 0.1
            a["nonzero_memory"] += qty(rq["memory"]) if "memory" in rq else 200 * 1024**2
    open(os.path.join(out, os.path.basename(p).replace("allpods_before", "requests_before")), "w").write(json.dumps(per, indent=1)); n += 1
print("saved", n, "files to", out)
