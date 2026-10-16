#!/usr/bin/env python3
"""Recompute the kube-scheduler's scores for the page's two scoring runs and check them against the
scheduler's own log lines ("Plugin scored node for pod", logged at V(10) in schedule_one.go:984 at v1.37.0).

usage: python3 -I recompute.py   (from src/; writes out/scores.json)

Formulas ported from kubernetes v1.37.0, pkg/scheduler/framework/plugins/noderesources:
  LeastAllocated (least_allocated.go:52-60): per resource ((capacity - requested) * 100) // capacity,
      weighted mean with integer division; requested = node's non-zero requests + the pod's
  MostAllocated (most_allocated.go:54-65): per resource (requested * 100) // capacity
  BalancedAllocation (balanced_allocation.go:204-262): 50 + (50 + score_with_pod - score_without_pod) // 2,
      score = int((1 - std) * 100), std over the requested/allocatable fractions (actual requests, not non-zero)
  An extended resource enters a score only if the scoring strategy lists it AND the pod requests it
      (resource_allocation.go:176-182); the defaults list cpu and memory only (apis/config/v1/defaults.go:33-35).
  Non-zero requests: a container with no cpu or memory request counts as 100m and 200 MiB
      (pkg/scheduler/util/pod_resources.go:28-31).
Plugin weights (apis/config/v1/default_plugins.go:40-52): TaintToleration 3, NodeAffinity 2, NodeResourcesFit 1,
  PodTopologySpread 2, InterPodAffinity 2, NodeResourcesBalancedAllocation 1, ImageLocality 1.
"""
import json, math, os, re

H = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(H, "runs")
POD = {"cpu": 100, "memory": 64 * 1024**2}            # every placeholder pod: 100m, 64Mi (k8s/gpu-pod.sh)
SEQ = [2, 1, 1, 2, 2, 4]                               # fake GPUs per pod, in submission order (scripts/km_e6.sh)
WORKERS = ["mi-kind-worker", "mi-kind-worker2", "mi-kind-worker3"]
PROFILES = {"e6spread": {"type": "LeastAllocated", "res": [("cpu", 1), ("memory", 1)]},
            "e6pack": {"type": "MostAllocated", "res": [("cpu", 1), ("memory", 1), ("example.com/gpu", 5)]}}


def kib(v):
    return int(v[:-2]) * 1024 if v.endswith("Ki") else int(v)


def balanced(req, alloc):
    fr = [min(r / a, 1.0) for r, a in zip(req, alloc) if a]
    std = abs(fr[0] - fr[1]) / 2 if len(fr) == 2 else (math.sqrt(sum((f - sum(fr) / len(fr)) ** 2 for f in fr) / len(fr)) if len(fr) > 2 else 0.0)
    return int((1 - std) * 100)


def parse_log(path):
    sc, bound = {}, {}
    for l in open(path):
        m = re.search(r'"Plugin scored node for pod" pod="km/(\S+)" plugin="(\w+)" node="(\S+)" score=(\d+)', l)
        if m:
            sc.setdefault(m[1], {}).setdefault(m[3], {})[m[2]] = int(m[4])
        m = re.search(r'final score for pod" pod="km/(\S+)" node="(\S+)" score=(\d+)', l)
        if m:
            sc.setdefault(m[1], {}).setdefault(m[2], {})["total"] = int(m[3])
        m = re.search(r'bound pod to node" pod="km/(\S+)" node="(\S+)" evaluatedNodes=(\d+) feasibleNodes=(\d+)', l)
        if m:
            bound[m[1]] = {"node": m[2], "evaluated": int(m[3]), "feasible": int(m[4])}
    return sc, bound


