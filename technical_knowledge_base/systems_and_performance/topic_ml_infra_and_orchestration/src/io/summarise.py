#!/usr/bin/env python3
"""Storage lab: turn the raw measurement files into the small JSON the page embeds (out/io_data.json).

usage: python3 summarise.py RAW_DIR   (RAW_DIR holds the *.jsonl written by run_tiers.sh, dist_ckpt.py and data_read.py)
Medians over repetitions; MB = 1e6 bytes. Also copies the raw files (they are small and hold no paths) to out/raw/.
"""
import json, os, shutil, statistics, sys

raw = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "out"); os.makedirs(os.path.join(out, "raw"), exist_ok=True)


def jl(name):
    p = os.path.join(raw, name)
    if not os.path.exists(p): return []
    shutil.copy(p, os.path.join(out, "raw", name))
    return [json.loads(l) for l in open(p) if l.startswith("{")]


med = lambda xs: statistics.median(xs) if xs else None
D = {"anatomy": json.load(open(os.path.join(out, "anatomy.json")))}

tiers = {}
for lab in ["host_ssd", "ctr_layer", "ctr_volume", "ctr_hostdir", "ctr_s3", "host_s3"]:
    rows = jl(lab + ".jsonl")
    for sz in ["ex", "m", "l"]:
        rs = [r for r in rows if r["size"] == sz]
        if not rs: continue
        w = med([r["write_s"] for r in rs]); rd = med([r["read_s"] for r in rs]); b = rs[0]["bytes"]
        tiers.setdefault(lab, {})[sz] = {"bytes": b, "params": rs[0]["params"], "n": len(rs),
                                        "write_s": round(w, 5), "read_s": round(rd, 5),
                                        "write_min": round(min(r["write_s"] for r in rs), 5), "write_max": round(max(r["write_s"] for r in rs), 5),
                                        "read_min": round(min(r["read_s"] for r in rs), 5), "read_max": round(max(r["read_s"] for r in rs), 5),
                                        "write_MBps": round(b / w / 1e6, 1), "read_MBps": round(b / rd / 1e6, 1)}
D["tiers"] = tiers

lay = jl("layouts.jsonl")
L = {}
for name in ["ddp_rank0", "ddp_every", "fsdp_full", "fsdp_dcp", "ddp_dcp"]:
    rs = [r for r in lay if r.get("layout") == name]
    if not rs: continue
    L[name] = {"n": len(rs), "params": rs[0]["params"], "world": rs[0]["world"], "wall_s": round(med([r["wall_s"] for r in rs]), 4),
               "wall_all": [r["wall_s"] for r in rs],
               "rank_s": [round(med([r["rank_s"][k] for r in rs]), 4) for k in range(rs[0]["world"])],
               "gather_s": [round(med([r["gather_s"][k] for r in rs]), 4) for k in range(rs[0]["world"])],
               "files": rs[0]["files"], "total_bytes": sum(rs[0]["files"].values())}
D["layouts"] = L

tr = {}
for mode in ["none", "sync", "async"]:
    rs = [r for r in jl(f"train_{mode}.jsonl") if r.get("mode") == "train"]
    if rs:
        r = rs[0]
        tr[mode] = {"every": r["every"], "steps": [[s["step"], s["wall_s"], s["ckpt_block_s"]] for s in r["steps"]],
                    "files": r["files"], "loss_last": r["steps"][-1]["loss"],
                    "total_s": round(sum(s["wall_s"] for s in r["steps"]), 3)}
D["train"] = tr

# the same experiments inside one container, writing to a slow shared host folder and to a Docker volume
for tgt in ["bind", "vol"]:
    rows = jl(f"slow_{tgt}.jsonl")
    lay = {}
    for name in ["ddp_rank0", "ddp_every", "fsdp_full", "fsdp_dcp", "ddp_dcp"]:
        rs = [r for r in rows if r.get("layout") == name]
        if rs: lay[name] = {"wall_s": round(med([r["wall_s"] for r in rs]), 4), "wall_all": [r["wall_s"] for r in rs],
                            "rank_s": [round(med([r["rank_s"][k] for r in rs]), 4) for k in range(rs[0]["world"])],
                            "gather_s": [round(med([r["gather_s"][k] for r in rs]), 4) for k in range(rs[0]["world"])],
                            "total_bytes": sum(rs[0]["files"].values()), "nfiles": len(rs[0]["files"]), "params": rs[0]["params"]}
    trn = {}
    for r in [r for r in rows if r.get("mode") == "train"]:
        trn[r["ckpt"]] = {"every": r["every"], "steps": [[s["step"], s["wall_s"], s["ckpt_block_s"]] for s in r["steps"]],
                          "loss_last": r["steps"][-1]["loss"], "total_s": round(sum(s["wall_s"] for s in r["steps"]), 3),
                          "files": r["files"]}
    D[f"slow_{tgt}"] = {"layouts": lay, "train": trn}

rs = [r for r in jl("reshard.jsonl") if r.get("mode") == "reshard"]
D["reshard"] = rs
errs = os.path.join(out, "errors.json")
D["errors"] = json.load(open(errs)) if os.path.exists(errs) else {}

dr = jl("data_read.jsonl")
D["data_write"] = [r for r in dr if r["test"] == "write"]
ra = {}
for r in [r for r in dr if r["test"] == "read_all"]:
    ra.setdefault(f'{r["layout"]}|{r["store"]}|{r["threads"]}', []).append(r)
D["read_all"] = {k: {"s": round(med([x["s"] for x in v]), 4), "MBps": round(med([x["MBps"] for x in v]), 1),
                     "files": v[0]["files"], "bytes": v[0]["bytes"], "n": len(v)} for k, v in ra.items()}
pf = {}
for r in [r for r in dr if r["test"] == "prefetch"]:
    pf.setdefault(f'{r["store"]}|{r["mode"]}', []).append(r)
D["prefetch"] = {k: {"total_s": round(med([x["total_s"] for x in v]), 3), "stall_s": round(med([x["stall_s"] for x in v]), 3),
                     "step_ms": v[0]["step_ms"], "steps": v[0]["steps"],
                     "wait_ms": [round(med([x["wait_ms_per_step"][i] for x in v]), 1) for i in range(v[0]["steps"])]} for k, v in pf.items()}
# the running example's own checkpoint writes in the setup's recorded runs (train.py, rank 0, no fsync)
cl = {}
for sysname, where in [("slurm", "Docker volume at /shared"), ("k8s", "host folder at /shared (hostPath)"), ("ray", "Docker volume at /shared")]:
    p = os.path.join(here, "..", "data", "runs", sysname, "rank0.jsonl")
    ev = [json.loads(l) for l in open(p) if '"ckpt"' in l]
    cl[sysname] = {"where": where, "secs": [e["secs"] for e in ev], "bytes": ev[0]["bytes"], "median_s": med([e["secs"] for e in ev])}
D["clusters"] = cl
json.dump(D, open(os.path.join(out, "io_data.json"), "w"), separators=(",", ":"))
print(json.dumps({k: (list(v) if isinstance(v, dict) else len(v)) for k, v in D.items()}))
