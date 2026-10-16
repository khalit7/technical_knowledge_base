"""Recorded runs + inputs -> ../oc_data.json and ../parts/15_js_oc_data.js (window.OC). Stdlib only.
Run from anywhere: python3 make_data.py
"""
import json, os, re

H = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(H); RUNS = os.path.join(SRC, "runs")
ROOT_COST = os.path.join(SRC, "..", "..", "src", "cost", "out", "co_data.json")
J = lambda p: json.load(open(os.path.join(RUNS, p)))


def marks(p):
    out = []
    for l in open(os.path.join(RUNS, p)):
        t, run, what = l.split(" ", 2)
        out.append([float(t), run, what.strip()])
    return out


def podlab(pod):
    m = re.match(r"oc-(\w+)-node-0-(\d)-", pod)
    return (m.group(1), int(m.group(2))) if m else (pod, 0)


def window(prom, t_from, t_to):
    """Cut a scenario out of a recording: indexes and seconds relative to t_from."""
    t0, st = prom["t0"], prom["step"]
    i0 = max(0, int((t_from - t0) // st)); i1 = min(prom["n"] - 1, int((t_to - t0) // st) + 1)
    return i0, i1


def cut(v, i0, i1):
    return v[i0:i1 + 1]


def intervals(prom, i0, i1, keep):
    """ALERTS series -> [alertname, subject, state, from_s, to_s] relative to i0."""
    st = prom["step"]; out = []
    for s in prom["series"]["alerts"]:
        L = s["labels"]; v = cut(s["v"], i0, i1)
        subj = L.get("run") or (("pod " + str(podlab(L["pod"])[1])) if "pod" in L else "")
        if not keep(L):
            continue
        j = 0
        while j < len(v):
            if v[j] is None:
                j += 1; continue
            k = j
            while k + 1 < len(v) and v[k + 1] is not None:
                k += 1
            out.append([L["alertname"], subj, L["alertstate"], j * st, (k + 1) * st]); j = k + 1
    return sorted(out, key=lambda x: (x[3], x[0]))


def scenario_k8s(prom, mk, name, runs, title):
    sub = [m[0] for m in mk if m[1] in runs and m[2] == "submitted"]
    end = [m[0] for m in mk if m[1] in runs and m[2].startswith("terminal")]
    t_from, t_to = min(sub) - 10, max(end) + 15
    i0, i1 = window(prom, t_from, t_to); base = prom["t0"] + i0 * prom["step"]
    S = prom["series"]; o = {"id": name, "title": title, "sys": "k8s", "step": prom["step"], "n": i1 - i0 + 1, "s": {}}
    o["s"]["sps"] = {s["labels"]["run"]: cut(s["v"], i0, i1) for s in S["steps_per_s"] if s["labels"].get("run") in runs}
    o["s"]["since"] = {s["labels"]["run"]: cut(s["v"], i0, i1) for s in S["since_step"] if s["labels"].get("run") in runs}
    o["s"]["cpu"] = {}; o["s"]["thr"] = {}; o["s"]["mem"] = {}
    for key, src in (("cpu", "pod_cpu"), ("thr", "pod_throttled"), ("mem", "pod_mem_mb")):
        for s in S[src]:
            r, i = podlab(s["labels"].get("pod", ""))
            if "oc-" + r in runs:
                lab = ("pod " + str(i)) if len(runs) == 1 else (r + " pod " + str(i))
                o["s"][key][lab] = cut(s["v"], i0, i1)
    def kv(series, res):
        for s in S[series]:
            if s["labels"].get("resource") == res:
                return cut(s["v"], i0, i1)
    o["s"]["kq_gpu"] = kv("kueue_usage", "example.com/gpu"); o["s"]["kq_gpu_quota"] = kv("kueue_quota", "example.com/gpu")
    o["s"]["kq_mem"] = kv("kueue_usage", "memory"); o["s"]["kq_mem_quota"] = kv("kueue_quota", "memory")
    o["s"]["kq_wl"] = {s["labels"]["state"]: cut(s["v"], i0, i1) for s in S["kueue_wl"]}
    o["alerts"] = intervals(prom, i0, i1, lambda L: (L.get("run") in runs) or ("pod" in L and "oc-" + podlab(L["pod"])[0] in runs) or ("run" not in L and "pod" not in L and not L["alertname"].startswith("Slurm")))
    o["marks"] = [[round(m[0] - base, 1), m[1], m[2]] for m in mk if m[1] in runs]
    return o


def scenario_slurm(prom, mk):
    t_from, t_to = mk[0][0] - 10, mk[-1][0] + 10
    i0, i1 = window(prom, t_from, t_to); base = prom["t0"] + i0 * prom["step"]; S = prom["series"]
    o = {"id": "slurm", "title": "Slurm: a 4-GPU job waits with 4 GPUs free", "sys": "slurm", "step": prom["step"], "n": i1 - i0 + 1, "s": {}}
    o["s"]["sps"] = {s["labels"]["run"]: cut(s["v"], i0, i1) for s in S["steps_per_s"] if s["labels"].get("run") == "oc-sa"}
    o["s"]["gpu_alloc"] = [s for s in S["slurm_gpu"] if s["labels"]["state"] == "alloc"][0]["v"][i0:i1 + 1]
    o["s"]["gpu_total"] = [s for s in S["slurm_gpu"] if s["labels"]["state"] == "total"][0]["v"][i0:i1 + 1]
    o["s"]["jobs"] = {s["labels"]["state"]: cut(s["v"], i0, i1) for s in S["slurm_jobs"] if s["labels"]["state"] != "completing"}
    o["s"]["node_cpu"] = {s["labels"]["node"]: cut(s["v"], i0, i1) for s in S["slurm_node_cpu"]}
    o["alerts"] = intervals(prom, i0, i1, lambda L: L["alertname"].startswith("Slurm"))
    o["marks"] = [[round(m[0] - base, 1), m[1], m[2]] for m in mk]
    return o


def sacct():
    rows = []
    lines = open(os.path.join(RUNS, "slurm", "sacct.txt")).read().strip().splitlines()
    hdr = lines[0].split("|")
    for l in lines[1:]:
        r = dict(zip(hdr, l.split("|")))
        tres = dict(kv.split("=") for kv in r["AllocTRES"].split(","))
        rows.append({"id": r["JobID"], "user": r["User"], "acct": r["Account"], "name": r["JobName"], "submit": r["Submit"],
                     "start": r["Start"], "end": r["End"], "el": int(r["ElapsedRaw"]), "gpu": int(tres["gres/gpu"]),
                     "cpu": int(tres["cpu"]), "billing": float(tres["billing"])})
    return rows


def kueue_waits():
    out = []
    for q in ("oc-q1", "oc-q2", "oc-q3"):
        for l in open(os.path.join(RUNS, "kind", q, "events.txt")):
            m = re.search(r"Workload\s+(jobset-(oc-q\d)-\S+)\s+(\w+)\s+(.*)$", l)
            if m and m.group(2) == q:
                out.append([q, m.group(3), m.group(4).strip()])
    seen, res = set(), []
    for x in out:
        if tuple(x) not in seen:
            seen.add(tuple(x)); res.append(x)
    return res


def goodput(run):
    """Badput accounting of one recorded kind run from Kueue's Workload times and rank 0's log (seconds)."""
    import datetime
    L = [json.loads(l) for l in open(os.path.join(RUNS, "kind", run, "rank0.jsonl"))]
    w = [i for i in json.load(open(os.path.join(RUNS, "kind", run, "workloads.json")))["items"] if run in i["metadata"]["name"]][0]
    ts = lambda s: datetime.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).timestamp()
    c = {x["type"]: ts(x["lastTransitionTime"]) for x in w["status"]["conditions"]}
    adm, fin = c["Admitted"], c["Finished"]
    start = [x["ts"] for x in L if x["ev"] == "start"][0]
    steps = [x for x in L if x["ev"] == "step"]
    ck = [x for x in L if x["ev"] == "ckpt"]
    last_ck = ck[-1]["ts"] if ck else steps[0]["ts"]
    ended = any(x["ev"] == "end" for x in L)
    first, last = steps[0]["ts"], steps[-1]["ts"]
    saved = (last_ck if not ended else last) - first
    o = {"run": run, "alloc_s": fin - adm, "startup_s": first - adm, "saved_s": saved,
         "wasted_s": 0 if ended else last - last_ck, "after_s": fin - last, "last_ckpt_step": ck[-1]["step"] if ck else 0,
         "last_step": steps[-1]["step"], "ended": ended}
    o["rg"] = o["saved_s"] / o["alloc_s"]
    return {k: (round(v, 2) if isinstance(v, float) else v) for k, v in o.items()}


def main():
    pk, ps = J("prom/prom_kind.json"), J("prom/prom_slurm.json")
    mk, ms = marks("kind/marks.txt"), marks("slurm/marks.txt")
    D = {"note": "Recorded 2026-10-16 on the topic's local clusters (Apple M1 Pro, Docker Desktop VM, shared machine): Prometheus v3.13.4 every 5 s."}
    D["scen"] = [scenario_k8s(pk, mk, "base", ["oc-base"], "Healthy run (reference)"),
                 scenario_k8s(pk, mk, "slow", ["oc-slow"], "A slow node: one pod capped at 0.2 CPU at step 150"),
                 scenario_k8s(pk, mk, "hang", ["oc-hang"], "A hang: rank 3 frozen (SIGSTOP) at step 150"),
                 scenario_k8s(pk, mk, "queue", ["oc-q1", "oc-q2", "oc-q3"], "Three jobs, a quota that fits one"),
                 scenario_slurm(ps, ms)]
    S = pk["series"]
    D["scrape"] = {s["labels"]["job"] + ("/" + s["labels"]["instance"] if s["labels"]["job"] == "cadvisor" else ""):
                   [max(x for x in s["v"] if x is not None),
                    max(x for x in [k for k in S["kept"] if k["labels"] == s["labels"]][0]["v"] if x is not None)] for s in S["scraped"]}
    D["prom"] = {"series_end": ps["series"]["prom_series"][0]["v"][-1], "rss_mb_end": ps["series"]["prom_rss_mb"][0]["v"][-1],
                 "samples_per_s": round(max(x for s in S["prom_samples_per_s"] for x in s["v"] if x is not None), 1),
                 "tsdb_series": ps["tsdb"]["headStats"]["numSeries"]}
    D["kueue_wait"] = {"sum": float(pk["kueue_wait_sum"][0]["value"][1]), "count": int(float(pk["kueue_wait_count"][0]["value"][1]))}
    D["kueue_events"] = kueue_waits()
    D["sacct"] = sacct()
    D["gp"] = [goodput("oc-base"), goodput("oc-hang")]
    D["mfu"] = [json.loads(l) for l in open(os.path.join(RUNS, "mfu.jsonl"))]
    D["prices"] = [p for p in json.load(open(ROOT_COST))["prices"]]
    inp = os.path.join(SRC, "inputs", "page_inputs.json")
    if os.path.exists(inp):
        D.update(json.load(open(inp)))
    json.dump(D, open(os.path.join(SRC, "oc_data.json"), "w"), indent=0, separators=(",", ":"))
    with open(os.path.join(SRC, "parts", "15_js_oc_data.js"), "w") as f:
        f.write("// generated by scripts/make_data.py from runs/ and inputs/ (do not edit)\nwindow.OC=" + json.dumps(D, separators=(",", ":")) + ";\n")
    print("scenarios", [(s["id"], s["n"], len(s["alerts"])) for s in D["scen"]], "bytes", os.path.getsize(os.path.join(SRC, "parts", "15_js_oc_data.js")))


if __name__ == "__main__":
    main()