def run(tag, seq=None, recorded=True):
    prof = PROFILES[tag]
    nodes = {n["name"]: n for n in json.load(open(os.path.join(R, tag + ".nodes_before.json")))}
    base = json.load(open(os.path.join(R, tag + ".requests_before.json")))
    logged, bound = parse_log(os.path.join(R, tag + ".schedlog.txt"))
    state = {w: {"nz_cpu": base[w]["nonzero_cpu"] * 1000, "nz_mem": base[w]["nonzero_memory"],
                 "cpu": base[w]["cpu"] * 1000, "mem": base[w]["memory"], "gpu": base[w]["example.com/gpu"]} for w in WORKERS}
    steps, checks = [], {"compared": 0, "matched": 0}
    for i, g in enumerate(seq or SEQ, 1):
        pod = f"km-{tag}-p{i}"
        alloc = {w: {"cpu": int(nodes[w]["allocatable"]["cpu"]) * 1000, "memory": kib(nodes[w]["allocatable"]["memory"]),
                     "gpu": int(nodes[w]["allocatable"]["example.com/gpu"])} for w in WORKERS}
        rows = []
        for w in WORKERS:
            s, a = state[w], alloc[w]
            free = a["gpu"] - s["gpu"]
            fits = free >= g
            row = {"node": w, "gpuUsed": s["gpu"], "gpuFree": free, "fits": fits}
            if fits:
                vals = []
                for name, wt in prof["res"]:
                    if name == "cpu":
                        req, cap = s["nz_cpu"] + POD["cpu"], a["cpu"]
                    elif name == "memory":
                        req, cap = s["nz_mem"] + POD["memory"], a["memory"]
                    else:
                        req, cap = s["gpu"] + g, a["gpu"]
                    v = ((cap - req) * 100) // cap if prof["type"] == "LeastAllocated" else (min(req, cap) * 100) // cap
                    vals.append((int(v), wt, name))
                fit = sum(v * wt for v, wt, _ in vals) // sum(wt for _, wt, _ in vals)
                with_p = balanced([s["cpu"] + POD["cpu"], s["mem"] + POD["memory"]], [a["cpu"], a["memory"]])
                without = balanced([s["cpu"], s["mem"]], [a["cpu"], a["memory"]])
                ba = 50 + (50 + with_p - without) // 2
                row.update(fit=fit, fitParts={n: v for v, _, n in vals}, balanced=ba, taint=300, image=0, total=300 + fit + ba)
                lg = logged.get(pod, {}).get(w)
                if lg:
                    row["logged"] = {"fit": lg.get("NodeResourcesFit"), "balanced": lg.get("NodeResourcesBalancedAllocation"),
                                     "taint": lg.get("TaintToleration"), "image": lg.get("ImageLocality"), "total": lg.get("total")}
                    for k in ("fit", "balanced", "taint", "image", "total"):
                        checks["compared"] += 1
                        checks["matched"] += int(row[k] == row["logged"][k])
            rows.append(row)
        feas = [r for r in rows if r["fits"]]
        best = max((r["total"] for r in feas), default=None)
        ties = [r["node"] for r in feas if r["total"] == best]
        b = bound.get(pod) if recorded else ({"node": ties[0], "feasible": len(feas)} if ties else None)
        steps.append({"pod": pod, "gpus": g, "rows": rows, "bound": b["node"] if b else None,
                      "feasible": b["feasible"] if b else len(feas),
                      "scored": bool(logged.get(pod)), "ties": [r["node"] for r in feas if r["total"] == best]})
        if b:
            n = b["node"]
            state[n]["nz_cpu"] += POD["cpu"]; state[n]["nz_mem"] += POD["memory"]
            state[n]["cpu"] += POD["cpu"]; state[n]["mem"] += POD["memory"]; state[n]["gpu"] += g
    return {"profile": prof, "steps": steps, "checks": checks}


if __name__ == "__main__":
    out = {t: run(t) for t in PROFILES}
    # extra cases for the page's "your own sequence" mode: first tie wins, as the page does
    import random
    rnd = random.Random(1234); cases = []
    for k in range(30):
        seq = [rnd.randint(1, 4) for _ in range(rnd.randint(1, 10))]
        for t in PROFILES:
            r = run(t, seq, recorded=False)
            cases.append({"tag": t, "seq": seq, "bound": [s["bound"] for s in r["steps"]],
                          "totals": [[x.get("total") for x in s["rows"]] for s in r["steps"]]})
    json.dump(cases, open(os.path.join(H, "out", "cases.json"), "w"))
    os.makedirs(os.path.join(H, "out"), exist_ok=True)
    json.dump(out, open(os.path.join(H, "out", "scores.json"), "w"), indent=1)
    for t, r in out.items():
        print(t, r["checks"], [(s["pod"].split("-")[-1], s["gpus"], s["bound"], s["ties"]) for s in r["steps"]])
