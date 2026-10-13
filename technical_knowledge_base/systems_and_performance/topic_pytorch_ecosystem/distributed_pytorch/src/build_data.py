"""inputs/*.json -> parts/22_dpt_data.js (window.DPT), compact."""
import json, os
from collections import OrderedDict
H = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(H, "inputs")
J = lambda n: json.load(open(os.path.join(I, n + ".json")))
r6 = lambda v: float("%.6g" % v) if isinstance(v, float) else v
D = OrderedDict()

c = J("c10d"); r0 = c["ranks"][0]
D["c10d"] = {"env": c["ranks"][1]["env_from_torchrun"], "noarg": r0["no_backend_argument"], "config": r0["backend_config"],
             "map": r0["default_device_backend_map"], "avail": r0["available"], "store": r0["store_chain"],
             "store_read": r0["store_read"], "mesh": [x["mesh"] for x in c["ranks"]],
             "coll": [[r0["collectives"]["called"][i], e["op"], e["in"], e["out"]] for i, e in enumerate(r0["collectives"]["recorded"])],
             "a2a": [x["all_to_all_example"] for x in c["ranks"]], "mps": r0["mps_all_reduce"]["error"]}
e = J("elastic"); rp = J("elastic_repeats")
D["elastic"] = {"events": [[x["attempt"], x["rank"], x["event"], x.get("step"), x.get("loss"), x["t_s"]] for x in e["events"]],
                "ref": e["uninterrupted_losses"], "log": e["torchrun_log"], "repeats": [x["finished_attempt"] for x in rp["runs"]],
                "resume_s": [x["seconds_crash_to_resume"] for x in rp["runs"]]}
D["ct"] = {}
for w in (2, 4):
    d = J(f"coll_time_w{w}")
    D["ct"][w] = {"load": [round(x, 2) for x in d["loadavg_end"]], "ops": {k: [[r["bytes"], r6(r["median_s"]), r6(r["min_s"]), r6(r["max_s"])] for r in v] for k, v in d["ops"].items()}}
D["hooks"] = {}
for w in (2, 4):
    d = J(f"hooks_w{w}")
    vs = d["variants"] if "variants" in d else d["ranks"][0]["result"]["variants"]
    out = []
    for i, v in enumerate(vs):
        if v.get("aborted"):
            out.append({"aborted": True, "i": v["variant_index"]}); continue
        o = {"name": v["hook"], "kw": v.get("kwargs")}
        if "error" in v: o["error"] = v["error"]
        o["s"] = [[s["loss"], r6(s["rel_err"]), s["bytes_in"], s["n_coll"]] for s in v.get("steps", [])]
        out.append(o)
    D["hooks"][w] = out
names = ["none (built-in all-reduce)", "allreduce_hook", "fp16_compress_hook", "bf16_compress_hook", "powerSGD rank 1", "powerSGD rank 4", "powerSGD rank 16", "powerSGD rank 4, no error feedback"]
for o in D["hooks"][4]:
    if o.get("aborted"): o["name"] = names[o["i"]]
b = J("batched")["ranks"][0]["result"]["variants"][0]
D["batched"] = {"error": b["error"], "failed_at_step": b["failed_at_step"]}
D["race"] = J("psgd_race")["first_difference"]
ns = J("nosync")["ranks"][0]["result"]
D["nosync"] = {k: (v["coll"] if isinstance(v, dict) else v) for k, v in ns.items()}
un = J("unused")["ranks"][0]["result"]
D["unused"] = {k: {"ok": v["ok"], "error": v.get("error"), "steps": [[s["step"], s["loss"], s["coll"], s["aux_grad_none"]] for s in v["steps"]]} for k, v in un.items()}
D["unused_r1_aux_none"] = {k: [s["aux_grad_none"] for s in v["steps"]] for k, v in J("unused")["ranks"][1]["result"].items()}
jn = J("join")
D["join"] = [{"rank": r["rank"], "with": r["result"]["with_join"], "without": r["result"]["without_join"]} for r in jn["ranks"]]

