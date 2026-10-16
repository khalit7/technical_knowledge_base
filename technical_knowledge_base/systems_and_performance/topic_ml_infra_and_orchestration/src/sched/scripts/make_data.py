"""Build parts/31_js_sc_0data.js (window.SC_DATA) from the recorded runs in src/sched/runs/ (run: python3 -I make_data.py).
Every number the Scheduling lab draws comes from here; check_data.mjs confirms the page embeds exactly this."""
import json, os, re, sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = os.path.join(HERE, "..", "runs")
OUT = os.path.join(HERE, "..", "..", "parts", "31_js_sc_0data.js")


def ts(s):
    return datetime.fromisoformat(s).timestamp()


def sacct(path):
    rows = [l.rstrip("\n").split("|") for l in open(path) if l.strip()]
    head = rows[0]
    return [dict(zip(head, r)) for r in rows[1:]]


def expand(idx):
    """'0-1,3' -> [0, 1, 3]"""
    out = []
    for part in idx.split(","):
        if "-" in part:
            a, b = part.split("-")
            out += list(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out


def nodelist(s):
    """'c[1-3]' -> ['c1', 'c2', 'c3']; 'c1' -> ['c1']"""
    m = re.match(r"([a-z]+)\[([\d,\-]+)\]$", s)
    return ["%s%d" % (m.group(1), i) for i in expand(m.group(2))] if m else [s]


def alloc(path):
    """job id -> [[node, [gpu indices]], ...] from the scontrol -d poll (the last sighting of each job/node wins)."""
    a = {}
    for l in open(path):
        m = re.match(r"\S+ (\d+) JobName=(\S+) Nodes=(\S+) GRES=gpu:\d+\(IDX:([\d,\-]+)\)", l.strip())
        if not m:
            continue
        jid, _, node, idx = m.groups()
        for n in nodelist(node):
            a.setdefault(jid, {})[n] = expand(idx)
    return {j: [[n, v[n]] for n in sorted(v)] for j, v in a.items()}


def slurm_run(sacct_path, al, names, t0=None):
    rows = [r for r in sacct(sacct_path) if r["JobName"] in names]
    if t0 is None:
        t0 = min(ts(r["Submit"]) for r in rows)
    out = []
    for r in rows:
        gpus = int(re.search(r"gres/gpu=(\d+)", r["AllocTRES"]).group(1)) if "gres/gpu=" in r["AllocTRES"] else 0
        out.append({"id": r["JobID"], "name": r["JobName"], "user": r["User"], "part": r["Partition"], "g": gpus,
                    "lim": r["Timelimit"], "sub": round(ts(r["Submit"]) - t0), "st": round(ts(r["Start"]) - t0) if r["Start"] != "Unknown" else None,
                    "en": round(ts(r["End"]) - t0) if r["End"] != "Unknown" else None, "state": r["State"], "nodes": r["NodeList"],
                    "alloc": al.get(r["JobID"].split("_")[0], [])})
    return out, t0


def main():
    D = {}
    S = os.path.join(RUNS, "slurm")
    al = alloc(os.path.join(S, "alloc.log"))
    W1 = [("A", 4, 6), ("B", 6, 4), ("C", 2, 3), ("D", 1, 2), ("E", 4, 5), ("F", 2, 7), ("G", 1, 1), ("H", 3, 2)]
    D["w1"] = {"jobs": [{"n": n, "g": g, "lim": r} for (n, g, r) in W1]}
    for mode in ("fifo", "backfill"):
        names = ["sc-%s-%s" % (mode, n) for (n, _, _) in W1]
        rows, _ = slurm_run(os.path.join(S, "w1_%s.sacct" % mode), al, names)
        by = {r["name"]: r for r in rows}
        D["w1"][mode] = [{"n": n, "g": g, "order": i, "st": by["sc-%s-%s" % (mode, n)]["st"], "en": by["sc-%s-%s" % (mode, n)]["en"],
                          "alloc": by["sc-%s-%s" % (mode, n)]["alloc"]} for i, (n, g, _) in enumerate(W1)]
    if os.path.exists(os.path.join(S, "w2.sacct")):
        rows, _ = slurm_run(os.path.join(S, "w2.sacct"), al, [r["JobName"] for r in sacct(os.path.join(S, "w2.sacct"))])
        D["w2"] = [{k: r[k] for k in ("name", "user", "g", "sub", "st", "en", "alloc")} for r in rows]
    if os.path.exists(os.path.join(S, "w3.sacct")):
        rows = sacct(os.path.join(S, "w3.sacct"))
        t0 = min(ts(r["Submit"]) for r in rows)
        D["w3"] = [{"id": r["JobID"], "name": r["JobName"], "user": r["User"], "part": r["Partition"],
                    "sub": round(ts(r["Submit"]) - t0), "st": round(ts(r["Start"]) - t0) if r["Start"] not in ("Unknown", "None") else None,
                    "en": round(ts(r["End"]) - t0) if r["End"] not in ("Unknown", "None") else None, "state": r["State"], "nodes": r["NodeList"]}
                   for r in rows]
    if "w3" in D:  # bars for the preemption Gantt: the first run of the big job (killed), the urgent job, the rerun
        big = [r for r in D["w3"] if r["name"] == "sc-pre-big"]
        urg = [r for r in D["w3"] if r["name"] == "sc-pre-urg"][0]
        D["w3al"] = [{"label": "bob, run 1 (requeued)", "user": "bob", "st": big[0]["st"], "en": big[0]["en"], "sub": big[0]["sub"], "killed": True, "alloc": al.get(big[0]["id"], [])},
                     {"label": "urgent", "user": "alice", "st": urg["st"], "en": urg["en"], "sub": urg["sub"], "alloc": al.get(urg["id"], [])},
                     {"label": "bob, run 2", "user": "bob", "st": big[1]["st"], "en": big[1]["en"], "sub": big[1]["sub"], "alloc": al.get(big[1]["id"], [])}]
    extra = os.path.join(RUNS, "extra.json")  # Kubernetes and Ray results, written by parse_k8s_ray.py
    if os.path.exists(extra):
        D.update(json.load(open(extra)))
    js = "// ---- Scheduling lab: recorded data (generated by src/sched/scripts/make_data.py from src/sched/runs/; do not edit) ----\nwindow.SC_DATA=" + json.dumps(D, separators=(",", ":"), sort_keys=True) + ";\n"
    open(OUT, "w").write(js)
    json.dump(D, open(os.path.join(HERE, "..", "out", "sc_data.json"), "w"), indent=1, sort_keys=True)
    print("wrote", OUT, len(js), "bytes")


if __name__ == "__main__":
    main()
