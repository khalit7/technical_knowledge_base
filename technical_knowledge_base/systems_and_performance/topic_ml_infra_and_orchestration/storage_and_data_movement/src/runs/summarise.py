#!/usr/bin/env python3
"""Raw run records (out/raw/) -> out/sd_data.json (what the page embeds) -> ../parts/22_js_sd_data.js.
usage: python3 -I summarise.py   (from anywhere)"""
import json, os, re, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "out", "raw")
med = lambda xs: round(st.median(xs), 4)


def jl(name):
    p = os.path.join(RAW, name)
    return [json.loads(l) for l in open(p) if l.strip().startswith("{")] if os.path.exists(p) else []


D = {"measured_on": "Apple M1 Pro, Docker Desktop VM (5 CPUs, 9.7 GiB), shared machine, 2026-10-16"}

# ---- toy parallel file system ----
rows = jl("tpfs_stripe.jsonl"); MB = 1e6
stripe = {}
for c in sorted({r["count"] for r in rows}):
    rr = [r for r in rows if r["count"] == c]; b = rr[0]["bytes"]
    stripe[c] = {"bytes": b, "n": len(rr), "write_s": med([r["write_s"] for r in rr]), "read_s": med([r["read_s"] for r in rr]),
                 "write_all": [r["write_s"] for r in rr], "read_all": [r["read_s"] for r in rr]}
    stripe[c]["write_MBps"] = round(b / stripe[c]["write_s"] / MB, 1); stripe[c]["read_MBps"] = round(b / stripe[c]["read_s"] / MB, 1)
    stripe[c]["layouts"] = [[o["ost"] for o in r["layout"]["objects"]] for r in rr]
r64 = jl("tpfs_stripe64k.jsonl")
s64 = {"bytes": r64[0]["bytes"], "write_s": med([r["write_s"] for r in r64]), "read_s": med([r["read_s"] for r in r64])}
s64["write_MBps"] = round(s64["bytes"] / s64["write_s"] / MB, 1); s64["read_MBps"] = round(s64["bytes"] / s64["read_s"] / MB, 1)
nproc = {}
for r in jl("tpfs_nproc.jsonl"):
    nproc.setdefault(r["mode"], []).append(r)
NP = {}
for m, rr in nproc.items():
    span = med([r["span_s"] for r in rr]); b = rr[0]["bytes"]
    NP[m] = {"procs": rr[0]["procs"], "bytes": b, "span_s": span, "span_all": [r["span_s"] for r in rr], "MBps": round(b / span / MB, 1),
             "osts_used": [r["osts_used"] for r in rr]}
meta_toy = {}
for r in jl("tpfs_meta1.jsonl") + jl("tpfs_meta2.jsonl"):
    meta_toy.setdefault("%d_%d" % (r["mds"], r["procs"]), []).append(r["ops_per_s"])
for r in jl("tpfs_meta_cpu.jsonl"):
    meta_toy.setdefault("cpu_%d_%d" % (r["mds"], r["procs"]), []).append(r["ops_per_s"])
MT = {}
for k, v in meta_toy.items():
    mds, P = [int(x) for x in k.replace("cpu_", "").split("_")]
    MT[k] = {"mds": mds, "procs": P, "ops_per_s": med(v), "all": v, "lat_ms": round(1000 * P / st.median(v), 2), "rerun": k.startswith("cpu_")}
cpu = {}
for P in (4, 16, 32):
    p = os.path.join(RAW, "tpfs_cpu_P%d.txt" % P)
    if not os.path.exists(p): continue
    vals = {"sd-mds0": [], "sd-cli": []}
    for line in open(p):
        _, name, pc = line.split(); vals[name].append(float(pc.rstrip("%")))
    cpu[P] = {"mds_cpu_pct": med([x for x in vals["sd-mds0"] if x > 1]), "cli_cpu_pct": med([x for x in vals["sd-cli"] if x > 1]),
              "mds_cap_pct": 50, "cli_cap_pct": 200}
