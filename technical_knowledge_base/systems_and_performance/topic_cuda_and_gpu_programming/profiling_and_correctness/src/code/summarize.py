"""Collect every recorded output the page shows into out/data.json and parts/22_js_data.js
(window.PCD). Nothing is measured here; medians and spreads of the three timing runs are computed.
Usage: python3 code/summarize.py   (from src/, standard library only)
"""
import json, os, re, statistics, glob

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
OUT = os.path.join(SRC, "out")


def rd(p):
    return json.load(open(os.path.join(OUT, p)))


def r4(x):
    return None if x is None else float("%.4g" % x)


def med3(vals):
    vals = [v for v in vals if v is not None]
    return {"median": r4(statistics.median(vals)), "runs": [r4(v) for v in vals]}


def section_labels():
    """Label -> metric name pairs from NVIDIA's section files (inputs/ncu_sections)."""
    m = {}
    for f in sorted(glob.glob(os.path.join(SRC, "inputs", "ncu_sections", "*.section"))):
        txt = open(f, encoding="utf-8").read()
        for lab, name in re.findall(r'Label:\s*"([^"]+)"\s*\n\s*Name:\s*"([^"]+)"', txt):
            if lab not in m and not name.startswith("breakdown:"):
                m[lab] = name
    return m


def timing():
    runs = [rd("timing_run_%d.json" % i) for i in (1, 2, 3)]
    T = {"torch": runs[0]["torch"], "loads": [[r["load_before"], r["load_after"]] for r in runs],
         "started": [r["started"] for r in runs], "refused_pairs": [r["event_pairs_refused"] for r in runs]}
    a = {}
    for k in ("host_nosync_ms", "host_sync_ms", "event_ms", "host_queued_ms"):
        a[k] = med3([r["async"][k]["median"] for r in runs])
        a[k]["p90"] = [r4(r["async"][k]["p90"]) for r in runs]
        a[k]["max"] = [r4(r["async"][k]["max"]) for r in runs]
    a["n"] = runs[0]["async"]["n"]; a["flops"] = runs[0]["async"]["flops"]
    T["async"] = a
    t = {}
    for k in ("per_op_sync_ms", "batched_ms_per_op", "event_ms"):
        t[k] = med3([r["tiny"][k]["median"] for r in runs])
    T["tiny"] = t
    c = []
    for mb in ("1", "2", "4", "8", "16", "32", "64", "128"):
        row = {"mb": int(mb), "bytes": runs[0]["cache"][mb]["bytes"]}
        for k in ("hot_ms", "cold_ms"):
            row[k] = med3([r["cache"][mb][k]["median"] for r in runs])
        c.append(row)
    T["cache"] = c
    T["dist"] = [{"summary": {k: r4(v) for k, v in r["distribution"]["summary"].items()},
                  "raw": r["distribution"]["raw"]} for r in runs]
    db = {}
    for k in ("sum16MB_flush", "sum16MB_noflush", "mm2048_flush"):
        db[k] = {x: [r4(r["dobench"][k][x]) if isinstance(r["dobench"][k][x], float) else r["dobench"][k][x]
                     for r in runs] for x in ("estimate_ms", "n_warmup", "n_repeat", "min", "median", "mean", "p90", "max", "failed_pairs")}
    db["mm2048_naive_loop_ms"] = [r4(r["dobench"]["mm2048_naive_loop_ms"]) for r in runs]
    T["dobench"] = db
    w = []
    for i in (1, 2, 3):
        for ln in open(os.path.join(OUT, "warmup_run_%d.jsonl" % i)):
            if ln.strip():
                w.append(json.loads(ln))
    T["warmup"] = w
    return T


