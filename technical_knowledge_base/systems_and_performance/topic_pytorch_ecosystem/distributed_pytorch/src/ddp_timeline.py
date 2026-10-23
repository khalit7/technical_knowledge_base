"""The parent page's recorded DDP run (Distributed lab, src/dist/inputs/ddp_w2.json, 2 CPU processes, gloo,
torch 2.14.1) -> inputs/ddp_buckets.json: for steps 0 and 1 on rank 0, when each parameter's gradient became
ready, which bucket it belongs to, and when each bucket's all-reduce was issued, in ms from the end of forward.
No new run: a reshaping of the lab's recording for the bucket stepper in Reading section 3.
    python3 ddp_timeline.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(H, "..", "..", "src", "dist", "inputs", "ddp_w2.json")
r = json.load(open(src))["ranks"][0]
numel = r["param_numel"]
out = {"source": "topic_pytorch_ecosystem/src/dist/inputs/ddp_w2.json (rank 0 of 2)", "recorded": json.load(open(src)).get("recorded"),
       "bucket_cap_bytes": r["ddp_logging"]["bucket_cap_bytes"], "steps": []}
for st in r["steps"][:2]:
    t0 = st["t"]["fwd1"]                     # end of forward = start of backward
    ms = lambda ns: round((ns - t0) / 1e6, 3)
    lay = st["buckets"] if st["step"] == 0 else st["buckets_after"]       # step 0: the initial layout; from step 1: the rebuilt one
    owner = {p: b["index"] for b in lay for p in b["params"]}
    out["steps"].append({
        "step": st["step"],
        "bwd_end_ms": ms(st["t"]["bwd1"]), "opt_end_ms": ms(st["t"]["opt1"]), "fwd_ms": round((t0 - st["t"]["fwd0"]) / 1e6, 3),
        "buckets": [{"index": b["index"], "bytes": b["bytes"], "n": len(b["params"])} for b in lay],
        "ready": [[p, ms(t), owner[p], numel[p] * 4] for p, t in st["ready"]],
        "allreduce": [[c["in_bytes"], ms(c["time_created_ns"])] for c in st["coll"] if c["profiling_name"].endswith("all_reduce")],
    })
json.dump(out, open(os.path.join(H, "inputs", "ddp_buckets.json"), "w"), indent=1)
for s in out["steps"]:
    print(s["step"], s["buckets"], s["allreduce"], s["bwd_end_ms"], len(s["ready"]), s["ready"][3], s["ready"][-1])
