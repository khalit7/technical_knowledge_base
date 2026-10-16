#!/usr/bin/env python3
"""Build the page's data (parts/22_js_km_data.js, window.KM, and out/data.json) from the recorded runs in runs/.
usage: python3 -I recompute.py && python3 -I make_data.py   (from src/)
Every time is seconds after the run's first object was created, as seen by the watcher (scripts/km_watch.py,
wall clock of arrival, 1 ms). Nothing here is typed in by hand except labels."""
import json, os, re, glob

H = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(H, "runs")


def jl(name):
    return [json.loads(l) for l in open(os.path.join(R, name + ".watch.jsonl")) if l.strip()]


def txt(name):
    return open(os.path.join(R, name)).read()


def rnd(x):
    return round(x, 2)


def t0_of(recs):
    return min(r["t"] for r in recs if r["kind"] in ("Job", "JobSet", "Pod", "Workload", "PVC", "ResourceClaim") and r.get("verb") == "ADDED")


def actor(r):
    if r["kind"] == "Event":
        return {"default-scheduler": "scheduler", "job-controller": "job controller", "kubelet": "kubelet",
                "jobset": "JobSet controller"}.get(r.get("by"), r.get("by") or "?")
    m = {x[0] for x in r.get("managers", [])}
    return m


# ---------------------------------------------------------------- 1. life of a job, three ways
def life(name, extra_t0=None):
    recs = jl(name)
    t0 = extra_t0 or t0_of(recs)
    seen_state, out = {}, []
    for r in recs:
        if r["kind"] in ("watch-start", "watch-stop", "watch-error"):
            continue
        t = rnd(r["t"] - t0)
        if r["kind"] == "Event":
            out.append({"t": t, "who": actor(r), "what": r["reason"], "obj": r["regarding"], "note": r["note"][:160]})
            continue
        k, n = r["kind"], r["name"]
        if k == "Pod":
            conds = [c["type"] for c in r.get("conds", []) if c["status"] == "True"]
            st = (r["verb"], r.get("phase"), r.get("node"), tuple(conds), bool(r.get("deleting")))
            if seen_state.get(n) == st:
                continue
            prev = seen_state.get(n); seen_state[n] = st
            if r["verb"] == "ADDED":
                own = r["owner"][0] if r["owner"] else ""
                out.append({"t": t, "who": "job controller" if "kube-controller-manager" in {m[0] for m in r["managers"]} else "?",
                            "what": "creates pod", "obj": "Pod/" + n, "note": "owner " + own})
            elif prev and prev[2] is None and r.get("node"):
                out.append({"t": t, "who": "scheduler", "what": "binds pod", "obj": "Pod/" + n, "note": "spec.nodeName = " + r["node"]})
            else:
                out.append({"t": t, "who": "kubelet", "what": "pod status", "obj": "Pod/" + n,
                            "note": (r.get("phase") or "") + ": " + ", ".join(conds)})
        else:
            mans = sorted({m[0] for m in r.get("managers", [])})
            conds = [c["type"] for c in r.get("conds", []) if c["status"] == "True"]
            stt = r.get("status", {})
            key = (r["verb"], tuple(conds), json.dumps({x: stt.get(x) for x in ("active", "ready", "succeeded", "failed")}))
            if seen_state.get(k + n) == key:
                continue
            seen_state[k + n] = key
            who = {"Job": "job controller", "JobSet": "JobSet controller"}.get(k, k)
            if r["verb"] == "ADDED":
                who = {"kubectl-create": "you (kubectl)", "jobset": "JobSet controller", "trainer": "Trainer controller"}.get(
                    [m for m in mans if m not in ("kube-controller-manager",)][0] if mans else "", "?")
                out.append({"t": t, "who": who, "what": "creates " + k, "obj": k + "/" + n, "note": "by field manager " + ", ".join(mans)})
            else:
                desc = ", ".join(f"{x}={stt[x]}" for x in ("active", "ready", "succeeded", "failed") if stt.get(x) is not None)
                out.append({"t": t, "who": who, "what": k + " status", "obj": k + "/" + n, "note": (desc + ("; " if desc and conds else "") + ", ".join(conds)).strip()})
    out.sort(key=lambda x: x["t"])
    return out


def ctime(yaml_text):
    m = re.search(r"creationTimestamp: \"([^\"]+)\"", yaml_text)
    return m.group(1) if m else None


