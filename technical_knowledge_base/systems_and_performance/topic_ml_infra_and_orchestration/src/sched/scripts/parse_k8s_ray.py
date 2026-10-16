"""Turn the recorded Kubernetes and Ray runs (src/sched/runs/k8s, runs/ray) into the step lists the page animates.
Writes runs/extra.json, which make_data.py merges into SC_DATA. run: python3 -I parse_k8s_ray.py"""
import json, os, re
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
K = os.path.join(HERE, "..", "runs", "k8s")
RY = os.path.join(HERE, "..", "runs", "ray")


def t_of(s):
    s = s.replace("Z", "+00:00")
    return datetime.fromisoformat(s).timestamp()


def events(path):
    out = []
    for l in open(path):
        if l.startswith("FIRST"):
            continue
        p = l.rstrip("\n").split(None, 6)
        if len(p) < 7:
            continue
        first, last, et, kind, obj, reason, msg = p
        t = t_of(first) if first not in ("<nil>", "<none>") else t_of(et)
        out.append({"t": t, "kind": kind, "obj": obj, "reason": reason, "msg": msg.strip()})
    return sorted(out, key=lambda e: e["t"])


NODE = {"mi-kind-worker": "worker", "mi-kind-worker2": "worker2", "mi-kind-worker3": "worker3"}


def pod_label(pod):
    m = re.match(r"(sc-[abc])-node-0-(\d)-", pod)
    if m:
        return m.group(1), m.group(1)[-1] + m.group(2)
    m = re.match(r"(sc-[ab]\d)-", pod)
    return (m.group(1), m.group(1)) if m else (pod, pod)


def k1():
    ev = events(os.path.join(K, "k1.events"))
    rel = [l for l in open(os.path.join(K, "driver.log")) if "k1 released" in l]
    t0 = min(e["t"] for e in ev)
    nodes = {"worker": None, "worker2": None, "worker3": None}
    jobs = {"sc-a": 0, "sc-b": 0, "sc-c": 0}

    def jl(note):
        return [[j, ("%d of 2 pods running: waiting at the rendezvous for the other, GPUs idle" % n) if n == 1 else ("0 of 2 pods running" if n == 0 else "2 of 2 running"),
                 "wait" if n == 1 else ("pend" if note else "queue")] for j, n in jobs.items()]

    steps = [{"t": 0, "cap": "Three JobSets created. Their Job controllers created all six pods at once, each held by a scheduling gate (status <code>SchedulingGated</code>): no pod is in the scheduler's queue yet, no GPU is used.",
              "nodes": dict(nodes), "jobs": [[j, "0 of 2 pods, gated", "queue"] for j in jobs]}]
    sched = {e["obj"]: NODE.get(e["msg"].split(" to ")[-1], None) for e in ev if e["reason"] == "Scheduled"}
    fail = next(e for e in ev if e["reason"] == "FailedScheduling")
    for l in rel:
        m = re.search(r"(\d\d:\d\d:\d\d) k1 released (sc-[abc]) pod (\d) \(pod/(\S+)\)", l)
        hh, js, idx, pod = m.groups()
        tt = t_of("2026-10-16T%sZ" % hh) - t0
        n = sched.get(pod)
        lab = js[-1] + idx
        if n:
            nodes[n] = {"js": js, "label": js + " pod " + idx}
            jobs[js] += 1
            cap = "Gate of %s pod %s removed. The default scheduler places this one pod: it fits on <b>%s</b> (4 free fake GPUs), so it is bound there." % (js, idx, n)
        else:
            cap = "Gate of %s pod %s removed. No worker has 4 free fake GPUs: <code>FailedScheduling</code>. Its sibling already holds a whole node." % (js, idx)
        steps.append({"t": round(tt), "cap": cap, "nodes": json.loads(json.dumps(nodes)), "jobs": jl(True)})
    idle = {k: dict(v, idle=True) for k, v in nodes.items() if v}
    steps.append({"t": round(t_of("2026-10-16T03:13:35Z") - t0), "cap": "Four minutes later nothing has changed, and Kubernetes will not change it: every GPU is held by a pod whose job cannot run, and every missing pod waits for a GPU. The scheduler's message: <code>" + fail["msg"] + "</code>",
                  "nodes": idle, "jobs": jl(True)})
    return {"steps": steps, "fail": fail["msg"]}