def agg(coll):
    m = OrderedDict()
    for x in coll:
        k = (x["op"], x["pg"], x.get("dt", "Float"), x["in"])
        m[k] = m.get(k, 0) + 1
    return [[a, b_, c_, d_, n] for (a, b_, c_, d_), n in m.items()]

KEEP = {"tok.weight", "pos.weight", "blocks.0.ln1.weight", "blocks.0.attn.qkv.weight", "blocks.0.attn.q.weight", "blocks.0.mlp.fc.weight", "blocks.0.mlp.fc.bias", "blocks.0.mlp.proj.weight", "ln_f.weight"}
D["mesh"] = {}
for m in ("ddp4", "fsdp4", "hsdp", "raf2", "fsdp_tp"):
    d = J("fsdpm_" + m)
    D["mesh"][m] = {"ranks": [{"groups": r.get("groups"), "coll": agg(r["steps"][1]["coll"]), "peak": r["mem"]["peak_delta"],
                               "start": r["mem"]["start_live"], "state": r["mem"]["state"], "losses": [s["loss"] for s in r["steps"]],
                               "params": [[p["name"], p["global"], p["local"], p["placements"]] for p in r["params"] if p["name"] in KEEP]} for r in d["ranks"]],
                    "pfm": d["ranks"][0].get("post_forward_mesh")}
c3 = J("compose3d")
D["c3"] = [{"coord": r["coord"], "groups": r["groups"], "coll": agg([dict(x, dt="Float") for x in r["coll"]]), "losses": [round(l, 6) for l in r["losses"]],
            "ref": r["ref_loss"], "gd": r["max_grad_diff"], "local": r["local_param_bytes"], "full": r["full_param_bytes"],
            "params": [[p["name"], p["global"], p["local"], p["mesh"], p["placements"]] for p in r["params"] if p["name"] in KEEP or p["name"] == "head.weight"]} for r in c3["ranks"]]
pf = J("fsdpm_prefetch")["ranks"][0]["variants"]
D["prefetch"] = {}
for k, v in pf.items():
    s = v["steps"][2]; t0 = s["t"][0]
    D["prefetch"][k] = {"coll": [[x["op"], x["in"], round((x["t"] - t0) / 1e6, 2)] for x in s["coll"]],
                        "marks": [[m_[0], m_[1], round((m_[2] - t0) / 1e6, 2)] for m_ in s["marks"]],
                        "t": [round((x - t0) / 1e6, 2) for x in s["t"]], "peak": v["mem"]["peak_delta"]}
for m in ("mp", "mp_bf16reduce"):
    r = J("fsdpm_" + m)["ranks"][0]
    D[m] = {"coll": agg(r["steps"][1]["coll"]), "losses": [s["loss"] for s in r["steps"]], "peak": r["mem"]["peak_delta"],
            "state": r["mem"]["state"], "policy": r.get("mp_policy")}
ref = json.load(open(os.path.join(H, "..", "..", "src", "dist", "inputs", "fsdp_w2.json")))["ranks"][0]   # the root lab's float32 FSDP2 run, 2 ranks
D["fsdp2_w2_ref_losses"] = [round(x["loss"], 6) for x in ref["steps"]]
D["fsdp2_w2_ref"] = {"coll": agg([{"op": e["profiling_name"].replace("gloo:", ""), "pg": "world", "dt": e["input_dtypes"][0], "in": e["in_bytes"]} for e in ref["steps"][1]["coll"]]),
                     "losses": D["fsdp2_w2_ref_losses"], "peak": ref["mem"]["peak_delta"]}