# ---------------------------------------------------------------- 2. failure runs
def podtl(name):
    recs = jl(name); t0 = t0_of(recs); pods = {}; jobc = []; evs = []
    for r in recs:
        t = rnd(r["t"] - t0)
        if r["kind"] == "Pod":
            p = pods.setdefault(r["name"], {"pod": r["name"], "idx": r["labels"].get("batch.kubernetes.io/job-completion-index"),
                                            "created": t, "node": None, "start": None, "end": None, "exit": None, "disrupted": None, "deleted": None})
            p["node"] = p["node"] or r.get("node")
            for c in r.get("cs", []):
                s = c.get("state") or {}
                if s.get("running") and p["start"] is None:
                    p["start"] = t
                if s.get("terminated") and p["end"] is None:
                    p["end"] = t; p["exit"] = s["terminated"].get("exitCode")
            if r.get("phase") in ("Failed", "Succeeded") and p["end"] is None:
                p["end"] = t
            for c in r.get("conds", []):
                if c["type"] == "DisruptionTarget" and c["status"] == "True" and p["disrupted"] is None:
                    p["disrupted"] = t; p["dreason"] = c["reason"]
            if r["verb"] == "DELETED":
                p["deleted"] = t
        elif r["kind"] in ("Job", "JobSet"):
            for c in r.get("conds", []):
                if c["status"] == "True" and not any(j["type"] == c["type"] and j["obj"] == r["name"] for j in jobc):
                    jobc.append({"t": t, "obj": r["name"], "kind": r["kind"], "type": c["type"], "reason": c["reason"], "msg": c["message"]})
        elif r["kind"] == "Event" and r["reason"] in ("SuccessfulCreate", "BackoffLimitExceeded", "PodFailurePolicy", "FailedIndexes", "Completed",
                                                      "SuccessfulDelete", "AllJobsCompleted", "FailedJobs", "Restarting", "Evicted", "Killing"):
            evs.append({"t": t, "reason": r["reason"], "obj": r["regarding"], "note": r["note"][:200], "by": r.get("by")})
    return {"pods": sorted(pods.values(), key=lambda p: p["created"]), "conds": jobc, "events": evs}


def gloss_end(run):
    for l in open(os.path.join(R, "logs", run, "rank0.jsonl")):
        pass
    return json.loads(l)


def gloss_series(run):
    s = {}
    for l in open(os.path.join(R, "logs", run, "rank0.jsonl")):
        r = json.loads(l)
        if r["ev"] == "step":
            s[r["step"]] = r["gloss"]
    return s


# ---------------------------------------------------------------- build
KM = {"meta": {"measured": "Apple M1 Pro, Docker Desktop VM, shared machine; kind v0.33.0 with Kubernetes v1.37.0, Kueue v0.20.2, JobSet v0.13.0",
               "date": "16 October 2026"}}

e12_t0 = None
KM["life"] = {"job": life("e1"), "jobset": life("e3a"), "trainjob": life("e12")}
KM["fail"] = {r: podtl(r) for r in ("e2a", "e2b", "e2c", "e2d1", "e2d2", "e3b", "e3c", "e4a", "e4b")}
# eviction instants from the driver log, relative to each run's first object
drv = txt("driver.log").splitlines()
def hms(s):
    h, m, x = map(int, s.split(":")); return h * 3600 + m * 60 + x
for r in ("e2d1", "e2d2", "e3b"):
    c = [hms(l[:8]) for l in drv if f" {r} create" in l][-1]
    e = [hms(l[:8]) for l in drv if f" {r} evict " in l][-1]
    KM["fail"][r]["evict_after_create_s"] = e - c

ref, res = gloss_series("km-e1"), gloss_series("km-e3b")
KM["resume"] = {"ref_end": ref[200], "e3b_end": res[200], "steps": sorted(res),
                "diff": {s: res[s] - ref[s] for s in sorted(res) if s in ref and res[s] != ref[s]}}
KM["scores"] = json.load(open(os.path.join(H, "out", "scores.json")))
def kib(v): return int(v[:-2]) * 1024 if v.endswith("Ki") else int(v)
KM["cycbase"] = {}
for tag in ("e6spread", "e6pack"):
    nodes = json.load(open(os.path.join(R, tag + ".nodes_before.json"))); base = json.load(open(os.path.join(R, tag + ".requests_before.json")))
    KM["cycbase"][tag] = {n["name"]: {"cpu": int(n["allocatable"]["cpu"]) * 1000, "mem": kib(n["allocatable"]["memory"]),
                           "gpu": int(n["allocatable"].get("example.com/gpu", 0)), "taints": [t["key"] + ":" + t["effect"] for t in n["taints"]],
                           "nzcpu": round(base[n["name"]]["nonzero_cpu"] * 1000), "nzmem": int(base[n["name"]]["nonzero_memory"]),
                           "rcpu": round(base[n["name"]]["cpu"] * 1000), "rmem": int(base[n["name"]]["memory"]), "rgpu": base[n["name"]]["example.com/gpu"],
                           "pods": base[n["name"]]["pods"]} for n in nodes}