def k3():
    ev = events(os.path.join(K, "k3.events"))
    t0 = min(e["t"] for e in ev if e["obj"].startswith("sc-a1") or e["obj"].startswith("job-sc-a1"))
    nodes = {"worker": None, "worker2": None, "worker3": None}
    steps = [{"t": 0, "cap": "Two ClusterQueues of 6 fake GPUs each in one cohort. Nothing running.", "nodes": dict(nodes),
              "jobs": [["team a", "0 of 6 used", "queue"], ["team b", "0 of 6 used", "queue"]]}]
    use = {"a": 0, "b": 0}
    pod_node = {}

    def jl():
        a = use["a"]
        return [["team a", "%d GPUs in use: %d of its own 6%s" % (a, min(a, 6), (", <b>%d borrowed</b> from team b" % (a - 6)) if a > 6 else ""), "run" if a else "queue"],
                ["team b", "%d of its own 6 in use" % use["b"], "run" if use["b"] else "queue"]]
    for e in ev:
        tt = round(e["t"] - t0)
        if e["reason"] == "Scheduled":
            pod = e["msg"].split("sc/")[1].split(" ")[0]
            js, lab = pod_label(pod)
            n = NODE.get(e["msg"].split(" to ")[-1])
            nodes[n] = {"js": js, "label": js}
            pod_node[pod] = n
            use[js[3]] += 4
            borrow = "Fit;borrow=1" if js[3] == "a" and use["a"] > 6 else None
            cap = "%s admitted by Kueue and its pod bound to <b>%s</b>." % (js, n) + (" Team a now uses %d GPUs against a quota of 6: Kueue logged <code>Flavors considered: main: default-flavor(Fit;borrow=1)</code>." % use["a"] if borrow else "")
            steps.append({"t": tt, "cap": cap, "nodes": json.loads(json.dumps(nodes)), "jobs": jl()})
        elif e["reason"] == "EvictedDueToPreempted":
            steps.append({"t": tt, "cap": "Team b's sc-b1 (4 GPUs) arrives. Team b's quota is free on paper but lent out, so Kueue preempts a borrowing workload of team a: <code>" + e["msg"].split("; preemptor path")[0] + "</code>",
                          "nodes": json.loads(json.dumps(nodes)), "jobs": jl()})
        elif e["reason"] == "Killing" and e["obj"].startswith("sc-a3"):
            n = pod_node.get(e["obj"])
            nodes[n] = None
            use["a"] -= 4
            steps.append({"t": tt, "cap": "sc-a3's pod is stopped (<code>Stopping container work</code>); its Workload goes back to the queue: <code>insufficient unused quota for example.com/gpu in flavor default-flavor, 4 more needed</code>.",
                          "nodes": json.loads(json.dumps(nodes)), "jobs": jl()})
        elif e["reason"] == "Completed" and e["obj"] == "sc-b1":
            for k, v in list(nodes.items()):
                if v and v["js"] == "sc-b1":
                    nodes[k] = None
            use["b"] -= 4
            steps.append({"t": tt, "cap": "sc-b1 completes and team b's quota is idle again.", "nodes": json.loads(json.dumps(nodes)), "jobs": jl()})
    return {"steps": steps}