def profiler():
    p = rd("torch_profiler.json")
    out = {"torch": p["torch"], "activities": p["activities"]}
    for dev in ("cpu", "mps"):
        r = p[dev]
        ev = r["trace"]["events"]
        keep = [e for e in ev if e["dur"] >= 25 or e["name"] in ("forward", "backward", "optimizer")
                or e["name"].startswith(("ProfilerStep", "Optimizer.step"))]
        keep = [{"n": e["name"], "t": e["ts"], "d": e["dur"], "th": e["tid"], "f": e.get("flops")} for e in keep]
        out[dev] = {"wall": r["wall_ms_per_step"], "rows": r["rows"], "table": r["table_self_cpu"],
                    "step": r["trace"]["step"], "step_us": r["trace"]["dur_us"], "events": keep,
                    "events_total_in_step": len(ev), "trace_bytes": r["trace"]["trace_bytes"]}
    return out


KEEP_SECTIONS = ["GPU Speed Of Light Throughput", "Compute Workload Analysis", "Memory Workload Analysis",
                 "Memory Workload Analysis Tables", "Scheduler Statistics", "Warp State Statistics",
                 "Instruction Statistics", "Launch Statistics", "Occupancy", "Source Counters"]


def ncu():
    d = rd("ncu_reports.json")
    reps = []
    for r in d["reports"]:
        secs = []
        for s in r["sections"]:
            if s["name"] not in KEEP_SECTIONS:
                continue
            tabs = []
            for t in s["tables"]:
                rows = [x for x in t["rows"] if not x[0].startswith("Warp Stall Sampling")]  # same stalls as Warp State
                # drop the raw metric dump tables (their rows are metric names already shown elsewhere)
                if rows and "__" in rows[0][0] and len(rows) > 12:
                    continue
                if (t["title"] or "").startswith("Impact of Varying"):
                    continue  # occupancy what-if tables: the parent's GPU simulator covers these
                lim = 10 if t["title"] else 24
                tabs.append({"title": t["title"], "header": t["header"], "rows": [x[:3] for x in rows[:lim]],
                             "cut": len(rows) > lim})
            secs.append({"name": s["name"], "tables": tabs, "rules": s["rules"]})
        reps.append({"stem": r["stem"], "sample": r["sample"], "label": r["label"], "role": r["role"],
                     "kernel": r["kernel"], "session": r["session"], "raw": r["raw"], "sections": secs})
    shown = set()
    for r in reps:
        for sct in r["sections"]:
            for t in sct["tables"]:
                for row in t["rows"]:
                    shown.add(row[0])
    labels = {k: v for k, v in section_labels().items() if k in shown}
    return {"tool": d["tool"], "reports": reps, "labels": labels, "sets": sets()}


def sets():
    """ncu --list-sets: identifier, sections, estimated metric count (the table wraps long cells)."""
    lines = open(os.path.join(OUT, "ncu", "list_sets.txt")).read().split("\n")
    out, cur = [], None
    for ln in lines[3:]:
        if not ln.strip() or ln.startswith("---"):
            continue
        ident, secs, rest = ln[:10].strip(), ln[11:86], ln[86:].split()
        if ident:
            cur = {"id": ident, "sections": secs.strip(), "metrics": int(rest[-1])}
            out.append(cur)
        else:
            cur["sections"] += secs.strip()
    for c in out:
        c["sections"] = [x.strip() for x in c["sections"].split(",") if x.strip()]
    return out


def main():
    data = {"timing": timing(), "profiler": profiler(), "ncu": ncu(),
            "numerics": rd("numerics.json"), "atomics": rd("atomics.json")}
    a = data["atomics"]
    for k in a["kernels"].values():
        k["values"] = [r4(v) for v in k["values"]]
    json.dump(data, open(os.path.join(OUT, "data.json"), "w"), indent=0, sort_keys=True)
    js = "// generated by code/summarize.py from out/*.json; do not edit\nwindow.PCD=" + \
         json.dumps(data, separators=(",", ":"), sort_keys=True) + ";\n"
    open(os.path.join(SRC, "parts", "22_js_data.js"), "w").write(js)
    print("parts/22_js_data.js", len(js), "bytes;",
          {k: len(json.dumps(v)) for k, v in data.items()})


if __name__ == "__main__":
    main()