# preemption and spread
def evlines(name, pat=None):
    out = []
    for l in txt(name).splitlines()[1:]:
        if pat and not re.search(pat, l):
            continue
        out.append(re.sub(r"\s{2,}", "  ", l.strip()))
    return out
KM["preempt"] = {"pods_low": txt("e5a.pods_low.txt"), "pods_high": txt("e5a.pods_high.txt"),
                 "events": evlines("e5a.events.txt", r"FailedScheduling|Preempted|Scheduled\s+default|Killing"),
                 "tl": podtl("e5a")}
KM["spread"] = {p: {"pods": txt(f"e5b-{p}.pods.txt"), "events": evlines(f"e5b-{p}.events.txt", "FailedScheduling")[:1]} for p in ("ignore", "honor")}

# device plugin and DRA
KM["dev"] = {"steps": txt("e7.steps.txt"), "dra": txt("e8.steps.txt")}

# gang
def snaps(name):
    out, cur = [], None
    for l in txt(name).splitlines():
        if l.startswith("## "):
            cur = {"label": l[3:], "pods": []}; out.append(cur)
        elif l.startswith("km-"):
            f = l.split()
            cur["pods"].append({"pod": f[0], "phase": f[1], "node": None if f[2] == "<none>" else f[2]})
    return out
KM["gang"] = {"nogang": snaps("e11nogang.snap"), "gang": snaps("e11gang.snap"),
              "log": [re.sub(r"^I\d+ ([\d:.]+)\s+\d+ ", r"\1 ", l) for l in txt("e11gang.schedlog.txt").splitlines()
                      if re.search(r"Quorum|cannot be satisfied|PreEnqueue plugin\" pod=\"km/km-a-0\" plugin=\"GangScheduling", l)][:6],
              "release": [l[:8] + " " + l.split()[-1] for l in drv if "e11gang released" in l],
              "tl": podtl("e11gang"), "tl0": podtl("e11nogang")}
KM["pvc"] = txt("e9.steps.txt")

# Kueue
import yaml  # noqa: E402  (PyYAML is in the topic venv; the page data needs only these fields)
def wls(name):
    d = yaml.safe_load(txt(name + ".workloads.yaml"))
    out = []
    for it in d["items"]:
        st = it.get("status", {}); adm = st.get("admission")
        msg = [c["message"] for c in st.get("conditions", []) if c["type"] == "QuotaReserved"]
        out.append({"name": it["metadata"]["name"], "podsets": [{"name": p["name"], "count": p["count"],
                     "req": p["template"]["spec"]["containers"][0]["resources"]["requests"],
                     "ann": (p["template"].get("metadata") or {}).get("annotations")} for p in it["spec"]["podSets"]],
                    "admitted": bool(adm), "cq": adm["clusterQueue"] if adm else None,
                    "flavors": adm["podSetAssignments"][0]["flavors"] if adm else None,
                    "usage": adm["podSetAssignments"][0].get("resourceUsage") if adm else None,
                    "topo": adm["podSetAssignments"][0].get("topologyAssignment") if adm else None,
                    "msg": msg[0] if msg else None})
    return out
KM["kueue"] = {"flavors": wls("e10a"), "tas": wls("e10b1") + wls("e10b2") + wls("e10b3"),
               "pods_flavors": txt("e10a.pods.txt"), "pods_tas": {"t1": txt("e10b1.pods.txt"), "t3": txt("e10b3.pods.txt")}}

# TrainJob
pods = yaml.safe_load(txt("e12.pods.yaml"))["items"]
c0 = pods[0]["spec"]["containers"][0]
KM["trainjob"] = {"env": [[e["name"], e.get("value") or (e.get("valueFrom") or {}).get("fieldRef", {}).get("fieldPath")] for e in c0.get("env", [])],
                  "pods": [p["metadata"]["name"] for p in pods], "restartPolicy": pods[0]["spec"]["restartPolicy"],
                  "gloss": [json.loads(l)["gloss"] for l in txt("e12.logs.txt").splitlines() if '"ev": "end"' in l][:1],
                  "mem": txt("e12.mem.txt")}
os.makedirs(os.path.join(H, "out"), exist_ok=True)
json.dump(KM, open(os.path.join(H, "out", "data.json"), "w"), indent=1, default=str)
js = "/* generated by make_data.py from runs/: do not edit */\nwindow.KM=" + json.dumps(KM, separators=(",", ":"), default=str) + ";\n"
open(os.path.join(H, "parts", "22_js_km_data.js"), "w").write(js)
print("KM data", len(js), "bytes")
