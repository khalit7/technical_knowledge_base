"""Compact the recorded runs in inputs/ into ../parts/33_dst_0data.js (window.DST). Plain Python 3, no torch."""
import json, os, glob
HERE = os.path.dirname(os.path.abspath(__file__))
I = lambda n: json.load(open(os.path.join(HERE, "inputs", n + ".json")))
ms = lambda ns, t0: round((ns - t0) / 1e6, 2)


def curve(mem, n=110):
    pts = mem["curve_ms_bytes"]
    if not pts:
        return []
    step = max(1, len(pts) // n)
    out = []
    for i in range(0, len(pts), step):
        chunk = pts[i:i + step]
        hi = max(chunk, key=lambda p: p[1])
        out.append([hi[0], round(hi[1] / 1e6, 3)])
    return out


def memsum(r):
    st = r["state"]
    return {"params": st["params"], "opt": st["opt_state"], "buckets": st.get("bucket_buffers", 0),
            "peak_delta": r["mem"]["peak_delta"], "fwd_ms": r["mem"]["marks_ms"].get("fwd"), "bwd_ms": r["mem"]["marks_ms"].get("bwd"),
            "curve": curve(r["mem"])}


def ddp(tag):
    d = I(tag)
    order = d["ranks"][0]["param_order"]
    numel = d["ranks"][0]["param_numel"]
    out = {"world": d["env"]["world"], "params": [[n, numel[n]] for n in order], "ranks": []}
    for r in d["ranks"]:
        steps = []
        for s in r["steps"]:
            t0 = s["t"]["fwd0"]
            steps.append({"loss": round(s["loss"], 5),
                          "buckets": [[order.index(p) for p in b["params"]] for b in s["buckets_after"]],
                          "bucket_bytes": [b["bytes"] for b in s["buckets_after"]],
                          "coll": [[c["profiling_name"].split(":")[1], c["in_bytes"], ms(c["time_created_ns"], t0)] for c in s["coll"]],
                          "ready": [[order.index(n), ms(t, t0)] for n, t in s["ready"]],
                          "t": {k: ms(v, t0) for k, v in s["t"].items()}})
        out["ranks"].append({"steps": steps, "mem": memsum(r)})
    out["init"] = [[c["profiling_name"].split(":")[1], c["in_bytes"]] for c in d["ranks"][0]["init_coll"]]
    out["check"] = d["ranks"][0]["check"]
    out["log"] = {k: d["ranks"][0]["ddp_logging"][k] for k in ("bucket_sizes", "rebuilt_bucket_sizes", "bucket_cap_bytes")}
    return out


def label_fsdp(coll, fwd1, root_in):
    """Name each FSDP2 collective by module: forward all-gathers root, b0..; backward root, then blocks descending."""
    nb = sum(1 for c in coll if c[0] == "all_gather" and c[1] != root_in and c[3] <= fwd1)
    fw, bw_ag, bw_rs = 0, None, None
    out = []
    for op, b_in, b_out, t in coll:
        if op == "all_gather":
            if b_in == root_in:
                lab = "root"
            elif t <= fwd1:
                lab = "block %d" % fw; fw += 1
            else:
                bw_ag = nb - 1 if bw_ag is None else bw_ag - 1
                lab = "block %d" % bw_ag
            out.append(["AG", lab, b_in, b_out, t])
        else:
            if b_in == 2 * root_in:
                lab = "root"
            else:
                bw_rs = nb - 1 if bw_rs is None else bw_rs - 1
                lab = "block %d" % bw_rs
            out.append(["RS", lab, b_in, b_out, t])
    return out


def fsdp(tag):
    d = I(tag)
    out = {"world": d["env"]["world"], "ranks": [], "reshard": not d["ranks"][0]["args"]["no_reshard"]}
    for r in d["ranks"]:
        s = r["steps"][-1]
        t0 = s["t"]["fwd0"]
        raw = [[c["profiling_name"].split(":")[1], c["in_bytes"], c["out_bytes"], ms(c["time_created_ns"], t0)] for c in s["coll"]]
        root_in = raw[0][1]
        tm = {k: ms(v, t0) for k, v in s["t"].items()}
        out["ranks"].append({"losses": [round(x["loss"], 5) for x in r["steps"]],
                             "coll": label_fsdp(raw, tm["fwd1"], root_in),
                             "marks": [[m[0], m[1], ms(m[2], t0)] for m in s["marks"]],
                             "t": tm, "mem": memsum(r),
                             "params": [[p["name"], p["global"], p["local"], p["local_bytes"]] for p in r["params"]]})
    out["full_params"] = d["ranks"][0]["state"]["full_params_one_process"]
    return out


def small(tag):
    d = I(tag); r = d["ranks"][0]
    m = memsum(r); m.pop("curve")
    return {"world": d["env"]["world"], "mem": m, "losses": [round(s["loss"], 5) for s in r["steps"]],
            "ncoll": len(r["steps"][-1]["coll"]), "bytes": sum(c["in_bytes"] for c in r["steps"][-1]["coll"])}


DST = {"recorded": "2026-10-12", "env": I("ddp_w2")["env"]}
def last_only(x):
    """Keep only the last recorded step and drop memory curves (used for the bucket and shard views only)."""
    for r in x["ranks"]:
        if "steps" in r:
            r["steps"] = r["steps"][-1:]
        r["mem"].pop("curve", None)
    return x


DST["ddp"] = {"w2": ddp("ddp_w2"), "w2_b1": last_only(ddp("ddp_w2_b1")), "w4": last_only(ddp("ddp_w4"))}
DST["ddp"]["w4"]["ranks"] = DST["ddp"]["w4"]["ranks"][:1]
DST["ddp"]["w2_b1"]["ranks"] = DST["ddp"]["w2_b1"]["ranks"][:1]
f4 = fsdp("fsdp_w4")
DST["fsdp"] = {"w2": fsdp("fsdp_w2"), "w2_nr": fsdp("fsdp_w2_nr"),
               "w4": {"world": 4, "params": [r["params"] for r in f4["ranks"]], "coll": f4["ranks"][0]["coll"], "losses": f4["ranks"][0]["losses"]}}
DST["mem"] = {t: small(t) for t in ["ddp_w2", "ddp_w4", "ddp_w2_view", "fsdp_w2", "fsdp_w2_nr", "fsdp_w4",
                                     "ddp_w2_big", "ddp_w4_big", "fsdp_w2_big", "fsdp_w4_big", "fsdp_w4_big_nr"]}
# DTensor: every pair; local values for every rank (small tensors)
dt = []
for w in (2, 4):
    d = I("dtensor_w%d" % w)
    for mi, m in enumerate(d["ranks"][0]["meshes"]):
        pairs = []
        for k, p in enumerate(m["pairs"]):
            locs = [rr["meshes"][mi]["pairs"][k].get("dst_local") for rr in d["ranks"]]
            slocs = [rr["meshes"][mi]["pairs"][k].get("src_local") for rr in d["ranks"]]
            pairs.append({"s": "".join(x + "," for x in p["src"])[:-1], "d": ",".join(p["dst"]), "ok": p.get("ok"),
                          "err": p.get("error"), "logical": p.get("logical"),
                          "gloo": [[c["op"].split(":")[1], c["in"], c["in_bytes"], c["pg"]] for c in p.get("coll", [])],
                          "shp": [None if l is None else [len(l), len(l[0]) if l and isinstance(l[0], list) else 0] for l in locs]})
        dt.append({"mesh": m["mesh"], "shape": m["shape"], "coords": [rr["meshes"][mi]["coord"] for rr in d["ranks"]], "pairs": pairs})
    if w == 4:
        DST["uneven"] = [rr["uneven"]["local_shape"] for rr in d["ranks"]]
errs = []
for m in dt:
    for p in m["pairs"]:
        if p["err"]:
            if p["err"] not in errs: errs.append(p["err"])
            p["err"] = errs.index(p["err"])
        if p["ok"] is None: p.pop("ok")
        if not p["logical"]: p.pop("logical")
        if not p["gloo"]: p.pop("gloo")
        if p["err"] is None: p.pop("err")
DST["dtensor"] = dt
DST["dtensor_errors"] = errs
t = I("tp_w2"); r = t["ranks"][0]
DST["tp"] = {"loss": round(r["mlp_tp"]["loss"], 6), "ref_loss": round(r["mlp_tp"]["ref_loss"], 6), "grad_diff": r["mlp_tp"]["max_grad_diff"],
             "coll": [[c["profiling_name"].split(":")[1], c["in_bytes"]] for c in r["mlp_tp"]["coll"]], "n_fwd": r["mlp_tp"]["n_fwd"],
             "params": r["mlp_tp"]["params_block0"], "qkv_rows": [rr.get("qkv_tp_local_rows") for rr in t["ranks"]], "qkv": r["qkv_tp"]}
t = I("tp2d_w4")
DST["tp2d"] = [{"coord": rr["fsdp_tp"]["coord"], "loss": round(rr["fsdp_tp"]["loss"], 5), "fc": rr["fsdp_tp"]["fc_weight"],
                "coll": [[c["profiling_name"].split(":")[1], c["in_bytes"], c["pg_id"]] for c in rr["fsdp_tp"]["coll"]]} for rr in t["ranks"]]
pp = {}
for s in ("gpipe", "1f1b"):
    d = I("pp_" + s); rs = []
    for r in d["ranks"]:
        t0 = r["t0"]
        rs.append({"events": [[e[0], ms(e[1], t0)] for e in r["events"]], "p2p": [[p["op"], p["bytes"], p["desc"], ms(p["t"], t0)] for p in r["p2p"]],
                   "peak": r["mem"]["peak_delta"], "losses": [round(x, 5) for x in r["losses"]], "params": r["stage_params"],
                   "tied_before": r["tied_grad_diff_before_allreduce"], "tied_after": r["tied_grad_diff_after_allreduce"], "diff": r["max_grad_diff_untied"]})
    pp[s] = {"ranks": rs, "ref_loss": round(d["ranks"][0]["ref_loss"], 5), "mb": d["ranks"][0]["n_microbatches"]}
DST["pp"] = pp
s = I("dcp_save"); r0 = s["ranks"][0]
DST["dcp"] = {"files": r0["files"], "meta": {k[6:]: [v["size"], [c[0][0] for c in v["chunks"]], [c[1][0] for c in v["chunks"]]]
                                             for k, v in r0["metadata"].items() if "chunks" in v and k.startswith("model.")},
              "n_keys": len(r0["metadata"]), "storage": {f: len(v) for f, v in r0["storage"].items()},
              "save_coll": [[c["profiling_name"].split(":")[1], c["in_bytes"]] for c in r0["coll"]],
              "load": [{"diff": rr["max_param_diff_vs_single_process"], "equal": rr["equal_to_saved"], "local": rr["local_shapes"], "coll": [[c["profiling_name"].split(":")[1], c["in_bytes"]] for c in rr["coll"]]} for rr in I("dcp_load")["ranks"]],
              "single": I("dcp_single")}
hang = {}
for f in sorted(glob.glob(os.path.join(HERE, "inputs", "hang_*.rank*.json"))):
    x = json.load(open(f)); key = x["case"] + "_" + x["debug"].lower()
    hang.setdefault(key, []).append({"rank": x["rank"], "error": x["error"], "seconds": x["seconds"],
                                     "fr": [[e["collective_seq_id"], e["profiling_name"].split(":")[1], e["input_sizes"]] for e in x["fr"]]})
hang["shape_off"] = I("hang_shape_off")
DST["hang"] = hang
# step times (bench lock): repeat 1 ran at load average about 4, repeat 2 while other jobs pushed it to 15 to 40
rows = []
for tag, name in [("plain_w1", "1 process"), ("ddp_w2", "DDP, 2 ranks"), ("ddp_w4", "DDP, 4 ranks"), ("fsdp_w2", "FSDP2, 2 ranks"), ("fsdp_w4", "FSDP2, 4 ranks")]:
    reps = [I("t_%s_r%d" % (tag, k))["ranks"][0] for k in (1, 2)]
    world = I("t_%s_r1" % tag)["env"]["world"]
    med = sorted(reps[0]["trial_medians_ms"])[1]
    rows.append({"name": name, "world": world, "median_ms": round(med, 1), "trials_r1": [round(x, 1) for x in reps[0]["trial_medians_ms"]],
                 "trials_r2": [round(x, 1) for x in reps[1]["trial_medians_ms"]], "load_r1": [round(reps[0]["load_start"], 1), round(reps[0]["load_end"], 1)],
                 "load_r2": [round(reps[1]["load_start"], 1), round(reps[1]["load_end"], 1)], "seq_per_s": round(world * 8 / med * 1000)})
DST["timing"] = {"rows": rows}
js = "window.DST=" + json.dumps(DST, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "..", "parts", "33_dst_0data.js"), "w").write(js)
print("33_dst_0data.js", len(js), "bytes")