D["tpfs"] = {"ost_mbps_cap": 25, "stripe": stripe, "stripe64k": s64, "nproc": NP, "meta": MT, "cpu": cpu,
             "caps": "4 object servers (0.5 CPU, 256 MB, 25 MB/s token bucket each), metadata servers 0.5 CPU and 256 MB each, client 2 CPUs and 768 MB"}

# ---- real stores: metadata storm ----
MR = {}
for f in ("meta_volume.jsonl", "meta_hostdir.jsonl", "meta_s3.jsonl"):
    for r in jl(f):
        e = MR.setdefault(r["label"], {}).setdefault(str(r["procs"]), {"files_per_proc": r["files_per_proc"], "runs": []})
        e["runs"].append(r["ops_per_s"])
for lab, byp in MR.items():
    for P, e in byp.items():
        e["ops_per_s"] = {ph: med([x[ph] for x in e["runs"]]) for ph in ("create", "stat", "miss", "unlink")}
        e["n"] = len(e["runs"]); del e["runs"]
D["meta_real"] = MR

# ---- import storm (strace -c) ----
imp = {}
p = os.path.join(RAW, "import_strace.txt")
if os.path.exists(p):
    cur = None
    for line in open(p):
        m = re.match(r"### (.*) \| rep (\d)", line)
        if m: cur = imp.setdefault(m.group(1), {"reps": []}); cur["reps"].append({"calls": {}, "errors": {}}); continue
        m = re.match(r"wall ([\d.]+) s", line)
        if m and cur: cur["reps"][-1]["wall_s"] = float(m.group(1)); continue
        parts = line.split()
        if cur and len(parts) >= 5 and re.match(r"^[\d.]+$", parts[0]) and parts[-1] not in ("total",):
            # % time, seconds, usecs/call, calls, [errors], syscall
            name = parts[-1]; calls = int(parts[3]); errs = int(parts[4]) if len(parts) == 6 else 0
            cur["reps"][-1]["calls"][name] = calls; cur["reps"][-1]["errors"][name] = errs
    for k, v in imp.items():
        r0 = v["reps"]
        v["total_calls"] = med([sum(x["calls"].values()) for x in r0]); v["total_errors"] = med([sum(x["errors"].values()) for x in r0])
        names = sorted({n for x in r0 for n in x["calls"]})
        v["by_call"] = {n: {"calls": med([x["calls"].get(n, 0) for x in r0]), "errors": med([x["errors"].get(n, 0) for x in r0])} for n in names}
        v["wall_s"] = med([x["wall_s"] for x in r0 if "wall_s" in x]) if any("wall_s" in x for x in r0) else None
        del v["reps"]
D["import"] = imp

# ---- SeaweedFS ----
cm = jl("sw_chunkmap.jsonl")
if cm:
    c = cm[0]; D["chunkmap"] = {"bytes": c["bytes"], "n_chunks": c["n_chunks"], "chunks": [[x["offset"], x["size"], x["volume"], x["servers"][0].split(":")[0]] for x in c["chunks"]]}
sem = jl("sw_semantics.jsonl"); D["semantics"] = sem[0] if sem else None
up = {}
for r in jl("sw_multipart.jsonl"):
    k = "%s_%s_%s" % (r["exp"], r.get("part_mib", r.get("range_mib")), r["conc"]); up.setdefault(k, []).append(r["s"])
D["multipart"] = {k: {"s": med(v), "all": v, "MBps": round(268435456 / st.median(v) / MB, 1)} for k, v in up.items()}
try1 = jl("sw_multipart_try1.jsonl")
D["multipart_try1"] = {"uploads_before_error": len(try1), "error": open(os.path.join(RAW, "sw_multipart_try1_error.txt")).read().strip() if os.path.exists(os.path.join(RAW, "sw_multipart_try1_error.txt")) else None}
ls = jl("sw_list.jsonl")
if ls: D["list"] = {"keys": ls[0]["keys"], "requests": ls[0]["requests"], "s": med([r["s"] for r in ls]), "max_keys": ls[0].get("max_keys_default")}
rg = jl("sw_range.jsonl")
if rg:
    g = rg[0]; R = g["reps"]
    D["range"] = {"file_bytes": g["file_bytes"], "tensor": g["tensor"], "header_len": g["header_len"], "shape": g["shape"], "dtype": g["dtype"], "data_offsets": g["data_offsets"],
                  "range_s": med([x["range_s"] for x in R]), "range_requests": R[0]["range_requests"], "range_bytes": R[0]["range_bytes"],
                  "full_s": med([x["full_s"] for x in R]), "full_bytes": R[0]["full_bytes"], "n": len(R)}