def k2():
    ev = events(os.path.join(K, "k2.events"))
    ev = [e for e in ev if e["obj"] in ("sc-a", "sc-b", "sc-c") or e["obj"].startswith("jobset-sc-") or re.match(r"sc-[abc]-node", e["obj"])]
    ev = [e for e in ev if e["t"] >= t_of("2026-10-16T03:38:00Z")]  # this run only (the events file also holds k1's)
    t0 = min(e["t"] for e in ev)
    pods = {}
    for l in open(os.path.join(K, "k2.pods")):
        p = l.split()
        if p and p[0].startswith("sc-"):
            pods.setdefault(p[1], []).append(NODE[p[4]])
    ranks = [json.loads(l) for l in open(os.path.join(K, "k2_rank0_start_end.jsonl"))]
    end = {r["host"][:4]: r for r in ranks if r["ev"] == "end"}
    first = {r["host"][:4]: r for r in ranks if r["ev"] == "start"}
    tt = lambda e: round(e["t"] - t0)
    get = lambda obj, reason: next(e for e in ev if e["obj"] == obj and e["reason"] == reason)
    wl = {j: next(e["obj"] for e in ev if e["obj"].startswith("jobset-" + j)) for j in ("sc-a", "sc-b", "sc-c")}
    nodes = {"worker": None, "worker2": None, "worker3": None}
    status = {"sc-a": ["suspended: Workload queued in Kueue", "queue"], "sc-b": ["suspended: Workload queued in Kueue", "queue"], "sc-c": ["suspended: Workload queued in Kueue", "queue"]}
    snap = lambda: [[j, v[0], v[1]] for j, v in status.items()]
    steps = [{"t": 0, "cap": "The same three JobSets, created together with a queue label. Kueue's webhook makes each one start <b>suspended</b>: no pods exist yet. Kueue creates one Workload per JobSet (2 pods x 4 fake GPUs = 8 GPUs each).", "nodes": dict(nodes), "jobs": snap()}]
    wb = next(e for e in ev if e["obj"] == wl["sc-b"] and e["reason"] == "WaitingForQuota")
    for j in ("sc-a", "sc-b", "sc-c"):
        adm = get(wl[j], "Admitted")
        for k in nodes:
            if nodes[k] and nodes[k]["js"] != j:
                nodes[k] = None
        for i, n in enumerate(pods[j]):
            nodes[n] = {"js": j, "label": j + " pod " + str(i)}
        for k, v in status.items():
            if v[1] == "run":
                status[k] = ["completed: final global loss %s" % end[k]["gloss"], "done"]
        status[j] = ["admitted whole: 2 of 2 pods running, training", "run"]
        others = [k for k, v in status.items() if v[1] == "queue"]
        for k in others:
            status[k] = ["waiting in Kueue, no pods, no GPUs held", "queue"]
        qr = get(wl[j], "QuotaReserved")["msg"]
        cap = "Kueue reserves quota for <b>%s</b> and admits it (<code>%s</code>); JobSet unsuspends it and both pods are scheduled, on %s." % (j, qr, " and ".join(pods[j]))
        if j == "sc-a":
            cap += " sc-b and sc-c stay suspended: <code>" + wb["msg"] + "</code> (12 of quota, 8 in use, 8 wanted)."
        steps.append({"t": tt(adm), "cap": cap, "nodes": json.loads(json.dumps(nodes)), "jobs": snap()})
    status["sc-c"] = ["completed: final global loss %s" % end["sc-c"]["gloss"], "done"]
    steps.append({"t": round(end["sc-c"]["ts"] - t0), "cap": "sc-c finishes. Every job ran whole, one after the other, and all three reached the same final global loss as the running example on Slurm and Ray (%s). Nothing was ever half-allocated." % end["sc-c"]["gloss"],
                  "nodes": {k: (dict(v, idle=True) if v else None) for k, v in nodes.items()}, "jobs": snap()})
    return {"steps": steps, "init_s": [first[j]["init_s"] for j in ("sc-a", "sc-b", "sc-c")], "wait": [get(wl[j], "QuotaReserved")["msg"] for j in ("sc-a", "sc-b", "sc-c")]}


def ray():
    rows = []
    for l in open(os.path.join(RY, "ray_pg.jsonl")):
        if not l.startswith("{"):
            continue
        d = json.loads(l)
        if d["ev"] != "pg":
            continue
        free = d["available"].get("fake_gpu", 0)
        note = d.get("note") or ""
        if d["name"] == "sc-gang-b" and not d["ready"]:
            note = "while sc-gang-a holds 3: %g fake GPU still free, B holds none" % free
        rows.append({"name": d["name"], "strategy": d["strategy"], "n": len(d["bundles"]), "ready": d["ready"],
                     "state": d["state"], "nodes": d["nodes"], "note": note, "t": d["t"]})
    return rows


def main():
    out = {"k1": k1(), "k3": k3()}
    if os.path.exists(os.path.join(K, "k2.events")):
        out["k2"] = k2()
    if os.path.exists(os.path.join(RY, "ray_pg.jsonl")):
        out["ray"] = ray()
    json.dump(out, open(os.path.join(HERE, "..", "runs", "extra.json"), "w"), indent=1)
    for k, v in out.items():
        print(k, len(v["steps"]) if isinstance(v, dict) and "steps" in v else len(v))


if __name__ == "__main__":
    main()