D["offload"] = {k: v for k, v in J("fsdpm_offload")["ranks"][0].items() if k in ("ok", "error")}
D["offload"]["losses"] = [s["loss"] for s in J("fsdpm_offload")["ranks"][0]["steps"]]
D["accum"] = J("fsdpm_accum")["ranks"][0]
D["accum"] = {"variants": D["accum"]["variants"], "diff": D["accum"]["max_abs_grad_diff"]}
sd = J("fsdpm_statedict")["ranks"][0]
D["statedict"] = {"sharded": sd["sharded_state_dict"], "full": sd["full_state_dict"]}
f1 = J("fsdpm_fsdp1")["ranks"][0]
D["fsdp1"] = {"ok": f1["ok"], "flat": [[x["name"].replace("_fsdp_wrapped_module.", ""), x["shape"]] for x in f1["flat_params"]],
              "losses": [s["loss"] for s in f1["steps"]], "frozen": f1["frozen_mixed"], "warnings": f1["warnings"],
              "ncoll": len(f1["steps"][1]["coll"])}
dp = J("dtensor_prop")["ranks"][0]
D["dprop"] = {"cases": [[x["op"], x["inputs"], x.get("out"), x.get("comms"), x.get("local_shape"), x.get("ok"), x.get("error")] for x in dp["cases"]],
              "from_local": dp["from_local"], "custom": dp["custom_op"]}
D["tp"] = {}
for m in ("tp", "tp1", "tpsp"):
    r = J("tp_" + m)["ranks"][0]
    D["tp"][m] = {"bounds": r["bounds"], "params": r["params_block0"], "saved": r["steps"][0]["saved_activation_bytes"],
                  "saved_one": r["saved_activation_bytes_one_process"], "fwd": r["steps"][0]["comm_debug_forward"],
                  "total": r["steps"][0]["comm_debug_total"], "coll": agg([dict(x, pg="tp", dt="Float") for x in r["steps"][0]["coll"]]),
                  "losses": [s["loss"] for s in r["steps"]], "ref": [s["ref_loss"] for s in r["steps"]], "gd": max(s["max_grad_diff"] for s in r["steps"])}
D["cp"] = {}
for n in ("cp", "cp_w4"):
    d = J(n)
    D["cp"][n] = [{"public": r["public_api"], "ring": r["ring_cpu_flash"], "a2a": r["ring_alltoall"], "kv": r["kv_bytes_per_rank"]} for r in d["ranks"]]
D["pp"] = {}
for f in sorted(os.listdir(I)):
    if not f.startswith("pps_"): continue
    d = J(f[:-5]); k = f[4:-5]
    D["pp"][k] = [{"stages": r["my_stages"], "acts": [[a[0], a[1], a[2], round(a[3], 3), round(a[4], 3)] for a in r["median"]["acts"]],
                   "step": round(r["median"]["step_ms"], 2), "busy": round(r["median"]["busy_ms"], 2), "bubble": round(r["median"]["bubble"], 4),
                   "steps": [round(x, 1) for x in r["step_ms_all"]], "bubbles": [round(x, 3) for x in r["bubble_all"]],
                   "mem": r["mem_peak_delta"], "gd": r["max_grad_diff_untied"], "tied": r["tied_grad_diff"], "tied_ratio": r.get("tied_grad_ratio_to_reference"),
                   "load": [round(x, 2) for x in r["loadavg"]], "blocks": r["stage_blocks"]} for r in d["ranks"]]
dm = J("dcp_more")["ranks"]
D["dcp"] = {"async": [r["async"] for r in dm], "reshard": dm[0]["reshard_to_hsdp"], "convert": dm[0]["convert"],
            "hf_all": dm[0]["hf all 53 keys"], "hf_drop": dm[0]["hf head.weight dropped"], "root_plain": dm[0]["non_dtensor_params_fsdp4"],
            "samepg": J("dcp_async_samepg")}
D["fr"] = J("fr_trace")
s = "window.DPT=" + json.dumps(D, separators=(",", ":")) + ";\n"
s = s.replace("/Us" + "ers/runner/work/pytorch/pytorch/", "")      # PyTorch's CI build path inside gloo error texts
open(os.path.join(H, "parts", "22_dpt_data.js"), "w").write(s)
print("22_dpt_data.js", len(s), "bytes")