# ---- checkpoint formats ----
fs = jl("fmt_save.jsonl")
for r in fs:
    if r["mode"] == "dcp_meta":
        keep = {"model.tok.weight", "model.blocks.0.qkv.weight", "model.blocks.0.ln1.weight", "optim.state.blocks.0.qkv.weight.exp_avg", "optim.state.blocks.0.qkv.weight.step"}
        T = r["tensors"]
        kinds = {"model": 0, "optim_moments": 0, "optim_step": 0, "other": 0}
        for t in T:
            f = t["fqn"]
            if f.startswith("model."): kinds["model"] += 1
            elif f.endswith(".exp_avg") or f.endswith(".exp_avg_sq"): kinds["optim_moments"] += 1
            elif f.endswith(".step"): kinds["optim_step"] += 1
            else: kinds["other"] += 1
        D["dcp"] = {"params": r["params"], "save_s": r["save_s"], "files": r["files"], "n_entries": r["n_entries"], "n_chunks": r["n_chunks"],
                    "n_storage_items": r["n_storage_items"], "kinds": kinds, "sample": [t for t in T if t["fqn"] in keep]}
    elif r["mode"] == "safetensors":
        D["safetensors"] = {k: r[k] for k in ("file_bytes", "header_len", "n_tensors", "header_sample", "total_tensor_bytes", "shards", "index_sample")}
    elif r["mode"] == "dcp_hf":
        D["dcp_hf"] = {k: r[k] for k in r if k in ("save_s", "files", "error")}
loads = {}
for W in (2, 3, 4):
    rr = jl("fmt_load%d.jsonl" % W)
    if rr:
        loads[W] = [{"rank": x["rank"], "load_s": x["load_s"], "bytes": x["bytes"], "n_reads": x["n_reads"],
                     "per_file": {f: v["bytes"] for f, v in sorted(x["per_file"].items())}, "reads_per_file": {f: v["reads"] for f, v in sorted(x["per_file"].items())}} for x in rr[0]["ranks"]]
D["loads"] = loads
if loads:
    on_disk = sum(v for k, v in D["dcp"]["files"].items() if k.endswith(".distcp"))
    D["load_amp"] = {str(W): round(sum(x["bytes"] for x in v) / on_disk, 3) for W, v in loads.items()}
    D["dcp_data_bytes"] = on_disk

# ---- prices (the root's Storage lab snapshot, reused) ----
pr = json.load(open(os.path.join(HERE, "..", "..", "..", "src", "io", "inputs", "aws_prices_us_east_1.json")))
D["prices"] = {"source": pr["source"], "s3_standard_gb_month": pr["s3_standard_gb_month"]["first_50TB"], "s3_express_gb_month": pr["s3_express_one_zone_gb_month"],
               "s3_put_per_1000": pr["s3_standard_put_per_1000"], "s3_get_per_1000": pr["s3_standard_get_per_1000"],
               "fsx_persistent125_gb_month": pr["fsx_lustre"]["persistent_ssd_125MBps_per_TiB_gb_month"], "fsx_source": pr["fsx_lustre"]["source"],
               "fsx_MBps_per_TiB": pr["fsx_lustre_perf"]["disk_MBps_per_TiB"], "fsx_metadata": pr["fsx_lustre_metadata"]}

os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump(D, open(os.path.join(HERE, "out", "sd_data.json"), "w"), indent=1, sort_keys=True)
js = "// generated by src/runs/summarise.py from src/runs/out/raw: every measured number on the page\nwindow.SD=" + json.dumps(D, sort_keys=True, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "..", "parts", "22_js_sd_data.js"), "w").write(js)
print("wrote", len(js), "bytes")
